# Feature Specification: SSE Protocol Revamp (UazAPI GO V2)

## Context
The current SSE integration with UazAPI GO V2 is partially functional but lacks strict adherence to the protocol requirements, leading to synchronization issues. The backend connects, but the frontend status and chat history are not properly populated in real-time.

## Requirements (UazAPI GO V2)
1. **Granular Event Selection**: URL must include `?token=${TOKEN}&events=connection,chats,messages,history`.
2. **Event Types**:
    - `connection`: Used for the 'Online'/'Offline' status.
    - `chats`: Updates to chat metadata.
    - `messages`: New incoming/outgoing messages.
    - `history`: Bulk sync of past messages upon connection.
3. **Infrastructure**: Nginx and Docker must support long-lived, unbuffered connections.

## Identified Gaps (Analise)
- **Backend Query String**: Currently missing `connection` and `history` events in the UazAPI SSE request.
- **Frontend Real-time**: The UI relies on polling `/sse/logs`, which is high-latency and prone to missed events. It should move to a stream-based or more aggressive sync.
- **Nginx Buffering**: Default Nginx configuration buffers responses, which can delay or block SSE streams entirely.
- **History Processing**: The current parser doesn't handle `history` events, meaning the chat is empty until a *new* message arrives.

## Proposed Solution
1. **Server-Side Updates**:
    - Update `sseClient.ts` to request all events.
    - Add specific handlers for `connection` (to update DB status) and `history` (to sync legacy messages).
2. **Infrastructure Updates**:
    - Disable Nginx proxy buffering for `/api` routes.
3. **Frontend Updates**:
    - Implement a robust status handler that reacts to the `connection` event forwarded from the server.
    - Ensure `IntegrationsPage` reflects real-time SSE health.

## Accepted Events Protocol (to be implemented)
- `event: connection` -> Update `integrations` table `status`.
- `event: history` -> Bulk insert into `chat_messages`.
- `event: messages` -> Existing logic.
