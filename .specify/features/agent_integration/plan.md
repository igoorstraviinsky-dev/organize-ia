# Implementation Plan: Agent Integration (n8n + MCP)

## Phase 1: Database Setup

- Add `agent_n8n` to the `provider` check constraint in `public.integrations`.
- Ensure columns `api_url` and `api_token` are used for n8n URL and API Key.
- Add `is_active` boolean if not present (or use `status`).

## Phase 2: Frontend Implementation

- **Component**: Create `AgentMcpCard` in `IntegrationsPage.jsx`.
- **UI Details**:
  - Gradient: `from-violet-500 to-indigo-600`.
  - Icon: `Bot`.
  - Form fields for n8n URL and API Key.
  - Status badge integration.

## Phase 3: n8n Workflow Creation

- Design a JSON workflow for n8n.
- Include an API endpoint in n8n to receive messages.
- Add "AI Agent" node with tools for Supabase.
- Craft the "Organizador Orchestrator" system prompt.

## Phase 4: Backend Integration (Python Agent)

- Update `main.py` and `whatsapp.py` to support routing to n8n when the provider is active.
- Implement a basic MCP-like toolset for n8n to call.

## Phase 5: Verification

- Manual test of the n8n agent via WhatsApp.
- Verify DB persistence.
