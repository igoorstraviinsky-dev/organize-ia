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

export type SSEEvent = 
  | HeartbeatEvent 
  | PriceUpdateEvent 
  | TaskUpdateEvent;
