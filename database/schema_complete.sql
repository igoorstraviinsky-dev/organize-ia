-- ============================================================
-- SCHEMA COMPLETO — Organizador (Supabase/PostgreSQL)
-- Arquivo unico e autoritativo. Substitui todos os anteriores.
-- Aplique no SQL Editor do Supabase. Preserva dados existentes.
-- ============================================================

-- ============================================================
-- PARTE 1: GARANTIR COLUNAS AUSENTES NAS TABELAS EXISTENTES
-- ============================================================

-- profiles: adicionar colunas que podem nao existir
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone       TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url  TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role        TEXT DEFAULT 'collaborator';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT now();

-- role constraint (adiciona apenas se nao existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND constraint_name = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'collaborator'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND constraint_name = 'profiles_approval_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_approval_status_check
      CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- sections: garantir existencia antes de tasks referenciar
CREATE TABLE IF NOT EXISTS public.sections (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  position   INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
ALTER TABLE public.sections ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- tasks: colunas que evolucao do schema pode nao ter criado
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_time   TIME;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_id  UUID REFERENCES public.tasks(id)    ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS position   INTEGER DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- chat_messages: colunas de midia que o frontend usa
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text'
  CHECK (message_type IN ('text', 'audio', 'image', 'document'));
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS media_url TEXT;

-- integrations: ampliar constraint de provider
ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_provider_check;
ALTER TABLE public.integrations
  ADD CONSTRAINT integrations_provider_check
  CHECK (provider IN ('uazapi', 'whatsapp_cloud', 'telegram', 'agent_n8n'));

-- ============================================================
-- PARTE 2: CRIAR TABELAS QUE POSSAM NAO EXISTIR
-- ============================================================

-- labels
CREATE TABLE IF NOT EXISTS public.labels (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  color      TEXT DEFAULT '#6366f1',
  owner_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- task_labels
CREATE TABLE IF NOT EXISTS public.task_labels (
  id       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id  UUID NOT NULL REFERENCES public.tasks(id)   ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.labels(id)  ON DELETE CASCADE,
  UNIQUE(task_id, label_id)
);

-- project_members
CREATE TABLE IF NOT EXISTS public.project_members (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(project_id, user_id)
);

-- integrations
CREATE TABLE IF NOT EXISTS public.integrations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL CHECK (provider IN ('uazapi', 'whatsapp_cloud', 'telegram', 'agent_n8n')),
  instance_name TEXT,
  api_url       TEXT,
  api_token     TEXT,
  phone_number_id TEXT,
  waba_id       TEXT,
  access_token  TEXT,
  webhook_url   TEXT,
  status        TEXT DEFAULT 'disconnected'
                CHECK (status IN ('connected', 'disconnected', 'connecting', 'error')),
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, provider)
);

-- chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES public.integrations(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone          TEXT NOT NULL,
  contact_name   TEXT,
  direction      TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  body           TEXT NOT NULL,
  message_id     TEXT,
  status         TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  message_type   TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'audio', 'image', 'document')),
  media_url      TEXT,
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- whatsapp_users
CREATE TABLE IF NOT EXISTS public.whatsapp_users (
  phone     TEXT PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- ai_agent_settings
CREATE TABLE IF NOT EXISTS public.ai_agent_settings (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  only_collaborators BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- ============================================================
-- PARTE 3: INDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_creator    ON public.tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project    ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_section    ON public.tasks(section_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent     ON public.tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status     ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date   ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_task ON public.assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON public.assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner   ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_sections_project ON public.sections(project_id);
CREATE INDEX IF NOT EXISTS idx_labels_owner     ON public.labels(owner_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user    ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_user ON public.integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user    ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_phone   ON public.chat_messages(phone);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_user   ON public.whatsapp_users(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_messages_message_id
  ON public.chat_messages(message_id) WHERE message_id IS NOT NULL;

-- ============================================================
-- PARTE 4: HABILITAR RLS EM TODAS AS TABELAS
-- ============================================================
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labels         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_labels    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PARTE 5: REMOVER TODAS AS POLITICAS EXISTENTES
-- ============================================================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN (
    SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ============================================================
-- PARTE 6: FUNCOES SECURITY DEFINER (quebram toda recursao circular)
-- ============================================================

-- Verifica se o usuario atual e admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Verifica se o usuario atual e membro de um projeto
CREATE OR REPLACE FUNCTION public.is_project_member(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_id AND user_id = auth.uid()
  );
END;
$$;

-- Verifica se o usuario atual e dono de um projeto
CREATE OR REPLACE FUNCTION public.is_project_owner(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects WHERE id = p_id AND owner_id = auth.uid()
  );
END;
$$;

-- Verifica se o usuario atual esta atribuido a uma tarefa
-- (usado em tasks RLS para evitar recursao com assignments RLS)
CREATE OR REPLACE FUNCTION public.is_task_assignee(t_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.assignments WHERE task_id = t_id AND user_id = auth.uid()
  );
END;
$$;

-- Verifica se o usuario atual criou uma tarefa
-- (usado em assignments/task_labels RLS para evitar recursao com tasks RLS)
CREATE OR REPLACE FUNCTION public.is_task_creator(t_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tasks WHERE id = t_id AND creator_id = auth.uid()
  );
END;
$$;

-- Retorna o project_id de uma tarefa sem passar por RLS
CREATE OR REPLACE FUNCTION public.get_task_project_id(t_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
BEGIN
  RETURN (SELECT project_id FROM public.tasks WHERE id = t_id);
END;
$$;

-- Verifica se o usuario tem tarefas atribuidas em um projeto
-- (usado em projects RLS para mostrar o projeto ao usuario atribuido)
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

GRANT EXECUTE ON FUNCTION public.is_admin()                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_owner(uuid)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_task_assignee(uuid)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_task_creator(uuid)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_task_project_id(uuid)          TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_assigned_tasks_in_project(uuid) TO authenticated;

-- ============================================================
-- PARTE 7: POLITICAS RLS — SEM RECURSAO CIRCULAR
-- ============================================================

-- ---- PROFILES ----
-- Todos autenticados podem ver todos os perfis (necessario para colaboracao)
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT TO authenticated USING (true);

-- Usuario so atualiza o proprio perfil; role so muda se for admin
CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      public.is_admin()
      OR (
        role = (SELECT role FROM public.profiles WHERE id = auth.uid())
        AND approval_status = (SELECT approval_status FROM public.profiles WHERE id = auth.uid())
      )
    )
  );

-- ---- PROJECTS ----
CREATE POLICY "projects_select"
  ON public.projects FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR owner_id = auth.uid()
    OR public.is_project_member(id)
    OR public.has_assigned_tasks_in_project(id)
  );

CREATE POLICY "projects_insert"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "projects_update"
  ON public.projects FOR UPDATE TO authenticated
  USING  (public.is_admin() OR owner_id = auth.uid())
  WITH CHECK (public.is_admin() OR owner_id = auth.uid());

CREATE POLICY "projects_delete"
  ON public.projects FOR DELETE TO authenticated
  USING (public.is_admin() OR owner_id = auth.uid());

-- ---- SECTIONS ----
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
    OR public.is_project_member(project_id)
  );

CREATE POLICY "sections_update"
  ON public.sections FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_project_owner(project_id));

CREATE POLICY "sections_delete"
  ON public.sections FOR DELETE TO authenticated
  USING (public.is_admin() OR public.is_project_owner(project_id));

-- ---- TASKS ----
-- is_task_assignee() consulta assignments via SECURITY DEFINER — sem recursao
CREATE POLICY "tasks_select"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR creator_id = auth.uid()
    OR public.is_project_owner(project_id)
    OR public.is_project_member(project_id)
    OR public.is_task_assignee(id)
  );

CREATE POLICY "tasks_insert"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid() OR public.is_admin());

CREATE POLICY "tasks_update"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR creator_id = auth.uid()
    OR public.is_project_owner(project_id)
    OR public.is_project_member(project_id)
    OR public.is_task_assignee(id)
  );

CREATE POLICY "tasks_delete"
  ON public.tasks FOR DELETE TO authenticated
  USING (public.is_admin() OR creator_id = auth.uid());

-- ---- LABELS ----
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

-- ---- TASK_LABELS ----
-- is_task_creator() consulta tasks via SECURITY DEFINER — sem recursao com tasks RLS
CREATE POLICY "task_labels_select"
  ON public.task_labels FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR public.is_task_creator(task_id)
    OR label_id IN (SELECT id FROM public.labels WHERE owner_id = auth.uid())
  );

CREATE POLICY "task_labels_insert"
  ON public.task_labels FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.is_task_creator(task_id));

CREATE POLICY "task_labels_delete"
  ON public.task_labels FOR DELETE TO authenticated
  USING (public.is_admin() OR public.is_task_creator(task_id));

-- ---- ASSIGNMENTS ----
-- is_task_creator() e get_task_project_id() bypassam RLS de tasks — sem recursao
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

-- ---- PROJECT_MEMBERS ----
CREATE POLICY "project_members_select"
  ON public.project_members FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR public.is_project_owner(project_id)
  );

CREATE POLICY "project_members_insert"
  ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.is_project_owner(project_id));

CREATE POLICY "project_members_delete"
  ON public.project_members FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR public.is_project_owner(project_id)
  );

-- ---- INTEGRATIONS ----
CREATE POLICY "integrations_all"
  ON public.integrations FOR ALL TO authenticated
  USING  (public.is_admin() OR user_id = auth.uid())
  WITH CHECK (public.is_admin() OR user_id = auth.uid());

-- ---- CHAT_MESSAGES ----
-- Acesso aberto para service_role (agente Python) e usuario dono
CREATE POLICY "chat_messages_select"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "chat_messages_insert"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (true); -- webhook do agente insere com service_role

-- ---- WHATSAPP_USERS ----
-- Acessado apenas pelo agente (service_role bypassa RLS automaticamente)
-- Politica para autenticados verem os proprios vinculamentos
CREATE POLICY "whatsapp_users_select"
  ON public.whatsapp_users FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

-- ---- AI_AGENT_SETTINGS ----
CREATE POLICY "ai_agent_settings_all"
  ON public.ai_agent_settings FOR ALL TO authenticated
  USING  (public.is_admin() OR user_id = auth.uid())
  WITH CHECK (public.is_admin() OR user_id = auth.uid());

-- ============================================================
-- PARTE 8: FUNCOES E TRIGGERS
-- ============================================================

-- Funcao generica de updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Funcao de criacao de perfil no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, approval_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE
      WHEN NEW.email = 'igoorstraviinsky@gmail.com' THEN 'admin'
      ELSE 'collaborator'
    END,
    CASE
      WHEN NEW.email = 'igoorstraviinsky@gmail.com' THEN 'approved'
      ELSE 'pending'
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger: criar perfil ao registrar usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: auto-update updated_at em profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger: auto-update updated_at em projects
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger: auto-update updated_at em tasks
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger: auto-update updated_at em integrations
DROP TRIGGER IF EXISTS update_integrations_updated_at ON public.integrations;
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger: auto-update updated_at em ai_agent_settings
DROP TRIGGER IF EXISTS update_ai_agent_settings_updated_at ON public.ai_agent_settings;
CREATE TRIGGER update_ai_agent_settings_updated_at
  BEFORE UPDATE ON public.ai_agent_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- REMOVER trigger de criacao automatica de Inbox (usuarios comecam vazios)
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- ============================================================
-- PARTE 9: CORRIGIR DADOS DE ROLE
-- ============================================================
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'collaborator';
ALTER TABLE public.profiles ALTER COLUMN approval_status SET DEFAULT 'pending';

UPDATE public.profiles SET role = 'admin'
  WHERE email = 'igoorstraviinsky@gmail.com';

UPDATE public.profiles SET role = 'collaborator'
  WHERE role IS NULL OR role NOT IN ('admin', 'collaborator');

UPDATE public.profiles
SET approval_status = 'approved'
WHERE email = 'igoorstraviinsky@gmail.com';

UPDATE public.profiles p
SET approval_status = CASE
  WHEN p.role = 'admin' THEN 'approved'
  WHEN EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.user_id = p.id) THEN 'approved'
  WHEN EXISTS (SELECT 1 FROM public.tasks t WHERE t.creator_id = p.id) THEN 'approved'
  WHEN EXISTS (SELECT 1 FROM public.assignments a WHERE a.user_id = p.id) THEN 'approved'
  WHEN EXISTS (SELECT 1 FROM public.integrations i WHERE i.user_id = p.id) THEN 'approved'
  ELSE 'pending'
END
WHERE p.approval_status IS NULL
   OR p.approval_status NOT IN ('pending', 'approved', 'rejected');

-- ============================================================
-- PARTE 10: REALTIME — habilitar publicacao nas tabelas necessarias
-- ============================================================
DO $$
BEGIN
  -- tasks
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
  -- assignments
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
  END IF;
  -- sections
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'sections'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sections;
  END IF;
  -- labels
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'labels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.labels;
  END IF;
  -- task_labels
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'task_labels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_labels;
  END IF;
  -- projects
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
  END IF;
  -- project_members
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'project_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_members;
  END IF;
  -- chat_messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;

-- ============================================================
-- PARTE 11: STORAGE — bucket de avatares
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Remover politicas antigas do storage para recriar limpo
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN (
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname IN (
        'Avatares sao publicos',
        'Usuarios podem fazer upload de novos avatares',
        'Usuarios podem atualizar seus proprios avatares',
        'avatar_public_select',
        'avatar_auth_insert',
        'avatar_auth_update'
      )
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "avatar_public_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatar_auth_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatar_auth_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- CONCLUIDO. Execute e recarregue a aplicacao.
-- Verificacao: SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
-- ============================================================
