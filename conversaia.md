# 🧠 Guia de Transferência: Organizador IA (conversaia.md)

Este documento foi criado para que a próxima IA entenda exatamente o estado atual do projeto, a lógica do "Cérebro" (Agente) e a estrutura do Banco de Dados.

---

## 🏗️ 1. Arquitetura do Agente

O agente atua como um **Super Admin** via WhatsApp, interagindo diretamente com o Supabase.

### 🧩 Componentes Chave:

- **`openai.js` (O Cérebro)**:
  - Possui um **Sistema de Guarda** que verifica o `phone_number` no Supabase antes de qualquer interação.
  - O `systemPrompt` define regras de **Formatação Premium (Dashboard)**:
    - **Cabeçalho**: "Seus projetos e tarefas"
    - **Identidade**: 👤 **[Nome]**
    - **Projetos (Macro)**: · 📂 **[Nome do Projeto]**
    - **Tarefas (Micro)**: · 📋 [Título] para pendentes e · ✅ concluída para feitas.
    - **Espaçamento**: Linha em branco obrigatória entre blocos de projetos.
  - Define a distinção entre ferramentas **Macro** (`list_projects`) e **Micro** (`list_tasks`).
- **`executor.js` (A Mão)**:
  - Resolve a identidade do usuário cruzando o telefone do WhatsApp com a tabela `profiles`.
  - Implementa o **Isolamento de Dados**: Usuários comuns veem apenas o que criaram ou são membros; Admins podem ver tudo via `user_email`.
- **`functions.js` (As Ferramentas)**:
  - Definições puras de funções (JSON schema) sem regras de UI, garantindo que a IA receba apenas o necessário.

---

## 🗄️ 2. Estrutura do Banco de Dados (Supabase)

**🛡️ Segurança (RLS - Row Level Security):**
_Todas _ as tabelas do projeto (`todoit`) estão com o **RLS HABILITADO (`rls_enabled: true`)**, garantindo proteção total aos dados de cada usuário.

### 📋 Lista Completa de Tabelas (Status RLS: ✅ Ativado)

1. `ai_agent_settings`: Configurações do Agente IA para cada usuário.
2. `assignments`: Atribuições de tarefas (Relação M:N).
3. `chat_messages`: Histórico de conversas (se aplicável).
4. `integrations`: Tokens e credenciais (ex: UazAPI WhatsApp).
5. `labels`: Etiquetas personalizadas de projetos/tarefas.
6. `profiles`: Dados de usuários (telefone, e-mail, role).
7. `project_members`: Membros e convidados de projetos.
8. `projects`: Estrutura macro de pastas/áreas de trabalho.
9. `sections`: Seções (colunas Kanban) dentro dos projetos.
10. `task_labels`: Vínculo entre tarefas e etiquetas.
11. `tasks`: As tarefas (micro) propriamente ditas.
12. `whatsapp_users`: Vínculos específicos de WhatsApp (sessões/histórico).

### Tabela: `profiles`

- **id**: UUID (Primary Key)
- **full_name**: Nome do usuário.
- **email**: Identificador único para buscas de Admin.
- **phone**: Usado pelo Agente para autenticar o WhatsApp.
- **role**: 'admin' ou 'user'.

### Tabela: `projects`

- **id**: UUID
- **name**: Nome do projeto (**Negrito** no prompt).
- **owner_id**: Referência ao `profiles.id`.

### Tabela: `tasks`

- **id**: UUID
- **title**: Título da tarefa.
- **status**: 'pending', 'in_progress', 'completed'.
- **project_id**: Vínculo com projeto.

### Tabela: `assignments` (Relação M:N)

- **task_id**: ID da tarefa.
- **user_id**: ID do colaborador atribuído.
- _Nota: O Agente busca tarefas onde o usuário é o criador OU onde ele está nesta tabela._

---

## 🚀 3. Lógica de Listagem (Refatorada)

### MACRO (DASHBOARD): `list_projects`

- **Objetivo**: Visão global de "pastas" com conteúdo hierárquico.
- **Retorno**: O Agente deve, preferencialmente, usar uma função composta (ex: `getInventory` ou equivalente) que retorne o JSON de projetos já com as tarefas embutidas, evitando múltiplas chamadas de rede.
- **Uso**: Quando o usuário pede um panorama geral ("quais projetos eu tenho?") permitindo montar um dashboard completo e veloz.

### MICRO: `list_tasks`

- **Objetivo**: Detalhamento e Filtros.
- **Filtros**: Por projeto, por etiqueta (`label_name`), por status ou data.
- **Retorno**: Detalhes completos da tarefa + Etiquetas vinculadas.

---

## 📝 4. Pendências e Próximos Passos

1.  **Kanban UI**: A web já reflete as mudanças, mas a IA pode ser ensinada a "mover cards" entre colunas com mais fluidez.
2.  **Segurança**: O `.gitignore` foi atualizado para **NUNCA** permitir o push de arquivos `.env`. Mantenha as chaves locais e use variáveis de ambiente.
3.  **CORREÇÃO CRÍTICA (10/03)**: Foi resolvido um erro onde as funções no `executor.js` falhavam por receber o `phoneNumber` no lugar errado do objeto. Isso causava o "apagão" de dados no WhatsApp.
4.  **Sincronização Python**: O Agente Python (`agent/db.py`) foi atualizado para espelhar a lógica do Node.js, garantindo que tarefas atribuídas e projetos onde o usuário é membro sejam listados corretamente.
5.  **Prompt**: Sempre que adicionar uma tabela no banco, atualize o `systemPrompt` no `openai.js` para que o Cérebro saiba que ela existe.

---

**Última Atualização de Transferência: 10/03/2026 - Status: Estável e Sincronizado.** 🦾🚀

### 🛠️ Correções Críticas Realizadas em Produção (VPS) - 10/03:

1.  **Tratamento de Strings (Retorno Vazio)**: A IA parou de dar "pane" ao procurar projetos/tarefas que não existem. As funções `listProjects`, `searchProjects`, `listTasks` e `searchTasks` no `executor.js` agora retornam uma mensagem em texto claro (ex: `"Nenhum projeto encontrado"`) em vez de um array vazio `[]`, instruindo a IA a não considerar isso uma falha e sim a criar um novo registro usando `create_project` ou `create_task`.
2.  **Lógica do OpenAI (Loop & Tools)**: Corrigida a ausência da variável `maxIterations` no loop do `openai.js`, que estava causando o erro `ReferenceError: maxIterations is not defined`. Também garantimos que a API esteja recebendo explicitamente o bloco `tools` (e não o antigo `functions`).
3.  **Variáveis de Ambiente do Agente Python**: Resolvida a "cegueira" do script Python na VPS, garantindo a configuração adequada do `/root/organizador/agent/.env` contendo a `SUPABASE_URL` e a chave `SUPABASE_SERVICE_KEY` para as validações de banco contornarem bloqueios de RLS no backend de processamento de WhatsApp.
4.  **Formatação Visual ("Dashboard Style")**: Os _System Prompts_ do Cérebro Principal (`openai.js`) e do Agente Python (`agent.py`) foram ajustados para padronizar o retorno visual via WhatsApp. Agora a IA responde com os projetos no formato `· 📂 **Nome do Projeto**`, com as respectivas tarefas listadas hierarquicamente logo abaixo (com emojis `📋` e `✅`).
5.  **Otimização de Performance (listProjects)**: A função `listProjects` (`executor.js`) foi refatorada para utilizar a query avançada `getInventory`. Agora as tarefas já retornam embutidas ([aninhadas](https://pt.wikipedia.org/wiki/Estrutura_de_dados_aninhada)) dentro dos projetos em uma única chamada. Isso evita execuções desnecessárias da IA, melhorando tempo de resposta e poupando requisições à API da OpenAI.
6.  **Atribuição Direta na Criação**: Otimizamos os fluxos de `create_task` e `create_project` para aceitarem o parâmetro `assigned_user_identifier`. Agora a IA pode criar um item e atribuí-lo a um colaborador em uma única chamada. O sistema resolve o usuário pelo nome/e-mail, faz o vínculo no banco e dispara automaticamente uma notificação no WhatsApp do destinatário.
7.  **Inbox Analítico e Dashboard de Produtividade**:
    - **Banco de Dados (Supabase)**: Novas colunas `completed_at` e `updated_at` criadas em `tasks` com uma Trigger nativa do PostgreSQL para atualização automática.
    - **Backend (executor.js)**: A engine agora calcula a "Velocidade Média" das tarefas baseada no completamento, rastreia o "Tempo Inativo" (identificando tarefas frias >48h) e exibe o volume de tarefas criadas por atribuição ("Para Mim").
    - **Interface Web (React)**: A tela de "Inbox"/"Hoje" ganhou 3 cards superiores ressaltando a Velocidade, Atenção Crítica e Volume Atribuído. Os cartões de tarefa exibem tags de identificador de autoria ("De Mim" ou "Para Mim") e destacam-se com anéis de alerta de cor amarela se forem tarefas esquecidas (frias).

8.  **Dashboard Centralizado (UI Refactor)**: Refatoramos a navegação para um modelo focado no Inbox. A Sidebar foi limpa (projetos removidos da lateral) e o fluxo principal foi unificado para sempre carregar o Inbox por padrão, simplificando a jornada do usuário.
9.  **Sincronia de Painel Global (Kanban/Board)**: Ajustamos a lógica de filtragem do Painel Kanban para ser global. Agora, ao estar no Inbox/Dashboard, o painel lista todas as tarefas pendentes independentemente de terem um `project_id`, garantindo que nada fique escondido.
10. **Painel de Projetos Superior (Drawer)**: Implementamos um acesso de elite para os projetos. Em vez de ocuparem espaço no corpo do Inbox, eles agora vivem em um **Painel Suspenso (Drawer)** acionado pelo botão "📂 Meus Projetos" no topo. O painel inclui contadores de tarefas e criação de projetos inline.
11. **Consistência de Cor e Identidade**: Garantimos que a `theme_color` do projeto seja aplicada consistentemente em toda a UI, desde os ícones no novo Drawer até as bordas de destaque nas tarefas, mantendo a identidade visual viva mesmo com a navegação centralizada.

---

**Última Atualização de Transferência: 10/03/2026 às 23:55:54 - Status: Design Premium & Sincronia Total.** 🦾🚀

---

## 📖 5. Glossário de Negócio

Para evitar ambiguidades, o Agente e o Código usam a seguinte nomenclatura:

- **Inbox**: Espaço padrão para tarefas sem projeto ou tarefas atribuídas diretamente ao usuário corrente que exigem visualização imediata. O Inbox _não é_ um projeto físico na tabela `projects`.
- **Fria (Tarefa)**: Tarefa pendente sem atualizações há mais de 48 horas.
- **Micro / Visão Micro**: Representa detalhamentos granulares, geralmente referenciando a tabela `tasks`.
- **Macro / Visão Macro**: Representa diretórios ou agrupadores estruturais, referenciando `projects`.
- **Atribuição (Assignment)**: Ação onde uma tarefa é delegada a outro colaborador (tabela `assignments`). Tarefas atribuídas sempre forçam exibição no Dashboard ("Para Mim") do destinatário.

---

## 🚦 6. Fluxo Arquitetural de Resolução (Node vs Python)

A arquitetura do Agente difere levemente de onde as mensagens se originam, mas compartilham segurança rigorosa.

1. **Recepção e Identidade**:
   - Web App utiliza tokens Supabase Auth padrão (`profiles.id` nativo da sessão).
   - WhatsApp Bot (Node/Python) utiliza o número de telefone raw. **Nunca** executa operações sem antes rodar a função `get_user_id_by_phone` (ou `resolveUserId`).

2. **Fluxo de Atribuição e Ambiguidade**:
   - A função `assign_task` resolve nomes usando `ilike('%nome%')`.
   - **Gotcha**: Se a busca retornar mais de 1 pessoa, os Agentes **Node e Python foram instruídos a abortar a operação e forçar o GPT a devolver erro exigindo o e-mail ou nome completo do usuário**. Isso impede vazamento de responsabilidade (atribuir tarefa sigilosa ao "João" errado).

3. **Timezones Estritos**:
   - Todo LLM está instruído nos _System Prompts_ e via esquemas de Ferramentas (Functions) a operar **100% no timezone BRT/BRST (UTC-3)**.
   - Qualquer geração de datas relativas ("amanhã 15h") assumirá Brasília.

---

## 🚨 7. Troubleshooting & Gotchas de Agentes

Se a IA começar a apresentar alucinações ou a "bater cabeça", verifique o seguinte:

- **Estouro de Contexto por Dados (Token Limits)**: 
  - **Problema**: O bot avisa que "não pode completar" ou congela em loops.
  - **Causa**: Funções como `search_tasks` ou `list_projects` trouxeram 500 registros.
  - **Solução (Aplicada)**: Todas as buscas de listagem no `executor.js` e `agent/db.py` estão com `.limit(20)`. Cuidado ao remover ou modificar paginação nessas consultas.

- **Vazamento e Mudanças de Data "Sozinha" (Day Drift)**:
  - **Problema**: O utilizador cria uma tarefa para o dia 12 e ela aparece no web app como dia 11.
  - **Causa**: Parse de Timezone implícito no React ou gravação como ISO em Node caindo para UTC (+0).
  - **Solução Estável**: Envie sempre as strings raw "YYYY-MM-DD" e "HH:MM" para colunas `date` ou manipule as `Timestamptz` com offset estrito `-03:00` no cliente.

---

## 🚀 8. Ideias de Evolução (Brainstorming)

Para as próximas fases, aqui estão algumas ideias que podem elevar o Organizador IA a um novo patamar:

### ⚡ Interface e UX

1.  **Modo Foco (Pomodoro Integration)**: Adicionar um timer de foco diretamente nos cards de tarefa, sincronizando o tempo gasto com o Supabase.
2.  **Comandos de Voz no Web**: Implementar reconhecimento de voz no campo de "Adicionar Tarefa" para permitir criação por ditado.
3.  **Temas Personalizados por Projeto**: Permitir que o usuário escolha não apenas a cor, mas um "Wallpaper" ou gradiente específico para o fundo do Dashboard quando um projeto estiver selecionado.
4.  **Drag-and-Drop Global**: Permitir arrastar tarefas entre o Inbox Geral e o botão "Meus Projetos" no topo para organizar rapidamente.

### 🤖 Inteligência Artificial (WhatsApp & Web)

5.  **Resumo Matinal**: O Agente enviar um "Bom dia" automático às 8h com as 3 tarefas mais importantes do dia (baseado nos KPIs de Atenção Crítica).
6.  **Sugestão de Prioridades**: A IA analisar o histórico de completamento e sugerir qual tarefa deve ser feita primeiro (Smart Scheduling).
7.  **Leitura de Imagens/Documentos**: Permitir que o usuário envie um print de uma conversa ou foto de um documento no WhatsApp e a IA extraia as tarefas automaticamente.

### 📊 Gestão e Colaboração

8.  **Gráficos de Produtividade**: Uma nova aba de "Insights" com gráficos de barras mostrando tarefas concluídas por semana/projeto.
9.  **Subtarefas Recurrentes**: Melhorar a lógica de tarefas que se repetem (ex: "Enviar relatório toda sexta") com lembretes automáticos.
10. **Gamificação**: Adicionar um sistema de "XP" ou conquistas por tarefas concluídas no prazo, para incentivar o uso.

---

**Exploração de Futuro: 10/03/2026 às 23:59:00 - Próximo nível aguarda.** 🌌✨
