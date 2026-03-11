import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

async function fetchSubtasksMap(taskIds) {
  if (taskIds.length === 0) return {}
  const { data: subtasks } = await supabase
    .from('tasks')
    .select('id, title, status, parent_id')
    .in('parent_id', taskIds)
  const map = {}
  if (subtasks) {
    for (const sub of subtasks) {
      if (!map[sub.parent_id]) map[sub.parent_id] = []
      map[sub.parent_id].push(sub)
    }
  }
  return map
}

export function normalizeTasks(tasks, subtasksMap = {}) {
  return tasks.map((task) => ({
    ...task,
    task_labels: (task.task_labels || []).map((tl) => ({ label: tl.labels || tl.label })),
    subtasks: subtasksMap[task.id] || [],
  }))
}

export const TASK_SELECT = `
  id, title, description, status, priority, due_date, due_time,
  parent_id, section_id, project_id, position, creator_id,
  created_at, updated_at, completed_at,
  project:projects(id, name, color),
  section:sections(id, name),
  assignments(user_id, profiles:profiles(full_name, email, avatar_url)),
  task_labels(label_id, labels(id, name, color)),
  creator:profiles!creator_id(theme_color),
  comments(id)
`

export function useTasks(projectId) {
  return useQuery({
    queryKey: ['tasks', projectId ?? 'all'],
    queryFn: async () => {
      // getSession é rápido para verificações locais
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) return []

      if (!projectId) {
        // Dashboard / Inbox global
        const { data: assignedTasks } = await supabase.from('assignments').select('task_id').eq('user_id', userId)
        const assignedIds = (assignedTasks || []).map(a => a.task_id)

        // 1. Busca todas as tarefas onde o usuário é o criador
        const { data: createdTasks, error: createdError } = await supabase
          .from('tasks')
          .select(TASK_SELECT)
          .is('parent_id', null)
          .eq('creator_id', userId)
          .order('position', { ascending: true })
          .order('created_at', { ascending: false })

        if (createdError) throw createdError

        // 2. Filtra eventuais tarefas que estão em assignedIds MAS que não vieram na primeira query
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
        // Projeto específico
        const { data, error } = await supabase
          .from('tasks')
          .select(TASK_SELECT)
          .is('parent_id', null)
          .eq('project_id', projectId)
          .order('position', { ascending: true })
          .order('created_at', { ascending: false })

        if (error) throw error

        const subtasksMap = await fetchSubtasksMap(data.map((t) => t.id))
        return normalizeTasks(data, subtasksMap)
      }
    },
  })
}

export function useAllTasks() {
  return useQuery({
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
      if (error) {
        console.error('useAllTasks query error:', error)
        throw error
      }

      const subtasksMap = await fetchSubtasksMap(data.map((t) => t.id))
      return normalizeTasks(data, subtasksMap)
    },
    staleTime: 0, // Realtime se encarrega de invalidar, garantindo o Live Mode
  })
}

// Hook dedicado para calcular os KPIs globais do Inbox Dashboard
// Busca TODAS as tarefas pendentes do usuário em todos os projetos
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
        const hasAssignments = t.assignments && t.assignments.length > 0
        const isAssignedToMe = hasAssignments && t.assignments.some(a => a.user_id === userId)
        if (!hasAssignments || isAssignedToMe) {
          volume_atribuido++
          const updatedAt = new Date(t.updated_at || t.created_at).getTime()
          if ((now - updatedAt) / (1000 * 60 * 60) > 48) atencao_critica++
        }
      }

      for (const taskId of assignedTaskIds) {
        if (!myCreated.some(t => t.id === taskId)) volume_atribuido++
      }

      let velocidade_media = '-'
      const completed = completedTasks || []
      if (completed.length > 0) {
        const totalMs = completed.reduce((sum, t) =>
          sum + (new Date(t.completed_at) - new Date(t.created_at)), 0)
        const avgHours = Math.round(totalMs / completed.length / (1000 * 60 * 60))
        velocidade_media = avgHours < 24 ? `${avgHours}h` : `${Math.round(avgHours / 24)}d`
      }

      return { volume_atribuido, atencao_critica, velocidade_media }
    },
    staleTime: 30 * 1000,
  })
}

export function useTasksByLabel(labelId) {
  return useQuery({
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

      const subtasksMap = await fetchSubtasksMap(data.map((t) => t.id))
      return normalizeTasks(data, subtasksMap)
    },
    enabled: !!labelId,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ title, description, priority, due_date, due_time, project_id, section_id, parent_id, label_ids }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const insertData = {
        title,
        description: description || null,
        priority: priority || 4,
        due_date: due_date || null,
        due_time: due_time || null,
        project_id: project_id || null,
        parent_id: parent_id || null,
        creator_id: user.id,
      }

      // Só inclui section_id se tiver valor real
      if (section_id) {
        insertData.section_id = section_id
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('Create task error:', error)
        throw new Error(error.message || 'Erro ao criar tarefa')
      }

      // Atribuir labels se fornecidos
      if (label_ids && label_ids.length > 0) {
        const { error: labelError } = await supabase
          .from('task_labels')
          .insert(label_ids.map((label_id) => ({ task_id: data.id, label_id })))
        if (labelError) console.error('Label assignment error:', labelError)
      }

      return data
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
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) {
        console.error('Update task error:', error)
        throw new Error(error.message || 'Erro ao atualizar tarefa')
      }
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) {
        console.error('Delete task error:', error)
        throw new Error(error.message || 'Erro ao excluir tarefa')
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
