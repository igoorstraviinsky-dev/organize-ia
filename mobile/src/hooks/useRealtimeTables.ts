import { AppState } from 'react-native';
import { useEffect, useEffectEvent } from 'react';
import { supabase } from '../lib/supabase';

let channelCounter = 0;

export function useRealtimeTables(tables: string[], onUpdate: () => void) {
  const handleUpdate = useEffectEvent(onUpdate);

  useEffect(() => {
    const channelId = ++channelCounter;
    const channel = supabase.channel(`mobile-sync:${channelId}:${tables.join(',')}`);

    const triggerRefresh = () => {
      handleUpdate();
    };

    tables.forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        triggerRefresh();
      });
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        triggerRefresh();
      }
    });

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        triggerRefresh();
      }
    });

    const intervalId = setInterval(() => {
      triggerRefresh();
    }, 8000);

    return () => {
      clearInterval(intervalId);
      appStateSubscription.remove();
      supabase.removeChannel(channel);
    };
  }, [handleUpdate, tables]);
}
