-- ============================================================
-- FIX FINAL: Estrutura de Perfis e Visibilidade Estrita
-- Data: 2026-03-09
-- ============================================================

-- 1. ADICIONAR COLUNA ROLE (O elo perdido)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'collaborator' CHECK (role IN ('admin', 'collaborator'));

-- 2. ATUALIZAR ADMIN PRINCIPAL
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'igoorstraviinsky@gmail.com';

-- 3. CORRIGIR TRIGGER DE NOVOS USUÁRIOS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    CASE 
      WHEN new.email = 'igoorstraviinsky@gmail.com' THEN 'admin'
      ELSE 'collaborator'
    END
  );
  return new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. REMOVER INBOX AUTOMÁTICO PARA CONTAS VAZIAS
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- 5. REGRAS DE VISIBILIDADE DE PROJETOS (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Users see own and assigned projects" ON public.projects;

CREATE POLICY "Users see own and assigned projects"
  ON public.projects FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR auth.uid() = owner_id
    OR id IN (
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  );

-- 6. REGRAS DE VISIBILIDADE DE TAREFAS (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;

CREATE POLICY "Users can view tasks"
  ON public.tasks FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR auth.uid() = creator_id
    OR auth.uid() IN (SELECT user_id FROM public.assignments WHERE task_id = id)
  );

-- 7. REGRAS DE SEÇÕES (Acompanham o projeto)
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view sections" ON public.sections;

CREATE POLICY "Users can view sections"
  ON public.sections FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR project_id IN (
      SELECT id FROM public.projects -- O RLS de projects já filtra aqui
    )
  );
