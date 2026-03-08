-- ============================================
-- FINAL FIX: Security, Default Roles and Data Isolation
-- ============================================

-- 1. Fix Default Role in Profiles
-- Change default from 'admin' to 'collaborator' to ensure new users are restricted by default.
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'collaborator';

-- 2. Update existing users (Optional but recommended: ensure everyone is restricted unless they are the known admin)
-- Replace 'igoorstraviinsky@gmail.com' with the actual admin email if different.
UPDATE public.profiles 
SET role = 'collaborator' 
WHERE email != 'igoorstraviinsky@gmail.com' OR email IS NULL;

-- 3. Secure 'profiles' table RLS
-- Users should not be able to change their own 'role' column.
-- We recreate the policies to be more explicit.

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Anyone can see basic profile info (required for collaboration)
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own non-sensitive fields
CREATE POLICY "Users can update own profile fields"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND (
      -- Ensure 'role' is not being changed by a non-admin
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
      OR 
      -- If not admin, the new role must be the same as the old role
      role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    )
  );

-- 4. Secure 'projects' table RLS
DROP POLICY IF EXISTS "Select projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects" ON public.projects;

CREATE POLICY "Project isolation policy"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR auth.uid() = owner_id
    OR id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin full project access"
  ON public.projects FOR ALL
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 5. Secure 'tasks' table RLS
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Tasks visibility policy" ON public.tasks;

CREATE POLICY "Task isolation policy"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR creator_id = auth.uid()
    OR id IN (SELECT task_id FROM public.assignments WHERE user_id = auth.uid())
    OR project_id IN (
      SELECT id FROM public.projects 
      WHERE owner_id = auth.uid() 
      OR id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    )
  );

-- 6. Disable the default project creation trigger if still active
-- This ensures that new users don't get an "Inbox" unless the app explicitly creates it (or it's desired to be truly empty).
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
-- Note: If we want to keep the trigger but make it empty, we would modify public.create_default_project().
-- For now, as per request "vire vazio", we disable it.
