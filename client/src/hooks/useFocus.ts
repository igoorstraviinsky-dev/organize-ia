import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface FocusSession {
  id: string
  user_id: string
  task_id: string | null
  status: 'active' | 'completed' | 'interrupted' | string
  start_time: string
  end_time: string | null
  duration_seconds: number | null
  tasks?: { title: string } | null
}

export function useFocus() {
  const queryClient = useQueryClient()

  const { data: activeSession, isLoading } = useQuery<FocusSession | null>({
    queryKey: ['active_focus_session'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*, tasks(title)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()
      
      if (error) throw error
      return data as FocusSession | null
    }
  })

  const startFocus = useMutation({
    mutationFn: async ({ task_id }: { task_id: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not found')

      // Interrompe sessões anteriores
      await supabase
        .from('focus_sessions')
        .update({ status: 'interrupted', end_time: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('status', 'active')

      const { data, error } = await supabase
        .from('focus_sessions')
        .insert({ user_id: user.id, task_id, status: 'active' })
        .select()
        .single()
      
      if (error) throw error
      return data as FocusSession
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['active_focus_session'] })
  })

  const endFocus = useMutation({
    mutationFn: async ({ status }: { status: 'completed' | 'interrupted' }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: session } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()
      
      if (!session) return

      const endTime = new Date()
      const durationSeconds = Math.floor((endTime.getTime() - new Date(session.start_time).getTime()) / 1000)

      const { error } = await supabase
        .from('focus_sessions')
        .update({ 
          status, 
          end_time: endTime.toISOString(),
          duration_seconds: durationSeconds
        })
        .eq('id', session.id)
      
      if (error) throw error

      // Atualiza tempo na tarefa se concluída
      if (session.task_id && status === 'completed') {
        const { data: task } = await supabase.from('tasks').select('total_focus_seconds').eq('id', session.task_id).single()
        await supabase
          .from('tasks')
          .update({ total_focus_seconds: (task?.total_focus_seconds || 0) + durationSeconds })
          .eq('id', session.task_id)

        queryClient.invalidateQueries({ queryKey: ['tasks'] })
      }

      return { durationSeconds }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['active_focus_session'] })
  })

  return { activeSession, isLoading, startFocus, endFocus }
}
