-- ============================================================
-- Migration: Auto-create public.users row on auth user insert
-- ============================================================
-- Context: Supabase's signUp() with email confirmation returns a
-- placeholder user ID before the email is verified. The /api/register
-- API call at signup time is skipped because getUserById() returns 404.
-- This trigger fires the moment the real auth.users row is inserted
-- (on email confirmation) and creates the public.users profile row.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Read the role from metadata saved during signUp()
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'JOB_SEEKER');

  -- Ensure the role value is valid; fall back to JOB_SEEKER otherwise
  IF v_role NOT IN ('ADMIN', 'EMPLOYER', 'JOB_SEEKER') THEN
    v_role := 'JOB_SEEKER';
  END IF;

  -- Insert into public.users (skip if already exists)
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, v_role::public.user_role)
  ON CONFLICT (id) DO NOTHING;

  -- Create the role-specific profile row
  IF v_role = 'JOB_SEEKER' THEN
    INSERT INTO public.job_seekers (id, full_name, location)
    VALUES (
      NEW.id,
      COALESCE(split_part(NEW.email, '@', 1), ''),
      'To be updated'
    )
    ON CONFLICT (id) DO NOTHING;

  ELSIF v_role = 'EMPLOYER' THEN
    INSERT INTO public.employers (id, company_name, industry, location, status, recruiter_verified)
    VALUES (
      NEW.id,
      'New Company',
      'To be updated',
      'To be updated',
      'PENDING',
      FALSE
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop if it already exists to make this migration re-runnable
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================
-- Backfill: Create public.users rows for any existing auth
-- users that are already confirmed but missing a profile row.
-- Run this once after applying the migration.
-- ============================================================
INSERT INTO public.users (id, email, role)
SELECT
  au.id,
  au.email,
  COALESCE(
    CASE
      WHEN au.raw_user_meta_data->>'role' IN ('ADMIN', 'EMPLOYER', 'JOB_SEEKER')
      THEN (au.raw_user_meta_data->>'role')::public.user_role
      ELSE 'JOB_SEEKER'::public.user_role
    END,
    'JOB_SEEKER'::public.user_role
  )
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
AND au.confirmed_at IS NOT NULL;

-- Backfill job_seeker rows for confirmed JOB_SEEKER auth users with no profile
INSERT INTO public.job_seekers (id, full_name, location)
SELECT
  u.id,
  COALESCE(split_part(u.email, '@', 1), ''),
  'To be updated'
FROM public.users u
WHERE u.role = 'JOB_SEEKER'
AND NOT EXISTS (
  SELECT 1 FROM public.job_seekers js WHERE js.id = u.id
);

-- Backfill employer rows for confirmed EMPLOYER auth users with no profile
INSERT INTO public.employers (id, company_name, industry, location, status, recruiter_verified)
SELECT
  u.id,
  'New Company',
  'To be updated',
  'To be updated',
  'PENDING',
  FALSE
FROM public.users u
WHERE u.role = 'EMPLOYER'
AND NOT EXISTS (
  SELECT 1 FROM public.employers e WHERE e.id = u.id
);
