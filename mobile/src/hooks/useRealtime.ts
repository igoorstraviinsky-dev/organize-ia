import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useRealtime(
  table: string, 
  onUpdate: () => void, 
  filter?: string
) {
  useEffect(() => {
    const channel = supabase
      .channel(`db-changes-${table}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filter
        },
        () => {
          console.log(`Realtime update on ${table}`);
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, onUpdate, filter]);
}
