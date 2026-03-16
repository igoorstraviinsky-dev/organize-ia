-- ============================================================
-- Migration: approval flow for public signups
-- Run this in the Supabase SQL Editor on the current database.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status TEXT;

ALTER TABLE public.profiles
  ALTER COLUMN approval_status SET DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND constraint_name = 'profiles_approval_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_approval_status_check
      CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

INSERT INTO public.profiles (id, full_name, email, role, approval_status)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  u.email,
  CASE
    WHEN u.email = 'igoorstraviinsky@gmail.com' THEN 'admin'
    ELSE 'collaborator'
  END,
  CASE
    WHEN u.email = 'igoorstraviinsky@gmail.com' THEN 'approved'
    ELSE 'pending'
  END
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = COALESCE(public.profiles.role, EXCLUDED.role),
    approval_status = COALESCE(public.profiles.approval_status, EXCLUDED.approval_status);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
