# Relatório de Refatoração: Macro vs Micro (conversaia.md)

Este arquivo detalha as mudanças técnicas realizadas após sua solicitação de limpeza das ferramentas e separação de visibilidade.

---

## 1. O que foi feito (Resumo)

Refatoramos a forma como o agente recupera dados do sistema. Anteriormente, as ferramentas misturavam a "busca de dados" com a "instrução de como mostrar no WhatsApp". Agora, o código é puramente focado em dados, e a parte visual fica com a "mente" do agente.

---

## 2. Detalhes Técnicos por Arquivo

### 🛠️ `functions.js` (Definição de Ferramentas)

- **Limpeza de Descrições**: Removi todas as menções a "usar negrito" ou "fazer lista aninhada" das ferramentas `list_projects` e `list_tasks`.
- **Especialização**:
  - `list_projects`: Definida estritamente como **Visão Macro**. Ela serve apenas para o agente saber quais pastas (projetos) existem.
  - `list_tasks`: Definida como **Visão Micro**. É o bisturi do agente para buscar detalhes, aplicar filtros de etiquetas (labels) e ver o que está pendente.
- **Parâmetros Opcionais**: Garanti que `user_email` seja opcional, permitindo que a IA decida quando buscar dados de terceiros (se for admin) ou os seus próprios.

### ⚙️ `executor.js` (Lógica de Busca)

- **Prioridade de Filtro**:
  1. Se você (Admin) passar um e-mail, ele busca o dono daquele e-mail prioritariamente.
  2. Caso contrário, ele usa o seu perfil resolvido pelo número do WhatsApp.
- **Economia de Tokens**: A função `listProjects` agora retorna apenas o básico (`id` e `name`). Isso evita enviar milhares de palavras desnecessárias para a OpenAI, tornando o agente mais rápido e barato.
- **Lógica de Visibilidade**:
  - Unificamos a busca de tarefas: o agente agora olha projects_id (onde você é dono ou membro) e a tabela `assignments` (onde algo foi delegado a você).

### 🧠 `openai.js` (System Prompt / Cérebro)

- **Centralização Visual**: Todas as regras que você pediu estão agora no coração da IA:
  - **Projetos** em **Negrito**.
  - **Tarefas** com bullet points (`-`).
  - **Status** com emojis discretos (✅, ⏳, 📌).
  - **Quebras de Linha** entre projetos para não virar um "blocão" de texto.
- **Instrução de Uso**: A IA agora sabe que deve usar `list_projects` para ter uma visão geral e `list_tasks` para quando você pedir detalhes.

---

## 3. Resultado Final

O agente agora se comporta de forma mais inteligente. Ele não "tenta formatar o código", ele apenas recupera os dados e, usando o novo System Prompt, escreve a mensagem para você da forma premium que combinamos.

**Mudanças subidas para o Git com sucesso.** 🚀
