-- ============================================================
-- DEFINITIVE FIX: Limpeza total e recriação correta de todas as políticas RLS
-- Data: 2026-03-09
-- Aplicar no SQL Editor do Supabase (VPS)
-- ============================================================

-- ============================================================
-- PASSO 1: GARANTIR COLUNA ROLE NA TABELA PROFILES
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'collaborator';
-- Adicionar constraint apenas se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public' AND table_name = 'profiles' AND constraint_name = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'collaborator'));
  END IF;
END $$;

-- ============================================================
-- PASSO 2: CORRIGIR DADOS DE ROLE
-- ============================================================
UPDATE public.profiles SET role = 'admin' WHERE email = 'igoorstraviinsky@gmail.com';
UPDATE public.profiles SET role = 'collaborator'
  WHERE role IS NULL OR role NOT IN ('admin', 'collaborator');
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'collaborator';

-- ============================================================
-- PASSO 3: REMOVER TODAS AS POLÍTICAS EXISTENTES (limpeza total)
-- ============================================================
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN (
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ============================================================
-- PASSO 4: FUNÇÕES AUXILIARES COM SECURITY DEFINER
-- Todas bypassam RLS — quebrando qualquer recursão circular
-- ============================================================

-- Verifica se o usuário atual é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Verifica se o usuário atual é membro de um projeto
CREATE OR REPLACE FUNCTION public.is_project_member(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_id AND user_id = auth.uid()
  );
END;
$$;

-- Verifica se o usuário atual é dono de um projeto
CREATE OR REPLACE FUNCTION public.is_project_owner(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_id AND owner_id = auth.uid()
  );
END;
$$;

-- Verifica se o usuário atual está atribuído a uma tarefa
-- (usado em tasks RLS para evitar recursão com assignments RLS)
CREATE OR REPLACE FUNCTION public.is_task_assignee(t_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.assignments
    WHERE task_id = t_id AND user_id = auth.uid()
  );
END;
$$;

-- Verifica se o usuário atual é criador de uma tarefa
-- (usado em assignments/task_labels RLS para evitar recursão com tasks RLS)
CREATE OR REPLACE FUNCTION public.is_task_creator(t_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id = t_id AND creator_id = auth.uid()
  );
END;
$$;

-- Retorna o project_id de uma tarefa (bypassa RLS)
-- (usado em assignments INSERT para verificar ownership do projeto sem recursão)
CREATE OR REPLACE FUNCTION public.get_task_project_id(t_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN (SELECT project_id FROM public.tasks WHERE id = t_id);
END;
$$;

-- Verifica se o usuario tem tarefas atribuidas em um projeto (bypassa RLS de tasks e assignments)
CREATE OR REPLACE FUNCTION public.has_assigned_tasks_in_project(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tasks t
    INNER JOIN public.assignments a ON a.task_id = t.id
    WHERE t.project_id = p_id AND a.user_id = auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_task_assignee(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_task_creator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_task_project_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_assigned_tasks_in_project(uuid) TO authenticated;

-- ============================================================
-- PASSO 5: HABILITAR RLS EM TODAS AS TABELAS
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Tabelas opcionais (só habilita se existirem)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'integrations') THEN
    ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_agent_settings') THEN
    ALTER TABLE public.ai_agent_settings ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
    ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================================
-- PASSO 6: POLÍTICAS DE PROFILES
-- Admin vê todos, usuário vê o próprio. Qualquer autenticado pode ler perfis (necessário para colaboração).
-- ============================================================
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      public.is_admin()
      OR role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    )
  );

-- ============================================================
-- PASSO 7: POLÍTICAS DE PROJECTS
-- Regra: Admin vê tudo. Colaborador vê projetos que criou OU é membro.
-- ============================================================

-- SELECT: Admin, dono, membro do projeto, ou quem tem tarefas atribuidas no projeto
CREATE POLICY "projects_select"
  ON public.projects FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR owner_id = auth.uid()
    OR public.is_project_member(id)
    OR public.has_assigned_tasks_in_project(id)
  );

-- INSERT: Qualquer autenticado pode criar projeto (owner_id deve ser o próprio usuário)
CREATE POLICY "projects_insert"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.is_admin());

-- UPDATE: Admin pode tudo, dono pode o próprio
CREATE POLICY "projects_update"
  ON public.projects FOR UPDATE TO authenticated
  USING (public.is_admin() OR owner_id = auth.uid())
  WITH CHECK (public.is_admin() OR owner_id = auth.uid());

-- DELETE: Admin pode tudo, dono pode o próprio
CREATE POLICY "projects_delete"
  ON public.projects FOR DELETE TO authenticated
  USING (public.is_admin() OR owner_id = auth.uid());

-- ============================================================
-- PASSO 8: POLÍTICAS DE TASKS
-- Regra: Admin vê tudo. Colaborador vê tarefas que criou OU foi atribuído.
-- ============================================================

-- SELECT
CREATE POLICY "tasks_select"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR creator_id = auth.uid()
    OR public.is_project_owner(project_id)
    OR public.is_project_member(project_id)
    OR public.is_task_assignee(id)
  );

-- INSERT: Criador deve ser o próprio usuário
CREATE POLICY "tasks_insert"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    creator_id = auth.uid() OR public.is_admin()
  );

-- UPDATE: Admin, criador, ou membro do projeto
CREATE POLICY "tasks_update"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR creator_id = auth.uid()
    OR public.is_project_owner(project_id)
    OR public.is_project_member(project_id)
    OR public.is_task_assignee(id)
  );

-- DELETE: Admin ou criador
CREATE POLICY "tasks_delete"
  ON public.tasks FOR DELETE TO authenticated
  USING (public.is_admin() OR creator_id = auth.uid());

-- ============================================================
-- PASSO 9: POLÍTICAS DE SECTIONS
-- Regra: Seguem o acesso do projeto.
-- ============================================================

CREATE POLICY "sections_select"
  ON public.sections FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_project_owner(project_id)
    OR public.is_project_member(project_id)
  );

CREATE POLICY "sections_insert"
  ON public.sections FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.is_project_owner(project_id)
  );

CREATE POLICY "sections_update"
  ON public.sections FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR public.is_project_owner(project_id)
  );

CREATE POLICY "sections_delete"
  ON public.sections FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR public.is_project_owner(project_id)
  );

-- ============================================================
-- PASSO 10: POLÍTICAS DE LABELS
-- ============================================================

CREATE POLICY "labels_select"
  ON public.labels FOR SELECT TO authenticated
  USING (public.is_admin() OR owner_id = auth.uid());

CREATE POLICY "labels_insert"
  ON public.labels FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "labels_update"
  ON public.labels FOR UPDATE TO authenticated
  USING (public.is_admin() OR owner_id = auth.uid());

CREATE POLICY "labels_delete"
  ON public.labels FOR DELETE TO authenticated
  USING (public.is_admin() OR owner_id = auth.uid());

-- ============================================================
-- PASSO 11: POLÍTICAS DE PROJECT_MEMBERS
-- Admin vê tudo. Dono do projeto gerencia. Membro vê a própria entrada.
-- ============================================================

CREATE POLICY "project_members_select"
  ON public.project_members FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR public.is_project_owner(project_id)
  );

CREATE POLICY "project_members_insert"
  ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.is_project_owner(project_id)
  );

CREATE POLICY "project_members_delete"
  ON public.project_members FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR public.is_project_owner(project_id)
  );

-- ============================================================
-- PASSO 12: POLÍTICAS DE ASSIGNMENTS
-- ============================================================

CREATE POLICY "assignments_select"
  ON public.assignments FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR public.is_task_creator(task_id)
  );

CREATE POLICY "assignments_insert"
  ON public.assignments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.is_task_creator(task_id)
    OR public.is_project_owner(public.get_task_project_id(task_id))
  );

CREATE POLICY "assignments_delete"
  ON public.assignments FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR public.is_task_creator(task_id)
    OR public.is_project_owner(public.get_task_project_id(task_id))
  );

-- ============================================================
-- PASSO 13: POLÍTICAS DE TASK_LABELS
-- ============================================================

CREATE POLICY "task_labels_select"
  ON public.task_labels FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_task_creator(task_id)
    OR label_id IN (SELECT id FROM public.labels WHERE owner_id = auth.uid())
  );

CREATE POLICY "task_labels_insert"
  ON public.task_labels FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.is_task_creator(task_id)
  );

CREATE POLICY "task_labels_delete"
  ON public.task_labels FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR public.is_task_creator(task_id)
  );

-- ============================================================
-- PASSO 14: POLÍTICAS OPCIONAIS (integrations, ai_agent_settings, chat_messages)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'integrations') THEN
    EXECUTE 'CREATE POLICY "integrations_isolation" ON public.integrations FOR ALL TO authenticated USING (public.is_admin() OR user_id = auth.uid()) WITH CHECK (public.is_admin() OR user_id = auth.uid())';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_agent_settings') THEN
    EXECUTE 'CREATE POLICY "ai_settings_isolation" ON public.ai_agent_settings FOR ALL TO authenticated USING (public.is_admin() OR user_id = auth.uid()) WITH CHECK (public.is_admin() OR user_id = auth.uid())';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
    EXECUTE 'CREATE POLICY "chat_messages_isolation" ON public.chat_messages FOR ALL TO authenticated USING (public.is_admin() OR user_id = auth.uid()) WITH CHECK (public.is_admin() OR user_id = auth.uid())';
  END IF;
END $$;

-- ============================================================
-- PASSO 15: CORRIGIR TRIGGER DE NOVOS USUÁRIOS
-- ============================================================
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
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir trigger ativo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Remover trigger de Inbox automático (usuários começam vazios)
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- ============================================================
-- VERIFICAÇÃO FINAL: confirmar que admin está correto
-- ============================================================
UPDATE public.profiles SET role = 'admin' WHERE email = 'igoorstraviinsky@gmail.com';

-- ============================================================
-- PRONTO. Aplicar e recarregar a aplicação.
-- ============================================================
