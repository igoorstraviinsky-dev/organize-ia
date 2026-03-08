import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useRealtimeTasks() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('realtime-all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sections' },
        () => queryClient.invalidateQueries({ queryKey: ['sections'] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'labels' },
        () => queryClient.invalidateQueries({ queryKey: ['labels'] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_labels' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] })
          queryClient.invalidateQueries({ queryKey: ['labels'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_members' },
        () => queryClient.invalidateQueries({ queryKey: ['projects'] })
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}
