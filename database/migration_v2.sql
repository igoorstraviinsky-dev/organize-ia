-- ============================================
-- Migration V2: Sections, Labels, Subtasks, Due Time
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. Tabela de seções (divisões dentro de projetos)
create table if not exists public.sections (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  position integer default 0,
  created_at timestamptz default now() not null
);

-- 2. Tabela de labels/etiquetas
create table if not exists public.labels (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  color text default '#6366f1',
  owner_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null
);

-- 3. Junção N:N tasks <-> labels
create table if not exists public.task_labels (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  label_id uuid references public.labels(id) on delete cascade not null,
  unique(task_id, label_id)
);

-- 4. Novos campos na tabela tasks
alter table public.tasks add column if not exists due_time time;
alter table public.tasks add column if not exists parent_id uuid references public.tasks(id) on delete cascade;
alter table public.tasks add column if not exists section_id uuid references public.sections(id) on delete set null;
alter table public.tasks add column if not exists position integer default 0;

-- ============================================
-- Índices
-- ============================================
create index if not exists idx_sections_project on public.sections(project_id);
create index if not exists idx_sections_position on public.sections(project_id, position);
create index if not exists idx_labels_owner on public.labels(owner_id);
create index if not exists idx_task_labels_task on public.task_labels(task_id);
create index if not exists idx_task_labels_label on public.task_labels(label_id);
create index if not exists idx_tasks_parent on public.tasks(parent_id);
create index if not exists idx_tasks_section on public.tasks(section_id);

-- ============================================
-- RLS: Sections
-- ============================================
alter table public.sections enable row level security;

create policy "Users can view sections of own projects"
  on public.sections for select
  using (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );

create policy "Users can create sections in own projects"
  on public.sections for insert
  with check (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );

create policy "Users can update sections in own projects"
  on public.sections for update
  using (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );

create policy "Users can delete sections in own projects"
  on public.sections for delete
  using (
    project_id in (select id from public.projects where owner_id = auth.uid())
  );

-- ============================================
-- RLS: Labels
-- ============================================
alter table public.labels enable row level security;

create policy "Users can view own labels"
  on public.labels for select
  using (auth.uid() = owner_id);

create policy "Users can create labels"
  on public.labels for insert
  with check (auth.uid() = owner_id);

create policy "Users can update own labels"
  on public.labels for update
  using (auth.uid() = owner_id);

create policy "Users can delete own labels"
  on public.labels for delete
  using (auth.uid() = owner_id);

-- ============================================
-- RLS: Task Labels
-- ============================================
alter table public.task_labels enable row level security;

create policy "Users can view task labels for own tasks"
  on public.task_labels for select
  using (
    task_id in (select id from public.tasks where creator_id = auth.uid())
    or task_id in (select task_id from public.assignments where user_id = auth.uid())
  );

create policy "Users can add labels to own tasks"
  on public.task_labels for insert
  with check (
    task_id in (select id from public.tasks where creator_id = auth.uid())
  );

create policy "Users can remove labels from own tasks"
  on public.task_labels for delete
  using (
    task_id in (select id from public.tasks where creator_id = auth.uid())
  );

-- ============================================
-- Habilitar Realtime nas novas tabelas
-- ============================================
alter publication supabase_realtime add table public.sections;
alter publication supabase_realtime add table public.labels;
alter publication supabase_realtime add table public.task_labels;
