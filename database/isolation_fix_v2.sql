-- ============================================
-- ISOLATION FIX V2: Complete Multi-User Isolation
-- ============================================

-- 1. Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 2. Função auxiliar para verificar ADMIN (evita recursão e é mais rápida)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Funções para quebrar recursão entre PROJECTS e PROJECT_MEMBERS
CREATE OR REPLACE FUNCTION public.is_project_owner(p_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = p_id AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_project_member(p_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = p_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Limpar políticas antigas
DROP POLICY IF EXISTS "Integrations isolation" ON public.integrations;
DROP POLICY IF EXISTS "AI settings isolation" ON public.ai_agent_settings;
DROP POLICY IF EXISTS "Chat messages isolation" ON public.chat_messages;
DROP POLICY IF EXISTS "Tasks isolation" ON public.tasks;
DROP POLICY IF EXISTS "Sections isolation" ON public.sections;
DROP POLICY IF EXISTS "Labels isolation" ON public.labels;
DROP POLICY IF EXISTS "Project members isolation" ON public.project_members;
DROP POLICY IF EXISTS "Task labels isolation" ON public.task_labels;
DROP POLICY IF EXISTS "Assignments isolation" ON public.assignments;
DROP POLICY IF EXISTS "Projects isolation" ON public.projects;
DROP POLICY IF EXISTS "Profiles access" ON public.profiles;

-- 5. PROFILES: Usuários podem ver perfis e editar o próprio
CREATE POLICY "Profiles access" ON public.profiles
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- 6. PROJECTS: Isolar por dono, membro ou ser admin (usa funções para evitar recursão)
CREATE POLICY "Projects isolation" ON public.projects
  FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR owner_id = auth.uid()
    OR public.is_project_member(id)
  );

-- 7. INTEGRATIONS, AI_SETTINGS, CHAT_MESSAGES
CREATE POLICY "Integrations isolation" ON public.integrations
  FOR ALL TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "AI settings isolation" ON public.ai_agent_settings
  FOR ALL TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "Chat messages isolation" ON public.chat_messages
  FOR ALL TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

-- 8. TASKS: Dono, Criador, Membro do Projeto ou Atribuído
CREATE POLICY "Tasks isolation" ON public.tasks
  FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR creator_id = auth.uid()
    OR public.is_project_owner(project_id)
    OR public.is_project_member(project_id)
    OR id IN (SELECT task_id FROM public.assignments WHERE user_id = auth.uid())
  );

-- 9. SECTIONS: Atreladas ao acesso do projeto
CREATE POLICY "Sections isolation" ON public.sections
  FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR public.is_project_owner(project_id)
    OR public.is_project_member(project_id)
  );

-- 10. LABELS: Dono ou Admin
CREATE POLICY "Labels isolation" ON public.labels
  FOR ALL TO authenticated
  USING (public.is_admin() OR owner_id = auth.uid());

-- 11. PROJECT_MEMBERS: Ver a si mesmo, ser Admin ou ser dono do projeto
CREATE POLICY "Project members isolation" ON public.project_members
  FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR public.is_project_owner(project_id)
  );

-- 12. TASK_LABELS E ASSIGNMENTS
CREATE POLICY "Task labels isolation" ON public.task_labels FOR ALL TO authenticated USING (true);
CREATE POLICY "Assignments isolation" ON public.assignments FOR ALL TO authenticated USING (true);

-- 12. Reset do Admin Principal
UPDATE public.profiles SET role = 'admin' WHERE email = 'igoorstraviinsky@gmail.com';
