-- ============================================
-- SUPER LOCKDOWN: Final Data Isolation & RLS Enforcement
-- ============================================

-- 1. ENFORCE RLS ON ALL TABLES
-- Even if policies exist, they are ignored if RLS is not ENABLED.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- 2. CLEAN UP ALL EXISTING POLICIES (Start from scratch to avoid hidden 'allow all' policies)
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 3. PROFILES POLICIES
CREATE POLICY "Public profiles are viewable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile except role" ON public.profiles
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND (
      -- Admin can change any role
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
      OR 
      -- Regular users can only keep their current role
      role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    )
  );

-- 4. PROJECTS POLICIES (The critical fix)
CREATE POLICY "Projects isolation" ON public.projects
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR owner_id = auth.uid()
    OR id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
  );

-- 5. TASKS POLICIES
CREATE POLICY "Tasks isolation" ON public.tasks
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR creator_id = auth.uid()
    OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
    OR id IN (SELECT task_id FROM public.assignments WHERE user_id = auth.uid())
  );

-- 6. SECTIONS, LABELS, ETC.
CREATE POLICY "Sections isolation" ON public.sections
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

CREATE POLICY "Labels isolation" ON public.labels
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR owner_id = auth.uid()
  );

-- 7. MEMBERSHIPS AND ASSIGNMENTS
CREATE POLICY "Project members isolation" ON public.project_members
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR user_id = auth.uid()
  );

CREATE POLICY "Task labels isolation" ON public.task_labels
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR task_id IN (SELECT id FROM public.tasks WHERE creator_id = auth.uid())
  );

CREATE POLICY "Assignments isolation" ON public.assignments
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR user_id = auth.uid()
    OR task_id IN (SELECT id FROM public.tasks WHERE creator_id = auth.uid())
  );

-- 7. ENSURE ROLES ARE CORRECT
-- Fix the admin (identify by email)
UPDATE public.profiles SET role = 'admin' WHERE email = 'igoorstraviinsky@gmail.com';
-- Everyone else is a collaborator by default
UPDATE public.profiles SET role = 'collaborator' WHERE email != 'igoorstraviinsky@gmail.com' OR email IS NULL;
-- Set default for future ones
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'collaborator';

-- 8. DISABLE THE CREATE_DEFAULT_PROJECT TRIGGER (if it exists)
-- This stops the creation of an "Inbox" for every new user.
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- 9. RE-ENFORCE THAT OWNER_ID MUST MATCH AUTH.UID() ON INSERT
-- (Optional but safer)
-- CREATE POLICY "Enforce ownership on insert" ON public.projects FOR INSERT WITH CHECK (owner_id = auth.uid());
