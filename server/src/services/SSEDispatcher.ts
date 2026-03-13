import { Response } from 'express';
import { SSEEvent, HeartbeatEvent } from '../types/sse.js';

/**
 * Gerenciador central de conexões SSE com Heartbeat.
 */
class SSEDispatcher {
  private clients: Set<Response> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Adiciona um novo cliente à transmissão.
   */
  addClient(res: Response) {
    this.clients.add(res);
    
    // Configura headers SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Envia evento inicial
    this.sendToClient(res, {
      type: 'heartbeat',
      timestamp: new Date().toISOString()
    });

    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  /**
   * Envia um evento para todos os clientes conectados.
   */
  broadcast(event: SSEEvent) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    this.clients.forEach(client => {
      client.write(data);
    });
  }

  /**
   * Envia para um cliente específico.
   */
  private sendToClient(res: Response, event: SSEEvent) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  /**
   * Inicia o loop de heartbeat (Princípio de Resiliência).
   */
  private startHeartbeat() {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      const ping: HeartbeatEvent = {
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      };
      this.broadcast(ping);
    }, 30000); // 30 segundos
  }

  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

export const sseDispatcher = new SSEDispatcher();
