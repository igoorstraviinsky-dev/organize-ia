# Registro de Atualizações - Organizador IA

Este documento detalha a evolução do agente de inteligência artificial do Organizador, consolidando as mudanças de segurança, identidade e capacidades administrativas.

---

## 🚀 O que fizemos (Sucessos)

### 1. Unificação de Identidade (WhatsApp = Web)

- **Lógica**: O agente agora usa o número de telefone do WhatsApp para encontrar o perfil único do usuário na tabela `public.profiles`.
- **Resultado**: Você não tem mais "dois usuários". O que você faz no WhatsApp reflete no seu login da Web e vice-versa. O agente te reconhece pelo nome e sabe sua função (admin/user).

### 2. Agente Web (Full Admin)

- **Lógica**: Elevamos o "Cérebro" do agente. Ele agora possui ferramentas para criar projetos (`create_project`), listar etiquetas (`list_labels`) e filtrar tarefas por labels.
- **Visibilidade**: O agente agora enxerga tarefas **atribuídas** a você, além das criadas por você. Se você for Admin, ele abre o leque para ver toda a equipe.

### 3. Guarda de Segurança (User Guard)

- **Lógica**: Adicionamos uma verificação obrigatória no início de cada mensagem.
- **Resultado**: Se um número não cadastrado enviar mensagem, o agente bloqueia o processamento e avisa que o acesso é negado, protegendo seus créditos de OpenAI e dados.

---

## ⚠️ O que deu errado e como resolvemos

- **Conflitos de Identidade**: Inicialmente, o agente não via tarefas de projetos onde você era apenas membro. **Solução**: Alteramos a consulta SQL para incluir `project_members` e `assignments`.
- **Role 'Admin' não reconhecida**: O agente às vezes se perdia na Role. **Solução**: Forçamos a leitura da Role direto no cabeçalho do System Prompt em cada mensagem.
- **Push para o GitHub**: Tivemos erros de permissão remota via terminal algumas vezes. **Solução**: Instruímos o uso do `git push --force` ou manual no servidor para garantir a integridade.

---

## 🧠 Lógica de Funcionamento (Mente do Agente)

O agente opera em um fluxo de 3 camadas:

1. **Identificação**: Recebe o número -> Busca no Supabase -> Carrega Perfil.
2. **Contexto (Prompt)**: O "System Prompt" é injetado com suas regras de Admin e modo de visualização Kanban.
3. **Execução**: O agente escolhe uma ferramenta (ex: `list_tasks`), o `executor.js` traduz isso em uma query SQL para o Supabase e devolve o resultado para a IA responder.

---

## 🗄️ Lógica do Banco de Dados (Web & Agente)

Para que o projeto funcione em harmonia, a estrutura segue este modelo:

| Tabela             | Função para a Web                  | Função para o Agente                              |
| :----------------- | :--------------------------------- | :------------------------------------------------ |
| **`profiles`**     | Cadastro de login e configurações. | Identifica quem está falando pelo telefone.       |
| **`projects`**     | Organização visual das pastas.     | Escopo de onde as tarefas serão criadas.          |
| **`tasks`**        | Itens na lista/Kanban.             | O objeto principal que o agente cria/edita.       |
| **`assignments`**  | Atribuição de responsabilidade.    | Permite ao agente saber "o que é meu para fazer". |
| **`task_labels`**  | Categorização visual.              | Usado pelo agente para filtros inteligentes.      |
| **`integrations`** | Conexão com WhatsApp.              | Define por qual "canal" o agente responde.        |

**Atenção**: O agente utiliza uma `service_role` (chave mestra) para garantir que ele possa orquestrar tudo sem ser bloqueado por políticas de segurança da web (RLS), permitindo que ele aja como um assistente pessoal completo.

---

# 🛠️ PLANO DE REFATORAÇÃO CRÍTICA V2 (SPECKIT PLAN)

Este plano descreve rigorosamente as mudanças técnicas necessárias para mitigar os pontos blind-spots de escalabilidade relatados no arquivo `analise_agente.md`.

## 1. Technical Context
Detectamos falhas sistêmicas em Três Pilares críticos entre a integração Agente ↔ Database:
- **Resolução de Identidade Insegura:** Busca ambígua de nomes (`ilike`).
- **Fusos Horários (Timezone Drift):** Inserção de `due_date` sem marcação UTC explícita.
- **Estouro de Memória GPT (Paging):** Retornos de array infinitos do Supabase na tool `list_tasks`.

## 2. Proposed Changes

### Fase 1: Blindagem de Resolução de Usuário

#### [MODIFY] `server/src/agent/executor.js`
- **Componente**: Função `resolveUser(identifier)`
- **Lógica**: Se a busca parcial via nome retornar múltiplas linhas (ex: 2 pessoas com nome "João"):
  - Retornar um erro de Tooling ao Agente: `{"error": "Múltiplos usuários encontrados: [João Silva (email@...), João Pedro (email2@...)]. Solicite ao usuário especificar o e-mail ou nome completo."}`.
  - O Agente será forçado pelo GPT a abortar a criação/atribuição e responder ao WhatsApp perguntando "Qual João exatamente?".

### Fase 2: Normalização Universal do Tempo (Timezones)

#### [MODIFY] `server/src/agent/functions.js`
- **Componente**: Definições das ferramentas `create_task` e `edit_task`.
- **Lógica**: Adicionar anotações ao Schema de que a IA deve mesclar `due_date` e `due_time` preferencialmente em um formato ISO Offset unificado (`YYYY-MM-DDTHH:mm:ss-03:00`) se possível, ou garantir através de lógica no código que se o Agente mandar hora 18:00 (Fuso SP), o Node a grave no banco com o equivalente UTC caso a coluna seja Timezone-Aware, ou explicitamente `-03:00`.

#### [MODIFY] `server/src/agent/executor.js` e `agent/db.py`
- Adicionar no momento da persistência (insert statement) a garantia de Timezone estrito, normalizando conversões de data para evitar que tarefas mudem de dia (Day Drift).

### Fase 3: Paging & Boundary Enforcement (Limites Críticos)

#### [MODIFY] `server/src/agent/executor.js`
- **Componentes**: `export async function listTasks(...)` e equivalente `list_projects`.
- **Lógica**:
  - Injetar forçosamente o encadeamento `.limit(20)` à query de Select do Supabase.
  - Injetar contagem (`{ count: 'exact' }`). Se o result.count for maior que 20, anexar na string de saída pro GPT: `(Aviso: Existem N tarefas ocultas devido ao limite. Peça para o usuário ser mais específico na pesquisa)`.

#### [MODIFY] `agent/db.py`
- Replicar as mesmas proteções (`.limit(20)` e alertas de paginação) nas funções do Python, blindando-o contra crashes de `ContextLengthExceeded`.

### Fase 4: Oportunidades do Guia de Domínio

#### [MODIFY] `conversaia.md`
- Criar a seção: **"Dicionário de Negócios Agente"** definindo Inbox e Tarefas Gerais perfeitamente para IAs.
- Inserir **Tabela Escalonável de Troubleshooting** documentando cada crash já vivenciado.

## 3. Verification Plan
- **Execução**: O comando vai ser enviado "Para João", se o sistema apontar o Erro para Múltiplos, passou.
- **Teste de Dados Limites**: Fazer o mock de 50 tarefas para um user_id e testar o `list_tasks`. O array retornado para o console do Agente não pode ter length maior que 20.
- **Date Check**: Criar tarefa "para me lembrar hoje às 23:50". Ver no banco se o date é UTC de amanhã 02:50, e ver se no Front React ele rende como "Hoje 23:50".

---

_Atualizado em: 11 de Março de 2026_
