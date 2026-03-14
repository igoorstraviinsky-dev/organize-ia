/**
 * Contrato de Eventos SSE (Server-Sent Events)
 * Garante que o Client e o Server falem a mesma língua.
 */

export type SSEEventType = 
  | 'heartbeat'    // Manutenção de conexão
  | 'price_update' // Atualização de metais
  | 'task_update'  // Mudança em tarefas
  | 'geo_audit'    // Novo log de auditoria
  | 'agent_status' // Status do agente IA
  | 'uazapi_event' // Eventos vindos da UazAPI (Live Mode)

export interface BaseSSEEvent {
  type: SSEEventType;
  timestamp: string;
}

export interface HeartbeatEvent extends BaseSSEEvent {
  type: 'heartbeat';
}

export interface PriceUpdateEvent extends BaseSSEEvent {
  type: 'price_update';
  payload: {
    metal: string;
    newPrice: number;
    currency: string;
  };
}

export interface TaskUpdateEvent extends BaseSSEEvent {
  type: 'task_update';
  payload: {
    taskId: string;
    status: string;
    updatedBy: string;
  };
}

export interface UazapiSSEEvent extends BaseSSEEvent {
  type: 'uazapi_event';
  payload: {
    integrationId: string;
    userId?: string;
    chatId?: string;
    event: string; // connection, messages, chats, history
    data: any;
  };
}

export type SSEEvent = 
  | HeartbeatEvent 
  | PriceUpdateEvent 
  | TaskUpdateEvent
  | UazapiSSEEvent;
