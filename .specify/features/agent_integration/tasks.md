# Tasks: Agent Integration (n8n + MCP)

## Phase 1: Preparation [P]

- [x] T1: Create migration to update `integrations` table providers.
- [x] T2: Prepare n8n Workflow JSON template.

## Phase 2: Frontend Implementation

- [x] T3: Implement `AgentMcpCard` component in `IntegrationsPage.jsx`.
- [x] T4: Update `IntegrationsPage` to render the new card.

## Phase 3: Backend Logic

- [x] T5: Update `agent/supabase_client.py` to handle `agent_n8n` provider.
- [x] T6: Update `agent/main.py` Webhook logic to support n8n orchestration.
- [x] T7: Create a basic MCP endpoint/toolset for n8n to call the app.

## Phase 4: Polish & Documentation

- [x] T8: Update `atualizacao.md` with the new feature.
- [x] T9: Provide instructions to the user on how to import the n8n workflow.
