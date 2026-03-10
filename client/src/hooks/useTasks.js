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
  task_labels(label_id, labels(id, name, color))
`

export function useTasks(projectId) {
  return useQuery({
    queryKey: ['tasks', projectId ?? 'all'],
    queryFn: async () => {
      // getSession é rápido para verificações locais
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) return []

      let data, error;

      // Se for Inbox, buscar tarefas do projeto Inbox OU tarefas atribuídas ao usuário
      if (projectId) {
        const { data: project } = await supabase
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .single()

        if (project?.name === 'Inbox') {
          // Busca em paralelo: atribuições e tarefas do inbox
          const [{ data: assignedTasks }, { data: inboxTasks, error: inboxError }] = await Promise.all([
            supabase.from('assignments').select('task_id').eq('user_id', userId),
            supabase.from('tasks').select(TASK_SELECT).eq('project_id', projectId).is('parent_id', null)
          ])

          if (inboxError) throw inboxError

          const assignedIds = (assignedTasks || []).map(a => a.task_id).filter(id => !inboxTasks.some(t => t.id === id))
          
          let finalTasks = inboxTasks || []
          
          if (assignedIds.length > 0) {
            const { data: extraTasks } = await supabase
              .from('tasks')
              .select(TASK_SELECT)
              .in('id', assignedIds)
              .is('parent_id', null)
            
            if (extraTasks) finalTasks = [...finalTasks, ...extraTasks]
          }

          const subtasksMap = await fetchSubtasksMap(finalTasks.map((t) => t.id))
          return normalizeTasks(finalTasks, subtasksMap)
        }
      }

      let query = supabase
        .from('tasks')
        .select(TASK_SELECT)
        .is('parent_id', null)
        .order('position', { ascending: true })
        .order('created_at', { ascending: false })

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const result = await query
      data = result.data
      error = result.error

      if (error) {
        console.error('useTasks query error:', error)
        throw error
      }

      const subtasksMap = await fetchSubtasksMap(data.map((t) => t.id))
      return normalizeTasks(data, subtasksMap)
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
