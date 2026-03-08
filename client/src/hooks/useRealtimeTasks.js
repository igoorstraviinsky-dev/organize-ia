import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useRealtimeTasks() {
  const queryClient = useQueryClient()

  useEffect(() => {
    console.log('[Realtime] Inicializando canais de sincronização...')

    const channel = supabase
      .channel('realtime-dashboard-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          console.log('[Realtime] Mudança detectada em tarefas:', payload.eventType)
          // Simplificação: qualquer mudança (INSERT, UPDATE, DELETE) limpa o cache e força o reload
          queryClient.invalidateQueries({ queryKey: ['tasks'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sections' },
        () => {
          console.log('[Realtime] Mudança detectada em seções')
          queryClient.invalidateQueries({ queryKey: ['sections'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'labels' },
        () => {
          console.log('[Realtime] Mudança detectada em etiquetas')
          queryClient.invalidateQueries({ queryKey: ['labels'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_labels' },
        () => {
          console.log('[Realtime] Mudança detectada em relações de etiquetas')
          queryClient.invalidateQueries({ queryKey: ['tasks'] })
          queryClient.invalidateQueries({ queryKey: ['labels'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => {
          console.log('[Realtime] Mudança detectada em projetos')
          queryClient.invalidateQueries({ queryKey: ['projects'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assignments' },
        () => {
          console.log('[Realtime] Mudança detectada em atribuições')
          queryClient.invalidateQueries({ queryKey: ['tasks'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_members' },
        () => {
          console.log('[Realtime] Mudança detectada em membros do projeto')
          queryClient.invalidateQueries({ queryKey: ['projects'] })
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Status da conexão: ${status}`)
      })

    return () => {
      console.log('[Realtime] Removendo canais de sincronização')
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}
