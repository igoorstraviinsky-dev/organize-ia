# 🧠 Guia de Transferência: Organizador IA (conversaia.md)

Este documento foi criado para que a próxima IA entenda exatamente o estado atual do projeto, a lógica do "Cérebro" (Agente) e a estrutura do Banco de Dados.

---

## 🏗️ 1. Arquitetura do Agente

O agente atua como um **Super Admin** via WhatsApp, interagindo diretamente com o Supabase.

### 🧩 Componentes Chave:

- **`openai.js` (O Cérebro)**:
  - Possui um **Sistema de Guarda** que verifica o `phone_number` no Supabase antes de qualquer interação.
  - O `systemPrompt` define regras de formatação premium (**Negrito** para projetos e `-` para tarefas).
  - Define a distinção entre ferramentas **Macro** (`list_projects`) e **Micro** (`list_tasks`).
- **`executor.js` (A Mão)**:
  - Resolve a identidade do usuário cruzando o telefone do WhatsApp com a tabela `profiles`.
  - Implementa o **Isolamento de Dados**: Usuários comuns veem apenas o que criaram ou são membros; Admins podem ver tudo via `user_email`.
- **`functions.js` (As Ferramentas)**:
  - Definições puras de funções (JSON schema) sem regras de UI, garantindo que a IA receba apenas o necessário.

---

## 🗄️ 2. Estrutura do Banco de Dados (Supabase)

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

### MACRO: `list_projects`

- **Objetivo**: Visão rápida de "pastas".
- **Retorno**: Apenas `id` e `name` dos projetos.
- **Uso**: Quando o usuário quer saber "quais projetos eu tenho?" ou "quais projetos o colaborador X tem?".

### MICRO: `list_tasks`

- **Objetivo**: Detalhamento e Filtros.
- **Filtros**: Por projeto, por etiqueta (`label_name`), por status ou data.
- **Retorno**: Detalhes completos da tarefa + Etiquetas vinculadas.

---

## 📝 4. Pendências e Próximos Passos

1.  **Kanban UI**: A web já reflete as mudanças, mas a IA pode ser ensinada a "mover cards" entre colunas com mais fluidez.
2.  **Segurança**: O `.gitignore` foi atualizado para **NUNCA** permitir o push de arquivos `.env`. Mantenha as chaves locais e use variáveis de ambiente.
3.  **Prompt**: Sempre que adicionar uma tabela no banco, atualize o `systemPrompt` no `openai.js` para que o Cérebro saiba que ela existe.

**Sincronizado com Git em: 10/03/2026** 🦾🚀
