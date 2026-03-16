import { useEffect, useRef, useState } from 'react';
import { buildEventSourceUrl } from '../lib/api';

/**
 * Hook para conexao SSE resiliente com o servidor.
 */
export function useSSE(token?: string) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = () => {
    if (!token) return;

    console.log('[SSE] Estabelecendo conexao...');
    setStatus('connecting');

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(buildEventSourceUrl('/api/events', { token }));

    es.onopen = () => {
      console.log('[SSE] Conectado com sucesso.');
      setStatus('connected');
    };

    es.onerror = (err) => {
      console.error('[SSE] Erro na conexao:', err);
      setStatus('error');
      es.close();

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      console.log('[SSE] Retentando em 5s...');
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'heartbeat') {
          return;
        }

        window.dispatchEvent(new CustomEvent('app-sync-event', { detail: data }));
      } catch (err) {
        console.error('[SSE] Falha ao processar payload:', err);
      }
    };

    eventSourceRef.current = es;
  };

  useEffect(() => {
    connect();

    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [token]);

  return { status };
}
