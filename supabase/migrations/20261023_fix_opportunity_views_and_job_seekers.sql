-- Migration: Fix opportunity_views.created_at column and job_seekers.full_name not-null constraint
--
-- Fixes PostgreSQL errors:
-- 1. "column opportunity_views.created_at does not exist" (status 42703)
-- 2. "null value in column \"full_name\" of relation \"job_seekers\" violates not-null constraint" (status 23502)

-- =============================================================================
-- 1. Fix opportunity_views: add created_at column and backfill from viewed_at
-- =============================================================================

ALTER TABLE public.opportunity_views
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.opportunity_views
    SET created_at = viewed_at
    WHERE created_at IS NULL;

ALTER TABLE public.opportunity_views
    ALTER COLUMN created_at SET NOT NULL;

-- =============================================================================
-- 2. Fix job_seekers: add default to full_name so partial inserts/upserts succeed
-- =============================================================================

ALTER TABLE public.job_seekers
    ALTER COLUMN full_name SET DEFAULT 'Job Seeker';

-- Backfill any existing rows with null or whitespace-only full_name
UPDATE public.job_seekers
    SET full_name = 'Job Seeker'
    WHERE full_name IS NULL OR TRIM(full_name) = '';

-- =============================================================================
-- 3. Update handle_new_auth_user() to safely handle missing email / metadata
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_full_name TEXT;
  v_slug_base TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'JOB_SEEKER');
  IF v_role NOT IN ('ADMIN', 'EMPLOYER', 'JOB_SEEKER') THEN
    v_role := 'JOB_SEEKER';
  END IF;

  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, COALESCE(NEW.email, ''), v_role::public.user_role)
  ON CONFLICT (id) DO NOTHING;

  IF v_role = 'JOB_SEEKER' THEN
    v_full_name := COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      NULLIF(split_part(NEW.email, '@', 1), ''),
      'Job Seeker'
    );

    v_slug_base := lower(regexp_replace(regexp_replace(v_full_name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'));
    IF v_slug_base = '' THEN
      v_slug_base := 'candidate';
    END IF;

    INSERT INTO public.job_seekers (id, full_name, location, public_slug)
    VALUES (
      NEW.id,
      v_full_name,
      'To be updated',
      v_slug_base || '-' || left(replace(NEW.id::text, '-', ''), 8)
    )
    ON CONFLICT (id) DO NOTHING;

  ELSIF v_role = 'EMPLOYER' THEN
    INSERT INTO public.employers (id, company_name, industry, location, status, recruiter_verified)
    VALUES (NEW.id, 'New Company', 'To be updated', 'To be updated', 'PENDING', FALSE)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
