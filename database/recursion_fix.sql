-- ============================================
-- RECURSION FIX: Breaking RLS Circular Dependency
-- ============================================

-- 1. Desabilitar RLS Temporariamente para limpeza
ALTER TABLE IF EXISTS public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_members DISABLE ROW LEVEL SECURITY;

-- 2. Limpar todas as políticas de projetos e membros
DROP POLICY IF EXISTS "Projects isolation" ON public.projects;
DROP POLICY IF EXISTS "Project members isolation" ON public.project_members;

-- 3. Função de Admin Segura (já existe, mas garantindo)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. POLÍTICA DE PROJETOS (Simplificada)
-- Baseada em: Ser Admin, Ser Dono ou Estar na tabela project_members
-- Usamos um SELECT direto na project_members com SECURITY DEFINER para evitar recursão
CREATE OR REPLACE FUNCTION public.check_project_access(p_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN (
    EXISTS (SELECT 1 FROM public.projects WHERE id = p_id AND owner_id = auth.uid())
    OR 
    EXISTS (SELECT 1 FROM public.project_members WHERE project_id = p_id AND user_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Projects isolation" ON public.projects
  FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR owner_id = auth.uid()
    OR (SELECT public.check_project_access(id))
  );

-- 5. POLÍTICA DE PROJECT_MEMBERS (Simplificada)
-- Baseada em: Ser Admin, Ser o próprio usuário ou ser o DONO do projeto associado
-- Para evitar recursão, buscamos o owner_id do projeto via SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_project_owner_internal(p_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = p_id AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Project members isolation" ON public.project_members
  FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR (SELECT public.is_project_owner_internal(project_id))
  );

-- 6. Re-abilitar RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- 7. Garantir permissões
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_project_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_owner_internal(uuid) TO authenticated;
