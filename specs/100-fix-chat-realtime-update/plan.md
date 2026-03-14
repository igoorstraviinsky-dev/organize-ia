# Implementation Plan - Sincronismo Automático do Chat (Live Mode)

Este plano detalha as alterações técnicas necessárias para garantir que a interface do chat web seja atualizada instantaneamente ao receber novas mensagens via SSE, eliminando a necessidade de atualização manual (F5).

## Technical Context

### Localizando o Problema
Atualmente, o servidor já envia eventos SSE (`uazapi_event`) quando recebe mensagens do WhatsApp. No entanto, o frontend no `useChatMessages.ts` (hook `useUazapiLive`) ou no `Dashboard.tsx` pode não estar invalidando o cache do React Query corretamente ou os componentes de chat não estão inscritos nos eventos de forma a forçar uma re-renderização imediata dos dados.

**Componentes Envolvidos:**
- `server/src/lib/sseClient.ts`: Onde o broadcast do evento ocorre.
- `client/src/hooks/useChatMessages.ts`: Onde reside a lógica de `useUazapiLive`.
- `client/src/pages/Dashboard.tsx`: Onde a conexão SSE é inicializada.
- `client/src/components/chat/WhatsAppChat.tsx`: Onde as mensagens são exibidas.

### Stack Tecnológica
- **Backend:** Node.js (Express), SSE (Server-Sent Events).
- **Frontend:** React, Vite, React Query (@tanstack/react-query), Lucide Icons.
- **Real-time:** SSE para eventos de aplicação e Supabase Realtime para mudanças no banco.

## Constitution Check

### Princípios Relevantes
- **VIII. Resilient Real-Time Orchestration (Live Mode):** O plano foca 100% neste princípio, garantindo a integridade e reatividade da conexão SSE.
- **III. Premium Visual Identity:** A atualização instantânea é parte vital da UX premium.

## Design

### Fase 0: Pesquisa e Diagnóstico
- Validar se o evento `uazapi_event` está chegando ao navegador (via aba Network).
- Verificar se o `queryClient.invalidateQueries` está sendo chamado com as chaves corretas (`['chat_messages']`, `['conversations']`).
- Investigar se há conflito entre o Supabase Realtime e o SSE (redundância ou cancelamento).

### Fase 1: Implementação do Sincronismo Reativo
- **Hook `useUazapiLive`**: Otimizar para que, ao receber um evento de "message", ele não apenas invalide o cache, mas possivelmente faça um `setQueryData` preventivo se o payload contiver a mensagem completa.
- **Dashboard SSE**: Garantir que o `useSSE` não seja reinicializado desnecessariamente, o que derrubaria a conexão.
- **WhatsAppChat**: Adicionar um `useEffect` que escute o `window.app-sync-event` diretamente caso a invalidação do React Query demore mais que 500ms.

## Implementation Steps

### Phase 1: Estabilização do Fluxo de Eventos
1. **Frontend**: Ajustar `useChatMessages.ts` para garantir que `queryClient.invalidateQueries({ queryKey: ['chat_messages'] })` seja chamado de forma profunda (incluindo filtros de `conversationId`).
2. **Frontend**: Garantir que o `useSSEStatus` e `useUazapiLive` no `Dashboard.tsx` estejam corretamente posicionados no topo da árvore para evitar desmontagem.
3. **Backend**: No `sseClient.ts`, garantir que o payload do `uazapi_event` inclua o `chat_id` ou `conversation_id` para que o frontend possa filtrar se deve ou não atualizar a tela atual.

### Phase 2: Refinamento de UX (Auto-Scroll e Feedback)
1. **Chat UI**: Implementar lógica de scroll suave (Smooth Scroll) que só aconteça se o usuário estiver próximo do final da lista.
2. **Dashboard**: Adicionar um pequeno indicador visual (ex: um brilho suave no ícone de chat) quando uma mensagem de outra conversa chegar.

## Success Criteria Checklist
- [ ] Mensagens aparecem em < 1s sem F5.
- [ ] Status do WhatsApp atualiza em < 5s.
- [ ] Scroll automático funciona em 100% das novas mensagens recebidas.
- [ ] O console do navegador não mostra erros de "Connection Refused" para o endpoint `/api/events`.
