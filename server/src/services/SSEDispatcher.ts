import { Response } from 'express';
import { HeartbeatEvent, SSEEvent } from '../types/sse.js';

/**
 * Gerenciador central de conexoes SSE com heartbeat de conexao e ping keep-alive.
 */
class SSEDispatcher {
  private clients: Map<Response, ReturnType<typeof setInterval>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Adiciona um novo cliente a transmissao SSE.
   */
  addClient(res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const pingInterval = setInterval(() => {
      if (res.writableEnded || res.destroyed) {
        this.removeClient(res);
        return;
      }

      res.write(': ping\n\n');
    }, 15000);

    this.clients.set(res, pingInterval);
    res.write(': connected\n\n');

    this.sendToClient(res, {
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
    });

    res.on('close', () => {
      this.removeClient(res);
    });
  }

  /**
   * Envia um evento para todos os clientes conectados.
   */
  broadcast(event: SSEEvent) {
    const data = `data: ${JSON.stringify(event)}\n\n`;

    this.clients.forEach((_pingInterval, client) => {
      if (client.writableEnded || client.destroyed) {
        this.removeClient(client);
        return;
      }

      client.write(data);
    });
  }

  /**
   * Envia um evento para um cliente especifico.
   */
  private sendToClient(res: Response, event: SSEEvent) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  private removeClient(res: Response) {
    const pingInterval = this.clients.get(res);

    if (pingInterval) {
      clearInterval(pingInterval);
    }

    this.clients.delete(res);
  }

  /**
   * Inicia o loop de heartbeat de aplicacao.
   */
  private startHeartbeat() {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      const ping: HeartbeatEvent = {
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
      };

      this.broadcast(ping);
    }, 30000);
  }

  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.clients.forEach((pingInterval, client) => {
      clearInterval(pingInterval);
      client.end();
    });

    this.clients.clear();
  }
}

export const sseDispatcher = new SSEDispatcher();
