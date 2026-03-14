import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useRealtimeSync(onUpdate: () => void) {
  useEffect(() => {
    console.log('[Realtime-Mobile] Inicializando subscrições...');

    const channel = supabase
      .channel('mobile-live-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          console.log('[Realtime-Mobile] Mudança em tarefas:', payload.eventType);
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => {
          console.log('[Realtime-Mobile] Mudança em projetos');
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sections' },
        () => {
          console.log('[Realtime-Mobile] Mudança em seções');
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assignments' },
        () => {
          console.log('[Realtime-Mobile] Mudança em atribuições');
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'labels' },
        () => {
          console.log('[Realtime-Mobile] Mudança em etiquetas');
          onUpdate();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_labels' },
        () => {
          console.log('[Realtime-Mobile] Mudança em relações de etiquetas');
          onUpdate();
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime-Mobile] Status: ${status}`);
      });

    return () => {
      console.log('[Realtime-Mobile] Removendo subscrições');
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}
