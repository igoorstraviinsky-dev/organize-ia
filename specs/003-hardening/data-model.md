# Data Model: Hardening Phase

## Hardened Entities

### TenantContext
- **tenant_id**: UUID (Obrigatório)
- **user_id**: UUID (Obrigatório)
- **role**: 'admin' | 'colaborador'

### SSEEvent (Typed)
- **id**: string (UUID)
- **type**: 'PRICE_CHANGE' | 'TASK_SYNC' | 'GEO_LOG'
- **payload**: JSON
- **sent_at**: Timestamp

### AuditLog (Geo-Aware)
- **action**: string
- **latitude**: number (Opcional)
- **longitude**: number (Opcional)
- **accuracy**: number
- **metadata**: JSON (MetalPrice if applicable)
