-- Script para permitir gerenciamento de equipe por administradores
-- VERSÃO CORRIGIDA: Evitando recursão infinita (infinite recursion)

-- 1. Políticas RLS para tabela 'profiles'
DROP POLICY IF EXISTS "Users can view own profile or admins can view all" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile or admins can update all" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- CORREÇÃO: Para evitar que a política que verifica o "role" do usuário gere um loop infinito
-- ao tentar ler a própria tabela 'profiles', vamos permitir a leitura de todos os perfis autenticados
-- A segurança real de quem pode ver o que e editar o que é gerida na aplicação,
-- mas aqui liberamos o SELECT para usuários autenticados para que a listagem da equipe funcione.

CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  USING ( auth.uid() IS NOT NULL );

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

-- Para update, o usuário pode alterar o próprio perfil.
-- Como administradores no front-end não alteram dados de outros perfis (apenas projeto_membros e criam usuários pelo backend via admin auth),
-- não precisamos de uma regra complexa e recursiva de update aqui.
CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id );


-- 2. Políticas RLS para 'project_members'
DROP POLICY IF EXISTS "Users can view members of relevant projects" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can insert members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can delete members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view members of their projects" ON public.project_members;

-- Usuários podem ver os membros dos projetos que são donos ou membros
CREATE POLICY "Users can view members of relevant projects"
  ON public.project_members FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid() 
      OR id IN (SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid())
    )
  );

-- Apenas donos do projeto podem adicionar novos membros
CREATE POLICY "Project owners can insert members"
  ON public.project_members FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

-- Apenas donos do projeto podem remover membros
CREATE POLICY "Project owners can delete members"
  ON public.project_members FOR DELETE
  USING (
    project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );
