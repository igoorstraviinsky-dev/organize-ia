-- ============================================
-- Organizador - Database Schema (Supabase/PostgreSQL)
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- 1. Tabela de perfis (estende auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  email text not null unique,
  avatar_url text,
  phone text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. Tabela de projetos
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  color text default '#6366f1',
  icon text default 'folder',
  owner_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 3. Tabela de tarefas
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  priority integer default 4 check (priority between 1 and 4), -- 1=urgent, 2=high, 3=medium, 4=low
  due_date date,
  project_id uuid references public.projects(id) on delete set null,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 4. Tabela de atribuições
create table public.assignments (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  assigned_at timestamptz default now() not null,
  unique(task_id, user_id)
);

-- ============================================
-- Índices
-- ============================================
create index idx_tasks_creator on public.tasks(creator_id);
create index idx_tasks_project on public.tasks(project_id);
create index idx_tasks_status on public.tasks(status);
create index idx_tasks_due_date on public.tasks(due_date);
create index idx_assignments_task on public.assignments(task_id);
create index idx_assignments_user on public.assignments(user_id);
create index idx_projects_owner on public.projects(owner_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Profiles
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Projects
alter table public.projects enable row level security;

create policy "Users can view own projects"
  on public.projects for select
  using (auth.uid() = owner_id);

create policy "Users can create projects"
  on public.projects for insert
  with check (auth.uid() = owner_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = owner_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = owner_id);

-- Tasks
alter table public.tasks enable row level security;

create policy "Users can view own tasks"
  on public.tasks for select
  using (
    auth.uid() = creator_id
    or auth.uid() in (
      select user_id from public.assignments where task_id = id
    )
  );

create policy "Users can create tasks"
  on public.tasks for insert
  with check (auth.uid() = creator_id);

create policy "Users can update own tasks"
  on public.tasks for update
  using (
    auth.uid() = creator_id
    or auth.uid() in (
      select user_id from public.assignments where task_id = id
    )
  );

create policy "Users can delete own tasks"
  on public.tasks for delete
  using (auth.uid() = creator_id);

-- Assignments
alter table public.assignments enable row level security;

create policy "Users can view assignments for their tasks"
  on public.assignments for select
  using (
    auth.uid() = user_id
    or auth.uid() in (
      select creator_id from public.tasks where id = task_id
    )
  );

create policy "Task creators can assign"
  on public.assignments for insert
  with check (
    auth.uid() in (
      select creator_id from public.tasks where id = task_id
    )
  );

create policy "Task creators can unassign"
  on public.assignments for delete
  using (
    auth.uid() in (
      select creator_id from public.tasks where id = task_id
    )
  );

-- ============================================
-- Trigger: auto-create profile on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- Trigger: auto-update updated_at
-- ============================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

drop trigger if exists update_projects_updated_at on public.projects;
create trigger update_projects_updated_at
  before update on public.projects
  for each row execute function public.update_updated_at();

drop trigger if exists update_tasks_updated_at on public.tasks;
create trigger update_tasks_updated_at
  before update on public.tasks
  for each row execute function public.update_updated_at();

-- ============================================
-- Habilitar Realtime na tabela tasks
-- ============================================
alter publication supabase_realtime add table public.tasks;

-- ============================================
-- Projeto padrão "Inbox" (criado via trigger)
-- ============================================
create or replace function public.create_default_project()
returns trigger as $$
begin
  insert into public.projects (name, color, icon, owner_id)
  values ('Inbox', '#6366f1', 'inbox', new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_created on public.profiles;
create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.create_default_project();
