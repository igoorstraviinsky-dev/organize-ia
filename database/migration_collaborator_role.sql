-- ============================================
-- Migração: Área de Colaborador (VERSÃO CORRIGIDA)
-- ============================================

-- IMPORTANTE: Se você receber erro de "public.profiles does not exist", 
-- certifique-se de que você está no projeto correto no Supabase 
-- e que já rodou o schema.sql inicial.

-- 1. Tentar adicionar a coluna de role (se a tabela existir)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'admin';
    END IF;
END $$;

-- 2. Criar tabela de membros do projeto
CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(project_id, user_id)
);

-- 3. Atualizar RLS de Projetos
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects" ON public.projects;

CREATE POLICY "Users can view projects"
  ON public.projects FOR SELECT
  USING (
    auth.uid() = owner_id
    OR id IN (
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  );

-- 4. Atualizar RLS de Tarefas
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;

CREATE POLICY "Users can view tasks"
  ON public.tasks FOR SELECT
  USING (
    auth.uid() = creator_id
    OR auth.uid() IN (
      SELECT user_id FROM public.assignments WHERE task_id = id
    )
    OR project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
      OR id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    )
  );
