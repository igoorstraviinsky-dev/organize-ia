-- ============================================================
-- FIX: Visibilidade Estrita de Tarefas e Projetos
-- Data: 2026-03-09
-- ============================================================

-- 1. Restringir visibilidade de TAREFAS para colaboradores
-- Regra: Colaborador só vê se for criador ou se estiver atribuído (assignments)
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;

CREATE POLICY "Users can view tasks"
  ON public.tasks FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR auth.uid() = creator_id
    OR auth.uid() IN (SELECT user_id FROM public.assignments WHERE task_id = id)
  );

-- 2. Garantir que PROJETOS apareçam para colaboradores se forem membros
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

-- 3. Remover a criação automática de projetos (Inbox) para novas contas
-- O usuário pediu que as contas viessem vazias como novas
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
-- Opcional: remover a função também se não for mais usada
-- DROP FUNCTION IF EXISTS public.create_default_project();

-- 4. Garantir que o perfil 'admin' correto tenha privilégios
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'igoorstraviinsky@gmail.com';

-- 5. Garantir que todos os outros novos usuários sejam 'collaborator' por padrão
-- Modificando o trigger de handle_new_user para setar role = 'collaborator'
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
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
