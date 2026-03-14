-- ============================================================
-- FIX: Isolamento de Projetos por Colaborador
-- Problema: colaboradores viam todos os projetos existentes
-- Solução: RLS restrito — colaborador só vê o que é dele
--          ou o que um admin explicitamente atribuiu
--
-- Execute no SQL Editor do Supabase
-- ============================================================

-- ============================================================
-- 1. PROJETOS
-- ============================================================

-- Remove TODAS as políticas de SELECT/ALL de projetos para começar do zero
DROP POLICY IF EXISTS "Users can view projects"               ON public.projects;
DROP POLICY IF EXISTS "Users can view own projects"           ON public.projects;
DROP POLICY IF EXISTS "Admins can see all projects"           ON public.projects;
DROP POLICY IF EXISTS "Users can see own or assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Select projects"                       ON public.projects;
DROP POLICY IF EXISTS "Admins can manage projects"            ON public.projects;
DROP POLICY IF EXISTS "Users can create projects"             ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects"         ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects"         ON public.projects;

-- Admins: acesso total a todos os projetos
CREATE POLICY "Admins full access to projects"
  ON public.projects FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Colaboradores / outros usuários:
-- Veem APENAS projetos onde são donos (seu Inbox) OU foram explicitamente atribuídos
CREATE POLICY "Users see own and assigned projects"
  ON public.projects FOR SELECT
  USING (
    auth.uid() = owner_id
    OR id IN (
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  );

-- Colaboradores podem criar seus próprios projetos
CREATE POLICY "Users can create own projects"
  ON public.projects FOR INSERT
  WITH CHECK ( auth.uid() = owner_id );

-- Colaboradores podem editar/deletar seus próprios projetos
CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING ( auth.uid() = owner_id );

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING ( auth.uid() = owner_id );


-- ============================================================
-- 2. SEÇÕES (sections)
-- Problema anterior: só via seções de projetos próprios,
-- não de projetos atribuídos
-- ============================================================

DROP POLICY IF EXISTS "Users can view sections of own projects"   ON public.sections;
DROP POLICY IF EXISTS "Users can create sections in own projects" ON public.sections;
DROP POLICY IF EXISTS "Users can update sections in own projects" ON public.sections;
DROP POLICY IF EXISTS "Users can delete sections in own projects" ON public.sections;

-- Helper para identificar projetos acessíveis pelo usuário
-- (próprios OU atribuídos via project_members)
CREATE POLICY "Users can view sections"
  ON public.sections FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
      UNION ALL
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sections"
  ON public.sections FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
      UNION ALL
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sections"
  ON public.sections FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
      UNION ALL
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sections"
  ON public.sections FOR DELETE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  );


-- ============================================================
-- 3. TAREFAS (tasks)
-- Problema anterior: colaborador só via tarefas onde era criador
-- ou estava diretamente atribuído — agora vê todas as tarefas
-- dos projetos onde foi adicionado
-- ============================================================

DROP POLICY IF EXISTS "Users can view own tasks"  ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks"      ON public.tasks;
DROP POLICY IF EXISTS "Admins can view all tasks" ON public.tasks;

CREATE POLICY "Users can view tasks"
  ON public.tasks FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR auth.uid() = creator_id
    OR auth.uid() IN (SELECT user_id FROM public.assignments WHERE task_id = id)
    OR project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
      UNION ALL
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  );


-- ============================================================
-- 4. MEMBROS DE PROJETO (project_members)
-- Garante que admins gerenciam tudo e colaboradores veem
-- apenas suas próprias atribuições
-- ============================================================

DROP POLICY IF EXISTS "Select project members"                    ON public.project_members;
DROP POLICY IF EXISTS "Users can view members of relevant projects" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can insert members"         ON public.project_members;
DROP POLICY IF EXISTS "Project owners can delete members"         ON public.project_members;
DROP POLICY IF EXISTS "Admins manage project members"             ON public.project_members;
DROP POLICY IF EXISTS "Users see own memberships"                 ON public.project_members;
DROP POLICY IF EXISTS "Owners manage project members"             ON public.project_members;

-- Admins veem e gerenciam todos os membros
CREATE POLICY "Admins manage all project members"
  ON public.project_members FOR ALL
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Colaboradores veem apenas suas próprias entradas
CREATE POLICY "Users see own project memberships"
  ON public.project_members FOR SELECT
  USING ( user_id = auth.uid() );

-- Donos de projeto podem gerenciar membros do próprio projeto
CREATE POLICY "Project owners manage their members"
  ON public.project_members FOR ALL
  USING (
    project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );


-- ============================================================
-- 5. VERIFICAÇÃO FINAL
-- Confirme que o trigger de Inbox ainda existe (não removemos)
-- O trigger cria apenas o Inbox do novo usuário — não atribui
-- projetos de terceiros. Se colaboradores ainda viam todos os
-- projetos, era bug de RLS (corrigido acima).
-- ============================================================

-- Para confirmar as políticas ativas, rode no SQL Editor:
-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('projects', 'sections', 'tasks', 'project_members')
-- ORDER BY tablename, policyname;
