# Feature Specification: Agent Integration (n8n + MCP)

## Overview

Implement a dedicated integration area for an Intelligent Agent powered by n8n. This integration will allow the "Organizador" application to be orchestrated by an AI Agent running in n8n, exposing the application's functionality via MCP (Model Context Protocol).

## User Stories

- **As a user**, I want to see a dedicated "Agente Inteligente" section in the Integrations page.
- **As a user**, I want to provide my n8n instance URL and API Key to connect my agent.
- **As a user**, I want to be able to toggle the Agent on/off.
- **As a user**, I want a "Deploy to n8n" button that automatically creates the required workflow in my n8n instance using a single click.
- **As a developer**, I want the Python Agent to be able to route complex requests to the n8n orchestrator.
- **As a developer**, I want a standardized JSON workflow template that can be pushed via API.

## Technical Requirements

### Frontend

- New component `AgentMcpCard` in `IntegrationsPage.jsx`.
- Fields: `n8n_url`, `n8n_api_key`, `mcp_server_url` (optional), `is_active`.
- Premium design following the existing glassmorphism/gradient style.

### Database

- Update `public.integrations` table to include `n8n_mcp` provider.
- Add columns if necessary (or reuse existing fields for simplicity, mapping `n8n_url` to `api_url`, etc.).

### Backend (Python Agent)

- Logic to detect if a message should be handled by n8n.
- Protocol for communicating with n8n (Webhooks or MCP).
- Provide a set of tools (MCP compatible) for n8n to interact with the Supabase DB.

### n8n Workflow

- Orchestrator agent using the "AI Agent" node.
- Tooling to:
  - List/Create/Update/Delete Tasks.
  - List/Create/Update/Delete Projects.
  - Query User Profiles.
- Polished system prompt for the Organizador Agent.

## Design

- Color palette: Indigo/Violet gradients for the Agent section to distinguish it from WhatsApp/Telegram.
- Icon: `Bot` or `Brain` from Lucide.

## Verification

- Connection test button for n8n.
- Successful message processing through n8n.
