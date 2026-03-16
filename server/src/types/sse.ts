/**
 * Contrato de Eventos SSE (Server-Sent Events)
 * Garante que o Client e o Server falem a mesma lingua.
 */

export type SSEEventType =
  | 'heartbeat'
  | 'price_update'
  | 'task_update'
  | 'geo_audit'
  | 'agent_status'
  | 'uazapi_event'
  | 'team_update'

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
    event: string;
    data: any;
  };
}

export interface TeamUpdateEvent extends BaseSSEEvent {
  type: 'team_update';
  payload: {
    userId: string;
    approval_status: 'pending' | 'approved' | 'rejected';
  };
}

export type SSEEvent =
  | HeartbeatEvent
  | PriceUpdateEvent
  | TaskUpdateEvent
  | UazapiSSEEvent
  | TeamUpdateEvent;
