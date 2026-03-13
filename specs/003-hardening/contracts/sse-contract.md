# SSE Interface Contract

## Overview
All real-time communications MUST follow this structure to ensure client-side compatibility.

## Message Format
```typescript
interface SSEMessage<T = any> {
  event: 'metal_price' | 'task_update' | 'system_alert' | 'geo_audit';
  data: T;
  timestamp: string; // ISO 8601
}
```

## Specific Payloads

### Metal Price Update
```typescript
interface MetalPricePayload {
  metal: 'ouro' | 'prata' | 'cobre';
  value: number;
  currency: 'BRL';
  change_percent: number;
}
```

### Geo Audit Event
```typescript
interface GeoAuditEvent {
  user_id: string;
  action: string;
  coords: {
    lat: number;
    lng: number;
  };
}
```
