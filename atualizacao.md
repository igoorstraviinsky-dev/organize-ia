# Atualizações do Banco de Dados — Organizador

**Última atualização:** 2026-03-09

---

## Arquivo Autoritativo

> **`database/schema_complete.sql`** — único arquivo a ser aplicado no Supabase SQL Editor.
> Substitui todos os arquivos anteriores (schema.sql, definitive_fix.sql, isolation_fix_v2.sql, super_lockdown.sql, etc.)
> **Preserva todos os dados existentes.**

---

## Por Que Foi Necessário

Ao longo do desenvolvimento, mais de 13 arquivos SQL de migração foram aplicados ao banco em sequência:
`schema.sql` → `migration_v2.sql` → `recursion_fix.sql` → `super_lockdown.sql` → `isolation_fix_v2.sql` → `apply_visibility_rules.sql` → `definitive_fix.sql` ...

Esse acúmulo gerou três problemas críticos:

1. **Políticas RLS duplicadas/conflitantes** — migrations mais novas não removiam as políticas antigas pelo nome correto, deixando múltiplas políticas ativas simultaneamente na mesma tabela.

2. **Recursão circular infinita** — a política de SELECT de `tasks` consultava `assignments`, e a política de SELECT de `assignments` consultava `tasks` de volta. Isso causava o erro `infinite recursion detected in policy for relation "tasks"` ao tentar criar qualquer tarefa.

3. **Colunas ausentes** — colunas usadas pelo frontend (`due_time`, `section_id`, `parent_id`, `position` em tasks; `message_type`, `media_url` em chat_messages) não estavam no schema original e foram adicionadas por migrations separadas que podem não ter sido aplicadas.

---

## O Que Foi Feito

### 1. Estrutura de Tabelas — Colunas Garantidas

| Tabela | Colunas adicionadas/garantidas |
|--------|-------------------------------|
| `profiles` | `phone`, `avatar_url`, `role` (DEFAULT 'collaborator'), `updated_at` |
| `tasks` | `due_time`, `section_id` (FK→sections), `parent_id` (FK→tasks, subtarefas), `position`, `updated_at` |
| `sections` | `position` |
| `chat_messages` | `message_type` (text/audio/image/document), `media_url` |
| `integrations` | constraint de `provider` ampliada para incluir `telegram` e `agent_n8n` |

### 2. Tabelas Criadas (IF NOT EXISTS)

- `sections` — seções dentro de projetos (ordem Kanban)
- `labels` — etiquetas de tarefas
- `task_labels` — relação N:N entre tarefas e etiquetas
- `project_members` — controle de acesso por projeto (admin adiciona colaboradores)
- `integrations` — WhatsApp, Telegram, agente N8N
- `chat_messages` — mensagens do chat integrado
- `whatsapp_users` — vínculo número WhatsApp ↔ usuário
- `ai_agent_settings` — configurações do agente de IA

### 3. Limpeza Total de Políticas RLS

```sql
DO $$ DECLARE pol record;
BEGIN
  FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;
```

Todas as ~40+ políticas antigas foram removidas de uma vez para garantir estado limpo.

### 4. Funções SECURITY DEFINER (quebram recursão circular)

São funções que executam consultas SQL **ignorando RLS** (como se fossem o owner do banco). Isso permite que políticas de uma tabela consultem outra tabela sem entrar em loop.

| Função | O que faz | Por que existe |
|--------|-----------|----------------|
| `is_admin()` | Verifica se o usuário atual tem `role = 'admin'` em profiles | Usada em todas as políticas para dar acesso total ao admin |
| `is_project_member(p_id)` | Verifica se o usuário está em `project_members` para o projeto | Usada em projects e sections sem recursão |
| `is_project_owner(p_id)` | Verifica se o usuário é `owner_id` do projeto | Usada em assignments e sections sem recursão |
| `is_task_assignee(t_id)` | Verifica se o usuário está em `assignments` para a tarefa | **Quebra o loop:** tasks RLS consulta assignments SEM passar pelo RLS de assignments |
| `is_task_creator(t_id)` | Verifica se o usuário é `creator_id` da tarefa | **Quebra o loop:** assignments RLS consulta tasks SEM passar pelo RLS de tasks |
| `get_task_project_id(t_id)` | Retorna o `project_id` de uma tarefa sem RLS | Usada em assignments INSERT para verificar ownership do projeto |
| `has_assigned_tasks_in_project(p_id)` | Verifica se o usuário tem tarefas atribuídas em um projeto | Usada em projects SELECT para mostrar projeto ao colaborador atribuído |

### 5. Políticas RLS Recriadas (35 políticas, 0 recursão)

#### Regras de Visibilidade Implementadas

**Admin** (`role = 'admin'`): vê e gerencia absolutamente tudo.

**Colaborador** (`role = 'collaborator'`):

| O que vê | Condição |
|----------|----------|
| Projetos | Criou (owner_id) OU foi adicionado como membro (project_members) OU tem tarefa atribuída no projeto |
| Tarefas | Criou (creator_id) OU foi atribuído (assignments) OU é dono/membro do projeto da tarefa |
| Seções | É dono ou membro do projeto da seção |
| Etiquetas | Criou a etiqueta (owner_id) |
| Atribuições | É o atribuído (user_id) OU criou a tarefa |
| Membros do projeto | É o próprio membro OU é dono do projeto |

#### Tabela Completa de Políticas

| Tabela | Operação | Quem pode |
|--------|----------|-----------|
| profiles | SELECT | Todos autenticados (necessário para colaboração) |
| profiles | UPDATE | Próprio usuário (não pode mudar role, só admin pode) |
| projects | SELECT | Admin, dono, membro, ou quem tem tarefa atribuída |
| projects | INSERT | Qualquer autenticado (owner_id deve ser o próprio) |
| projects | UPDATE/DELETE | Admin ou dono |
| sections | SELECT/INSERT | Admin, dono ou membro do projeto |
| sections | UPDATE/DELETE | Admin ou dono do projeto |
| tasks | SELECT | Admin, criador, dono/membro do projeto, ou atribuído |
| tasks | INSERT | creator_id deve ser o próprio usuário |
| tasks | UPDATE | Admin, criador, dono/membro do projeto, ou atribuído |
| tasks | DELETE | Admin ou criador |
| labels | ALL | Admin ou dono da etiqueta |
| task_labels | SELECT | Admin, criador da tarefa, ou dono da etiqueta |
| task_labels | INSERT/DELETE | Admin ou criador da tarefa |
| assignments | SELECT | Admin, o atribuído, ou criador da tarefa |
| assignments | INSERT | Admin, criador da tarefa, ou dono do projeto |
| assignments | DELETE | Admin, o atribuído, criador, ou dono do projeto |
| project_members | SELECT | Admin, o próprio membro, ou dono do projeto |
| project_members | INSERT/DELETE | Admin ou dono do projeto |
| integrations | ALL | Admin ou dono da integração |
| chat_messages | SELECT | Admin ou dono |
| chat_messages | INSERT | Qualquer autenticado (webhook do agente) |
| whatsapp_users | SELECT | Admin ou dono do vínculo |
| ai_agent_settings | ALL | Admin ou dono |

### 6. Triggers

| Trigger | Tabela | Função | O que faz |
|---------|--------|--------|-----------|
| `on_auth_user_created` | auth.users | `handle_new_user()` | Cria perfil automaticamente ao registrar |
| `update_profiles_updated_at` | profiles | `update_updated_at()` | Atualiza campo updated_at |
| `update_projects_updated_at` | projects | `update_updated_at()` | Atualiza campo updated_at |
| `update_tasks_updated_at` | tasks | `update_updated_at()` | Atualiza campo updated_at |
| `update_integrations_updated_at` | integrations | `update_updated_at()` | Atualiza campo updated_at |
| `update_ai_agent_settings_updated_at` | ai_agent_settings | `update_updated_at()` | Atualiza campo updated_at |
| ~~`on_profile_created`~~ | ~~profiles~~ | ~~`create_default_project()`~~ | **REMOVIDO** — usuários começam sem Inbox automático |

#### Lógica do `handle_new_user()`
```
Novo usuário cadastrado
  ↓
Email = 'igoorstraviinsky@gmail.com'?
  → SIM: role = 'admin'
  → NÃO: role = 'collaborator'
  ↓
Insere em public.profiles (ON CONFLICT DO NOTHING)
```

### 7. Realtime Habilitado

Tabelas com publicação em tempo real (Supabase Realtime):
`tasks`, `assignments`, `sections`, `labels`, `task_labels`, `projects`, `project_members`, `chat_messages`

O frontend usa `useRealtimeTasks.js` para escutar mudanças e invalidar o cache React Query automaticamente.

### 8. Storage — Bucket de Avatares

- Bucket `avatars` criado (público para leitura)
- Autenticados podem fazer upload
- Update restrito ao próprio usuário (caminho deve começar com `userId/`)

---

## Alterações no Frontend

| Arquivo | O que mudou | Por quê |
|---------|-------------|---------|
| `client/src/main.jsx` | `refetchOnWindowFocus: false`, removido `refetchInterval` | Evitava "reload" ao trocar de aba — o Realtime cuida das atualizações |
| `client/src/hooks/useProjects.js` | `staleTime: 1000 * 60 * 2` (era 0) | Cache de 2 min; Realtime invalida quando necessário |

---

## Como Aplicar

1. Acesse **Supabase Dashboard → SQL Editor**
2. Cole o conteúdo de **`database/schema_complete.sql`**
3. Execute (Run)
4. Rebuild do frontend na VPS: `cd client && npm run build`

---

## Verificação Pós-Aplicação

```sql
-- Ver todas as políticas ativas
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- Confirmar role do admin
SELECT email, role FROM public.profiles ORDER BY role;

-- Confirmar funções existem
SELECT proname FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('is_admin','is_project_member','is_project_owner',
                  'is_task_assignee','is_task_creator',
                  'get_task_project_id','has_assigned_tasks_in_project');
```
