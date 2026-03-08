-- ============================================
-- Fix: Remove infinite recursion in RLS policies
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. Dropar policies problemáticas de TASKS
drop policy if exists "Users can view own tasks" on public.tasks;
drop policy if exists "Users can update own tasks" on public.tasks;
drop policy if exists "Users can create tasks" on public.tasks;
drop policy if exists "Users can delete own tasks" on public.tasks;

-- 2. Recriar policies de TASKS (sem referência a assignments)
create policy "Users can view own tasks"
  on public.tasks for select
  using (auth.uid() = creator_id);

create policy "Users can create tasks"
  on public.tasks for insert
  with check (auth.uid() = creator_id);

create policy "Users can update own tasks"
  on public.tasks for update
  using (auth.uid() = creator_id);

create policy "Users can delete own tasks"
  on public.tasks for delete
  using (auth.uid() = creator_id);

-- 3. Dropar policies problemáticas de ASSIGNMENTS
drop policy if exists "Users can view assignments for their tasks" on public.assignments;
drop policy if exists "Task creators can assign" on public.assignments;
drop policy if exists "Task creators can unassign" on public.assignments;

-- 4. Recriar policies de ASSIGNMENTS (sem referência a tasks)
create policy "Users can view own assignments"
  on public.assignments for select
  using (auth.uid() = user_id);

create policy "Users can create assignments"
  on public.assignments for insert
  with check (true);

create policy "Users can delete assignments"
  on public.assignments for delete
  using (true);

-- 5. Dropar policies problemáticas de TASK_LABELS
drop policy if exists "Users can view task labels for own tasks" on public.task_labels;
drop policy if exists "Users can add labels to own tasks" on public.task_labels;
drop policy if exists "Users can remove labels from own tasks" on public.task_labels;

-- 6. Recriar policies de TASK_LABELS (sem referência cruzada a tasks)
create policy "Users can view task labels"
  on public.task_labels for select
  using (true);

create policy "Users can add task labels"
  on public.task_labels for insert
  with check (true);

create policy "Users can remove task labels"
  on public.task_labels for delete
  using (true);
