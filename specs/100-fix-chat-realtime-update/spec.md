# Feature Specification: Sincronismo Automático do Chat (Live Mode)

**Feature Branch**: `100-fix-chat-realtime-update`  
**Created**: 2026-03-14  
**Status**: Draft  
**Input**: User description: "As mensagens chegam normalmente, porém elas não aparecem na hora que chega automaticamente na interface, eu tenho que apertar o f5"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recebimento de Mensagens em Tempo Real (Priority: P1)

Como usuário do chat, quero que as mensagens enviadas pelo WhatsApp apareçam instantaneamente na minha tela sem que eu precise atualizar a página (F5), para que eu possa ter uma conversa fluida com meus clientes.

**Why this priority**: É a funcionalidade central do chat. A falta de sincronismo automático quebra a experiência do usuário e torna o sistema ineficaz para atendimento rápido.

**Independent Test**: Abrir o chat em uma aba e enviar uma mensagem real via WhatsApp para o número conectado. A mensagem deve aparecer no balão de chat e na lista de conversas lateral em menos de 2 segundos sem interação manual.

**Acceptance Scenarios**:

1. **Given** que estou na página de chat com uma conversa aberta, **When** uma nova mensagem de texto é recebida via WhatsApp, **Then** a mensagem deve ser renderizada imediatamente no final da lista de mensagens.
2. **Given** que estou na página de chat, **When** uma nova mensagem de áudio ou imagem é recebida, **Then** a interface deve carregar o novo conteúdo visual/auditivo instantaneamente.
3. **Given** que o painel de conversas lateral está visível, **When** uma mensagem chega de um contato que não é o atual, **Then** a prévia da mensagem e o contador de mensagens não lidas devem atualizar em tempo real.

---

### User Story 2 - Status de Conexão Live (Priority: P2)

Como usuário, quero ver o status correto da conexão do meu WhatsApp (Online/Offline) mudar automaticamente na interface quando o serviço cair ou voltar, para que eu saiba se o sistema está operante.

**Why this priority**: Evita que o usuário tente enviar mensagens enquanto a API está desconectada, informando o estado real do motor de mensageria.

**Independent Test**: Desconectar o WhatsApp manualmente pelo app do celular. O indicador no topo do chat deve mudar de "🟢 Online" para "🔴 Conexão Suspensa" em tempo real.

**Acceptance Scenarios**:

1. **Given** que o WhatsApp está online, **When** a conexão SSE cai ou o WhatsApp desconecta, **Then** o header do chat deve mostrar o status de erro/desconectado imediatamente.

---

### Edge Cases

- **O que acontece quando a conexão de internet do usuário oscila?** O sistema deve tentar reconectar o SSE automaticamente (Exponencial Backoff) e carregar as mensagens perdidas durante o período offline.
- **Como o sistema lida com múltiplas mensagens chegando ao mesmo tempo?** A interface deve processar a fila de eventos de forma ordenada e realizar o scroll automático apenas se o usuário já estiver no final da página.
- **O que acontece se o token JWT expirar durante a sessão?** A conexão SSE deve notificar o frontend para que o usuário seja re-autenticado ou a sessão renovada.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE estabelecer uma conexão SSE (Server-Sent Events) persistente e autenticada ao carregar o Dashboard.
- **FR-002**: O sistema DEVE interceptar eventos de mensagens recebidas (`uazapi_event`) e disparar uma invalidação de cache (React Query) específica para a conversa ativa.
- **FR-003**: O componente de Chat DEVE escutar eventos globais de sincronismo (`app-sync-event`) e forçar uma re-renderização das mensagens.
- **FR-004**: O sistema DEVE garantir que o scroll automático seja acionado sempre que uma nova mensagem entrar na conversa ativa.
- **FR-005**: O sistema DEVE atualizar o status de "WhatsApp Online/Offline" no header do chat via eventos reativos, sem polling.

### Key Entities *(include if feature involves data)*

- **Conversa (Chat)**: Representa o canal de comunicação entre o usuário do sistema e o contato externo (WhatsApp).
- **Mensagem**: Registro individual de conteúdo (texto, mídia) com timestamp e direção (entrada/saída).
- **Evento SSE**: Payload de dados enviado pelo servidor contendo o tipo de atualização (message, status, history).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das mensagens recebidas pelo backend devem ser refletidas na UI em menos de 1.5 segundos.
- **SC-002**: O usuário não deve precisar usar o comando F5 (Refresh) para visualizar novas interações durante uma sessão ativa.
- **SC-003**: O indicador de status de conexão deve ter uma latência de atualização de no máximo 5 segundos após a mudança de estado no servidor.
- **SC-004**: Zero perda de mensagens na interface durante picos de recebimento (ex: 10 mensagens em 2 segundos).
