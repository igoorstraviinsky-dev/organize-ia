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
