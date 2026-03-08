
-- ============================================
-- FIX: Visibilidade de Projetos e Resolução de Recursão RLS
-- ============================================

-- 1. Limpar políticas antigas de Projetos
DROP POLICY IF EXISTS "Users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can see all projects" ON public.projects;
DROP POLICY IF EXISTS "Users can see own or assigned projects" ON public.projects;

-- Política de Projetos: 
-- Admins veem tudo. 
-- Outros veem o que são donos OU o que são membros.
CREATE POLICY "Select projects"
  ON public.projects FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR auth.uid() = owner_id
    OR id IN (
      -- Usamos uma subquery simples na project_members
      -- Para evitar recursão, a política da project_members não deve apontar de volta para projects de forma circular
      SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
    )
  );

-- 2. Limpar políticas de Membros do Projeto (para evitar o loop)
DROP POLICY IF EXISTS "Users can view members of relevant projects" ON public.project_members;
DROP POLICY IF EXISTS "Users can view members of their projects" ON public.project_members;

-- Política de Membros do Projeto:
-- Admins veem tudo.
-- Usuário vê sua própria entrada.
-- Dono do projeto vê quem está no projeto dele (sem recursão, pois owner_id está na tabela projects)
CREATE POLICY "Select project members"
  ON public.project_members FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR user_id = auth.uid()
    OR project_id IN (
      SELECT p.id FROM public.projects p WHERE p.owner_id = auth.uid()
    )
  );

-- 3. Garantir que as políticas de insert/update de projetos estejam ok para admins
DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;
CREATE POLICY "Admins can manage projects"
  ON public.projects FOR ALL
  USING ( (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );

-- Se o admin não tiver a política acima, ele só vê mas não edita. 
-- Mas por enquanto vamos focar na VISIBILIDADE (SELECT).
