import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { TASK_SELECT, normalizeTasks } from './useTasks'

export function useRealtimeTasks() {
  const queryClient = useQueryClient()

  useEffect(() => {
    console.log('[Realtime] Inicializando canais de sincronização...')

    const channel = supabase
      .channel('realtime-dashboard-sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tasks' },
        async (payload) => {
          console.log('[Realtime] Nova tarefa detectada:', payload.new.id)
          
          // Busca os dados completos para manter a consistência da UI (joins, etc)
          const { data: rawTask } = await supabase
            .from('tasks')
            .select(TASK_SELECT)
            .eq('id', payload.new.id)
            .single()

          if (rawTask) {
            const fullTask = normalizeTasks([rawTask])[0]
            
            // Atualiza os caches apropriados manualmente (sem F5)
            queryClient.setQueriesData({ queryKey: ['tasks'] }, (oldData, query) => {
              const qProjectId = query.queryKey[1]
              // Verifica se a tarefa pertence a esta visualização específica
              const belongs = qProjectId === 'all' || qProjectId === 'all-upcoming' || qProjectId === fullTask.project_id
              
              if (belongs) {
                const tasks = Array.isArray(oldData) ? oldData : []
                if (tasks.some(t => t.id === fullTask.id)) return tasks
                return [fullTask, ...tasks] // Adiciona ao topo conforme solicitado pelo usuário
              }
              return oldData
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks' },
        async (payload) => {
           console.log('[Realtime] Tarefa atualizada:', payload.new.id)
           const { data: rawTask } = await supabase
            .from('tasks')
            .select(TASK_SELECT)
            .eq('id', payload.new.id)
            .single()
          
          if (rawTask) {
            const fullTask = normalizeTasks([rawTask])[0]
            queryClient.setQueriesData({ queryKey: ['tasks'] }, (oldData) => {
              if (!Array.isArray(oldData)) return oldData
              return oldData.map(t => t.id === fullTask.id ? fullTask : t)
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'tasks' },
        (payload) => {
          console.log('[Realtime] Tarefa removida:', payload.old.id)
          queryClient.setQueriesData({ queryKey: ['tasks'] }, (oldData) => {
            if (!Array.isArray(oldData)) return oldData
            return oldData.filter(t => t.id !== payload.old.id)
          })
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
