# Tasks: SSE Protocol Revamp

## Phase 1: Infrastructure
- [x] Task 1.1: Fix Nginx buffering for SSE paths.
- [x] Task 1.2: Ensure Docker Compose networks allow long-lived connections.

## Phase 2: Backend (Server)
- [x] Task 2.1: Update UazAPI query string to include mandatory events.
- [x] Task 2.2: Implement `history` event handler.
- [x] Task 2.3: Implement `connection` event logic.
  - Logic: When `event: connection` state is 'open', update `integrations.status` to 'connected'.

## Phase 3: Frontend (Client)
- [ ] Task 3.1: Add real-time status reactive badge.
  - File: `client/src/components/integrations/IntegrationsPage.tsx`
  - Logic: Ensure the badge updates based on the forwarded `connection` event payload.
- [ ] Task 3.2: Add "Syncing History" loading state for the Chat interface.

## Phase 4: Verification
- [ ] Task 4.1: Perform end-to-end test with a fresh connection.
- [ ] Task 4.2: Verify terminal logs for `Handshake: "connection"` and `Received: "history"`.
