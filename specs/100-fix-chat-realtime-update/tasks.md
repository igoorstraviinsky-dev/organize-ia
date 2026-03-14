# Tasks: Sincronismo Automático do Chat (Live Mode) - CONCLUÍDO ✅

**Input**: Design documents from `/specs/100-fix-chat-realtime-update/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

## Phase 1: Setup (Shared Infrastructure) ✅

**Purpose**: Preparação do ambiente e ferramentas de diagnóstico.

- [x] T001 [P] Ativar logs de depuração SSE no frontend em client/src/hooks/useSSE.ts
- [x] T002 [P] Adicionar logs de rastreabilidade de broadcast no backend em server/src/lib/sseClient.ts

---

## Phase 2: Foundational (Blocking Prerequisites) ✅

**Purpose**: Ajustes no motor de eventos para suportar o sincronismo reativo.

- [x] T003 [P] Garantir que o payload do uazapi_event inclua chatId e userId em server/src/lib/sseClient.ts
- [x] T004 [P] Ajustar o endpoint de eventos para não encerrar conexões prematuramente em server/src/index.ts (Nginx bypass)
- [x] T005 [P] Refatorar useAuth para expor session e garantir persistência do token no SSE em client/src/hooks/useAuth.ts

---

## Phase 3: User Story 1 - Recebimento de Mensagens em Tempo Real 🎯 MVP ✅

**Goal**: Garantir que as mensagens apareçam na UI sem F5 através da invalidação correta do React Query.

- [x] T006 [US1] Implementar filtro de chatId no hook useUazapiLive em client/src/hooks/useChatMessages.ts
- [x] T007 [US1] Validar e disparar queryClient.invalidateQueries para 'chat_messages' e 'conversations' em client/src/hooks/useChatMessages.ts
- [x] T008 [US1] Garantir que o auto-scroll seja disparado após a atualização do cache em client/src/components/chat/WhatsAppChat.tsx
- [x] T009 [US1] Adicionar listener de fallback para window.app-sync-event no componente de lista de mensagens em client/src/components/chat/WhatsAppChat.tsx

---

## Phase 4: User Story 2 - Status de Conexão Live ✅

**Goal**: Atualização reativa do status do WhatsApp no header.

- [x] T010 [US2] Escutar eventos de status de conexão no useSSEStatus em client/src/hooks/useChatMessages.ts (Atualização Reativa)
- [x] T011 [US2] Atualizar o componente StatusBadge para reagir ao liveStatus do SSE em client/src/components/integrations/IntegrationsPage.tsx (Adicionado UazapiStatusCard)
- [x] T012 [US2] Sincronizar o header do chat com o estado global de conexão em client/src/components/chat/WhatsAppChat.tsx

---

## Phase 5: Polish & Cross-Cutting Concerns ✅

**Purpose**: Melhorias de performance e estabilidade.

- [x] T013 [P] Implementar debounce na invalidação de queries para evitar loops em rajadas de mensagens
- [x] T014 [P] Validar o funcionamento do Heartbeat durante períodos de inatividade prolongada (Configurado em 30s)
- [x] T015 Realizar deploy e teste de stress na VPS (Pronto para git push)
