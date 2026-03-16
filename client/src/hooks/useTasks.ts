import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { triggerAchievementToast } from '../components/gamification/AchievementToast'

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  due_date: string | null;
  due_time: string | null;
  parent_id: string | null;
  section_id: string | null;
  project_id: string | null;
  position: number;
  creator_id: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  project?: { id: string; name: string; color: string } | null;
  section?: { id: string; name: string } | null;
  assignments?: Array<{ 
    user_id: string; 
    profiles: { full_name: string; email: string; avatar_url: string | null } 
  }>;
  task_labels?: any[]; // Simplified for now
  subtasks?: Array<{ id: string; title: string; status: string }>;
}

async function fetchSubtasksMap(taskIds: string[]) {
  if (taskIds.length === 0) return {}
  const { data: subtasks } = await supabase
    .from('tasks')
    .select('id, title, status, parent_id')
    .in('parent_id', taskIds)
  
  const map: Record<string, any[]> = {}
  if (subtasks) {
    for (const sub of subtasks) {
      if (!map[sub.parent_id]) map[sub.parent_id] = []
      map[sub.parent_id].push(sub)
    }
  }
  return map
}

export function normalizeTasks(tasks: any[], subtasksMap: Record<string, any[]> = {}) {
  return tasks.map((task) => ({
    ...task,
    task_labels: (task.task_labels || []).map((tl: any) => tl.labels || tl.label || tl),
    subtasks: subtasksMap[task.id] || [],
  })) as Task[]
}

export const TASK_SELECT = `
  id, title, description, status, priority, due_date, due_time,
  parent_id, section_id, project_id, position, creator_id,
  created_at, updated_at, completed_at,
  project:projects(id, name, color),
  section:sections(id, name),
  assignments(user_id, profiles:profiles(full_name, email, avatar_url)),
  task_labels(label_id, labels(id, name, color)),
  creator:profiles!creator_id(theme_color)
`

export function useTasks(projectId: string | null) {
  return useQuery<Task[]>({
    queryKey: ['tasks', projectId ?? 'all'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) return []

      if (!projectId) {
        const { data: assignedTasks } = await supabase.from('assignments').select('task_id').eq('user_id', userId)
        const assignedIds = (assignedTasks || []).map(a => a.task_id)

        const { data: createdTasks, error: createdError } = await supabase
          .from('tasks')
          .select(TASK_SELECT)
          .is('parent_id', null)
          .eq('creator_id', userId)
          .order('position', { ascending: true })
          .order('created_at', { ascending: false })

        if (createdError) throw createdError

        const foreignAssignedIds = assignedIds.filter(id => !(createdTasks || []).some(t => t.id === id))
        
        let finalTasks = createdTasks || []

        if (foreignAssignedIds.length > 0) {
          const { data: extraTasks, error: extraError } = await supabase
            .from('tasks')
            .select(TASK_SELECT)
            .is('parent_id', null)
            .in('id', foreignAssignedIds)
            
          if (extraError) throw extraError
          if (extraTasks) finalTasks = [...finalTasks, ...extraTasks]
        }

        const subtasksMap = await fetchSubtasksMap(finalTasks.map((t) => t.id))
        return normalizeTasks(finalTasks, subtasksMap)
      } else {
        const { data, error } = await supabase
          .from('tasks')
          .select(TASK_SELECT)
          .is('parent_id', null)
          .eq('project_id', projectId)
          .order('position', { ascending: true })
          .order('created_at', { ascending: false })

        if (error) throw error

        const subtasksMap = await fetchSubtasksMap(data.map((t: any) => t.id))
        return normalizeTasks(data, subtasksMap)
      }
    },
  })
}

export function useAllTasks() {
  return useQuery<Task[]>({
    queryKey: ['tasks', 'all-upcoming'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return []

      const { data, error } = await supabase
        .from('tasks')
        .select(TASK_SELECT)
        .is('parent_id', null)
        .neq('status', 'completed')
        .order('due_date', { ascending: true, nullsFirst: false })
      if (error) throw error

      const subtasksMap = await fetchSubtasksMap(data.map((t: any) => t.id))
      return normalizeTasks(data, subtasksMap)
    },
    staleTime: 0,
  })
}

export function useGlobalKPIs() {
  return useQuery({
    queryKey: ['global-kpis'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) return { volume_atribuido: 0, atencao_critica: 0, velocidade_media: '-' }

      const [
        { data: createdTasks },
        { data: assignedEntries },
        { data: completedTasks }
      ] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, updated_at, created_at, assignments(user_id)')
          .eq('creator_id', userId)
          .neq('status', 'completed')
          .is('parent_id', null),
        supabase
          .from('assignments')
          .select('task_id')
          .eq('user_id', userId),
        supabase
          .from('tasks')
          .select('id, created_at, completed_at')
          .eq('creator_id', userId)
          .eq('status', 'completed')
          .not('completed_at', 'is', null)
          .limit(50)
      ])

      const assignedTaskIds = new Set((assignedEntries || []).map(a => a.task_id))
      const myCreated = createdTasks || []

      let volume_atribuido = 0
      let atencao_critica = 0
      const now = Date.now()

      for (const t of myCreated) {
        const hasAssignments = t.assignments && (t.assignments as any).length > 0
        const isAssignedToMe = hasAssignments && (t.assignments as any).some((a: any) => a.user_id === userId)
        if (!hasAssignments || isAssignedToMe) {
          volume_atribuido++
          const updatedAt = new Date(t.updated_at || t.created_at).getTime()
          if ((now - updatedAt) / (1000 * 60 * 60) > 48) atencao_critica++
        }
      }

      for (const taskId of Array.from(assignedTaskIds)) {
        if (!myCreated.some(t => t.id === taskId)) volume_atribuido++
      }

      let velocidade_media = '-'
      const completed = completedTasks || []
      if (completed.length > 0) {
        const totalMs = completed.reduce((sum, t) => {
          if (!t.completed_at || !t.created_at) return sum
          return sum + (new Date(t.completed_at).getTime() - new Date(t.created_at).getTime())
        }, 0)
        const avgHours = Math.round(totalMs / completed.length / (1000 * 60 * 60))
        velocidade_media = avgHours < 24 ? `${avgHours}h` : `${Math.round(avgHours / 24)}d`
      }

      return { volume_atribuido, atencao_critica, velocidade_media }
    },
    staleTime: 30 * 1000,
  })
}

export function useTasksByLabel(labelId: string) {
  return useQuery<Task[]>({
    queryKey: ['tasks', 'label', labelId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return []

      const { data: tls, error: tlError } = await supabase
        .from('task_labels')
        .select('task_id')
        .eq('label_id', labelId)
      if (tlError) throw tlError
      if (!tls || tls.length === 0) return []

      const { data, error } = await supabase
        .from('tasks')
        .select(TASK_SELECT)
        .in('id', tls.map((t) => t.task_id))
        .is('parent_id', null)
        .order('created_at', { ascending: false })
      if (error) throw error

      const subtasksMap = await fetchSubtasksMap(data.map((t: any) => t.id))
      return normalizeTasks(data, subtasksMap)
    },
    enabled: !!labelId,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ title, description, priority, due_date, due_time, project_id, section_id, parent_id, label_ids }: any) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const insertData: any = {
        title,
        description: description || null,
        priority: priority || 4,
        due_date: due_date || null,
        due_time: due_time || null,
        project_id: project_id || null,
        parent_id: parent_id || null,
        creator_id: user.id,
      }

      if (section_id) {
        insertData.section_id = section_id
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert(insertData)
        .select()
        .single()

      if (error) throw new Error(error.message)

      if (label_ids && label_ids.length > 0) {
        await supabase
          .from('task_labels')
          .insert(label_ids.map((label_id: string) => ({ task_id: data.id, label_id })))
      }

      return data as Task
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['labels'] })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data: oldTask } = await supabase
        .from('tasks')
        .select('status, title')
        .eq('id', id)
        .single()

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)

      if (updates.status === 'completed' && oldTask?.status !== 'completed') {
        triggerAchievementToast({
          title: 'Tarefa Concluída!',
          message: `Você finalizou "${data.title}"`,
          xp: 50,
          type: 'achievement'
        })
      }

      return data as Task
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['user_xp'] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['user_xp'] })
    },
  })
}
