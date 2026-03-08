# Atualizações Realizadas

## 1. Drag and Drop no Kanban

### Problema

O board Kanban não permitia arrastar cards entre colunas.

### Solução

- Instalado `@dnd-kit/core`, `@dnd-kit/sortable` e `@dnd-kit/utilities`
- Reescrito `KanbanBoard.jsx` com `DndContext`, `SortableContext` e `DragOverlay`
- Cada coluna registrada como área droppable via `useDroppable` com prefixo `col::` nos IDs
- Algoritmo de colisão `rectIntersection` para detecção precisa de colunas
- Ao soltar um card em outra coluna, atualiza `status` (modo status) ou `section_id` (modo seções) no Supabase
- Placeholder visual (borda tracejada indigo) aparece na posição original durante o arrasto
- Overlay do card com rotação e sombra elevada enquanto é arrastado
- Highlight visual na coluna destino durante o hover

### Arquivos modificados

- `client/src/components/tasks/KanbanBoard.jsx` — reescrito completo

---

## 2. Visual Premium do Card Kanban

### Melhorias

- Cards com bordas arredondadas (`rounded-xl`), sombras suaves e borda lateral colorida por prioridade
- Drag handle (ícone grip) aparece no hover
- Checkbox com ícones `CheckCircle2`/`Circle` do Lucide
- Badges de prioridade com fundo colorido (ex: `bg-red-100 text-red-700`)
- Badges de data contextuais (vermelho para atrasada, verde para hoje, âmbar para amanhã)
- Labels com sombra colorida
- Transições suaves e efeitos de hover

### Arquivos modificados

- `client/src/components/tasks/KanbanCard.jsx` — reescrito completo

---

## 3. Subtarefas Visíveis nos Cards (Kanban + Lista)

### Problema

Subtarefas só apareciam como contagem (ex: "2/5"). O usuário queria ver todas listadas no card.

### Solução

- Barra de progresso visual mostrando porcentagem de subtarefas concluídas
- Lista completa de subtarefas diretamente no card
- Toggle direto — clicar numa subtarefa alterna entre concluída/pendente sem abrir o modal
- Subtarefas concluídas ficam riscadas e em cinza, pendentes em cinza escuro

### Arquivos modificados

- `client/src/components/tasks/KanbanCard.jsx` — adicionada lista de subtarefas
- `client/src/components/tasks/TaskItem.jsx` — adicionada lista de subtarefas

---

## Bug Corrigido: Card não fixava ao arrastar

### Problema

Ao arrastar um card para outra coluna no Kanban, ele voltava para a posição original.

### Causa

O componente `DroppableColumn` era um div normal — não usava `useDroppable` do @dnd-kit. As colunas não eram reconhecidas como alvos de drop, então `over` era `null` ao soltar.

### Correção

- Adicionado `useDroppable` em cada coluna
- Criada função `resolveTargetColumn()` que identifica a coluna destino (seja por drop sobre card ou sobre coluna vazia)
- Mapa `taskColumnMap` pré-computado com `useMemo` para performance
- Trocado `closestCorners` por `rectIntersection` para detecção precisa

---

---

## 4. Integração Dinâmica UazAPI (WhatsApp)

### Problema

A integração do WhatsApp (UazAPI) estava com o webhook quebrado e usava credenciais fixas no arquivo `.env`, impedindo que múltiplos usuários configurassem suas próprias instâncias.

### Solução

- **Configuração via DB**: O Agente Python agora busca `api_url` e `api_token` diretamente na tabela `integrations` do Supabase usando o `instance_name` enviado pelo webhook.
- **Frontend Corrigido**: Botão "Testar Conexão" no painel de Integrações atualizado para usar o endpoint `/instance/status` e o header `token` conforme documentação oficial.
- **Agente Robusto**:
  - Removidos emojis dos logs do console para evitar erro `UnicodeEncodeError` no Windows.
  - Funções `send_message` e `send_typing` agora aceitam parâmetros dinâmicos de URL/Token.
  - Substituída a `SUPABASE_SERVICE_KEY` pela chave `service_role` real no Agente para permitir leitura de dados ignorando as políticas de RLS.
- **Endpoint Webhook**: Adicionado log detalhado do corpo recebido (`body`) para facilitar o debug de payloads do UazAPI.

### Arquivos modificados

- `client/src/components/integrations/IntegrationsPage.jsx` — correção do teste de conexão.
- `agent/main.py` — lógica de busca de config e tratamento de erros Unicode.
- `agent/whatsapp.py` — suporte a parâmetros dinâmicos.
- `agent/supabase_client.py` — nova função `get_integration_by_instance`.
- `agent/.env` — atualização da Service Key.

---

## 5. Tabela de Integrações no Supabase

### Melhoria

Criada infraestrutura para armazenar configurações de múltiplos provedores de mensagens de forma segura e organizada.

### Detalhes

- Tabela `public.integrations` com suporte a `uazapi` e `whatsapp_cloud`.
- Campos para `instance_name`, `api_url`, `api_token` e status da conexão.
- Políticas de RLS configuradas para garantir que usuários vejam apenas suas próprias configurações.
- Trigger de `updated_at` automatizado.

### Arquivos criados

- `database/integrations.sql` — migração do banco de dados.

---

---

## 6. Agente Inteligente Orchestrador (n8n + MCP)

### Melhoria

Implementada a capacidade de delegar a inteligência do Organizador para um orquestrador externo (n8n), permitindo fluxos complexos e automações avançadas via MCP.

### Solução

- **UI de Agente**: Novo card premium na página de Integrações com gradiente violeta e ícone de robô.
- **Roteamento Híbrido**: O Agente Python agora detecta se o usuário tem um orquestrador n8n configurado. Se tiver, a mensagem é enviada para o n8n; se falhar ou não existir, o agente local assume.
- **API de Ferramentas (MCP-like)**: Criado endpoint `/agent/tools` no Agente Python, permitindo que o n8n execute ações (list, create, update, delete) no Organizador de forma segura.
- **Orquestrador n8n**: Criado template de workflow e prompt do sistema "lapsado" para garantir que a IA saiba tudo sobre a aplicação.

### Arquivos modificados/criados

- `client/src/components/integrations/IntegrationsPage.jsx` — Novo `AgentMcpCard`.
- `agent/main.py` — Roteamento e API de Ferramentas.
- `agent/n8n_integration.py` — Interface de comunicação com n8n.
- `n8n_organizador_agent.md` — Guia de instalação e Prompt do Sistema.

---

## 7. Configurações Dinâmicas do Banco (.env) via UI

### Problema

O Supabase Auth requeria que as variáveis de ambiente `.env` estivessem perfeitamente alinhadas entre o Server (Backend), Front-end e Agente Python. A chave Service Role no backend estava sobrescrita com a chave pública (Anon Key), fazendo com que o Webhook do WhatsApp falhasse silenciosamente ao tentar buscar a integração.

### Solução

- **Configuração Global via UI:** Criada aba "Banco de Dados & Infraestrutura" em `IntegrationsPage.jsx`.
- **Rota Backend:** Desenvolvida rota Express `/api/config/supabase` que lê e sobrescreve automaticamente `client/.env` e `server/.env`.
- **Prevenção de Erros:** O usuário agora pode colar sua chave Anon e Service Role separadamente na UI, e o Node reinicia automaticamente aplicando as mudanças no banco, evitando o bug de Uazapi e Permissões do Banco.
- **Service Role:** Orientado o uso mandatório da `SUPABASE_SERVICE_KEY` (RLS Bypass) para o Servidor.

---

## 8. Sincronização de Perfis (User Management)

### Desafio

O Sistema atual delega a gestão de usuários 100% para a camada de segurança do Supabase (`auth.users`), o que impede visualizarmos os clientes no SQL da forma tradicional, listarmos em tela ou atrelarmos integrações a um usuário "legível".

### Solução Mapeada

Ao analisar estruturalmente o banco de dados que já existe no Organizador, foi descoberto que a aplicação já contava com uma tabela nativa segura de espelhamento chamada **`public.profiles`**.

- **Aproveitamento de Dados Nativos:** Em vez de desmontar o sistema Auth de segurança atual ou recriá-lo (o que seria menos seguro e redundante), decidimos aproveitar e reconectar as tabelas.
- **Migração Sem Fios Soltos:** Selecionamos as 4 tabelas ativas criadas nas integrações mais recentes (`integrations`, `whatsapp_users`, `chat_messages` e `ai_agent_settings`). Criamos e rodamos o script seguro `update_fks.sql` que transferiu os laços de dados (User ID) dessas tabelas para apontarem oficialmente para `public.profiles`.
- **Prevenção de Quebras (Already Exists):** As tabelas antigas (Projetos e Tarefas) não precisaram mudar nada, pois já usavam `public.profiles` nativamente. O script atual focou apenas no "ALTER TABLE DROP/ADD CONSTRAINT", garantindo migração zero-downtime sem erros de permissão ou recriação.

---

## 9. Chat WhatsApp em Tempo Real via SSE (UazAPI)

### Problema

Mensagens enviadas pela ferramenta chegavam ao WhatsApp corretamente, mas mensagens enviadas pelo cliente/lead nao apareciam no chat.

### Causa Raiz

A UazAPI cloud exige o path `/sse/{instanceName}` para manter a conexao SSE persistente. O path `/sse` generico aceita a conexao, envia um handshake `{"type":"connection"}` e fecha imediatamente. O servidor ficava reconectando a cada 5 segundos sem nunca receber mensagens reais.

### Solucao

**`server/src/lib/sseClient.js`:**

- Path `/sse/{instanceName}` tentado PRIMEIRO (correto para UazAPI cloud)
- Fallback para `/sse` e `/events`
- Filtro de eventos de sistema (`type === 'connection'`, `'ping'`, `'status'`) — nao geram erro
- Bug corrigido: variaveis `currentEvent` e `currentData` estavam dentro do `while (true)` loop, resetando a cada chunk. Movidas para fora do loop.
- Sistema de buffer de logs por integracao (`addLog`, `getSSELogs`) — ultimas 60 entradas

**`server/src/lib/uazapi.js`** — `parseWebhookPayload`:

- Adicionado suporte ao formato wrapper: `{event, data: {chatid, sender, ...}}`

**`server/src/routes/uazapi.js`:**

- Novo endpoint `GET /api/uazapi/sse/logs` — retorna logs SSE da integracao do usuario

**`client/src/components/integrations/IntegrationsPage.jsx`:**

- Removido campo `webhook_url` (SSE nao precisa de webhook publico)
- Badge de status SSE: `connecting` / `connected` / `error`
- Painel "Console SSE" — terminal escuro com logs coloridos por nivel
- Auto-refresh dos logs a cada 3s quando o painel esta aberto
- Corrigido scroll: `scrollIntoView({ block: 'nearest' })` nao arrasta a pagina inteira

### Arquivos modificados

- `server/src/lib/sseClient.js`
- `server/src/lib/uazapi.js`
- `server/src/routes/uazapi.js`
- `client/src/components/integrations/IntegrationsPage.jsx`

---

### Atualização: Endpoint UazAPI Cloud Exato (Documentação Oficial)

Após ler a documentação Swagger em `https://docs.uazapi.com/endpoint/get/sse`, descobrimos as requisições mandatórias da UazAPI Cloud:
A conexão é feita no path `/sse`, requerendo o **Token** obrigatoriamente passado na URL (`?token=XXXX`) e os eventos a escutar passados como string separada por vírgula (`&events=messages,chats`). Ao passar o token via Query String os erros `HTTP 401 Unauthorized` sumiram.

**`server/src/lib/sseClient.js`**

- Inserção dinâmica do payload `?token=${encodeURIComponent(token)}&events=messages,chats` testado como primeira tentativa contra as APIs base Evolution/UazAPI.

---

## Proximos Passos Pendentes
