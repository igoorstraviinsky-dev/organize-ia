# Implementation Plan: SSE Protocol Revamp

## Phase 1: Infrastructure Hardening
- [ ] Fix Nginx configuration to support streaming by disabling buffering.
- [ ] Increase proxy timeouts to prevent premature connection drops.

## Phase 2: Server-Side Protocol Alignment
- [ ] Modify `sseClient.ts` to include requested events: `connection,chats,messages,history`.
- [ ] Update `parseWebhookPayload` in `uazapi.ts` to handle the `history` and `connection` payload structures.
- [ ] Map `connection` event 'open' to 'connected' status in Supabase.

## Phase 3: Frontend Real-time Status & History
- [ ] Refactor `IntegrationsPage.tsx` to handle status changes driven by server-side events.
- [ ] Add a visual indicator for "History Synchronizing" when the `history` event is received.

## Phase 4: Validation
- [ ] Verify Docker logs for successful handshake with all 4 event types.
- [ ] Test message history population upon initial connection.
