/**
 * Contrato de Eventos SSE (Client-side)
 * Sincronizado com server/src/types/sse.ts
 */

export type SSEEventType = 
  | 'heartbeat'    
  | 'price_update' 
  | 'task_update'  
  | 'geo_audit'    
  | 'agent_status' 

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
