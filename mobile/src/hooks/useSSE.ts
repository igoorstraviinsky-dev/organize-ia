import { useEffect, useState } from 'react';
import EventSource from 'react-native-sse';

const SERVER_URL = 'https://organize.straviinsky.online';

export function useSSE(integrationId: string | null) {
  const [status, setStatus] = useState<'connecting' | 'online' | 'offline'>('offline');
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!integrationId) return;

    setStatus('connecting');
    const es = new EventSource(`${SERVER_URL}/api/uazapi/sse/start?integrationId=${integrationId}`);

    es.addEventListener('message', (event: any) => {
      const data = JSON.parse(event.data);
      if (data.type === 'connection' && data.message === 'Connection established') {
        setStatus('online');
      }
      setMessages((prev: any[]) => [data, ...prev]);
    });

    es.addEventListener('error', () => {
      setStatus('offline');
    });

    return () => {
      es.close();
    };
  }, [integrationId]);

  return { status, messages };
}
