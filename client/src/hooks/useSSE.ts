import { useEffect, useRef, useState } from 'react';
import { buildApiUrl } from '../lib/api';

/**
 * Hook para conexão SSE resiliente com o servidor.
 * Implementa Heartbeat e Reconexão Exponencial.
 */
export function useSSE(token?: string) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(1000); // Começa com 1s

  const connect = () => {
    if (!token) return;

    console.log('[SSE] Estabelecendo conexão...');
    setStatus('connecting');

    // Fechar conexão anterior se existir
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(buildApiUrl(`/api/events?token=${token}`));

    es.onopen = () => {
      console.log('[SSE] ✅ Conectado com sucesso!');
      setStatus('connected');
      reconnectDelayRef.current = 1000; // Reseta delay ao sucesso
    };

    es.onerror = (err) => {
      console.error('[SSE] ❌ Erro na conexão:', err);
      setStatus('error');
      es.close();

      // Reconexão Exponencial (máx 30s)
      const nextDelay = Math.min(reconnectDelayRef.current * 2, 30000);
      reconnectDelayRef.current = nextDelay;
      
      console.log(`[SSE] Retentando em ${nextDelay/1000}s...`);
      reconnectTimeoutRef.current = setTimeout(connect, nextDelay);
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'heartbeat') {
          // Heartbeat recebido, conexão está viva.
          return;
        }
        
        // Disparar evento customizado ou callback para o sistema
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
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [token]);

  return { status };
}
