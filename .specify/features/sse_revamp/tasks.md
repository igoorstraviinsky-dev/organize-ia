# Tasks: SSE Protocol Revamp

## Phase 1: Infrastructure
- [x] Task 1.1: Fix Nginx buffering for SSE paths.
- [x] Task 1.2: Ensure Docker Compose networks allow long-lived connections.

## Phase 2: Backend (Server)
- [x] Task 2.1: Update UazAPI query string to include mandatory events.
- [x] Task 2.2: Implement `history` event handler.
- [x] Task 2.3: Implement `connection` event logic.
- [x] Task 2.4: Corrigir mapeamento do campo "message" como indicador de status.
- [x] Task 2.5: Melhorar detecção do dataType no loop principal do SSE.

## Phase 3: Frontend (Client)
- [x] Task 3.1: Add real-time status reactive badge.
- [x] Task 3.2: Add "Syncing History" loading state.
- [x] Task 3.3: Implementar resiliência no polling de status inicial (esperar handshake).

## Phase 4: Verification
- [ ] Task 4.1: Perform end-to-end test with a fresh connection.
- [ ] Task 4.2: Verify terminal logs for `Handshake: "connection"` and `Received: "history"`.
