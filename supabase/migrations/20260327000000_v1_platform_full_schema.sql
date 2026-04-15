-- WorkBridge v1 delta migration
-- This file is intentionally "changes only" relative to supabase/schema.sql.

BEGIN;

-- Employer billing/account lifecycle fields.
ALTER TABLE public.employers
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS recruiter_verified BOOLEAN DEFAULT FALSE;

-- Job alert scheduling field.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS last_alert_sent_at TIMESTAMP WITH TIME ZONE;

-- Seeker preference fields used in onboarding/search.
ALTER TABLE public.job_seekers
  ADD COLUMN IF NOT EXISTS preferred_work_modes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_job_types TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_locations TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_skills TEXT[] DEFAULT '{}';

-- User onboarding completion marker.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Expand jobs.status to include ARCHIVED (app currently uses this status).
DO $$
DECLARE
    constraint_name RECORD;
BEGIN
    FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.jobs'::regclass AND contype = 'c' AND conname LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE public.jobs DROP CONSTRAINT ' || quote_ident(constraint_name.conname);
    END LOOP;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.jobs'::regclass
        AND conname = 'jobs_status_check'
    ) THEN
      ALTER TABLE public.jobs
        ADD CONSTRAINT jobs_status_check
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'EXPIRED', 'FILLED', 'ARCHIVED'));
    END IF;
END $$;

-- Trust & safety tables.
CREATE TABLE IF NOT EXISTS public.trust_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  target_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  context_type TEXT,
  context_id UUID,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.trust_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.trust_reports'::regclass
      AND polname = 'Users can insert own trust reports'
  ) THEN
    CREATE POLICY "Users can insert own trust reports" ON public.trust_reports
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  blocked_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, blocked_user_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.user_blocks'::regclass
      AND polname = 'Users can manage own block list'
  ) THEN
    CREATE POLICY "Users can manage own block list" ON public.user_blocks
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Product funnel/event tracking.
CREATE TABLE IF NOT EXISTS public.product_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_id TEXT,
  role TEXT,
  event_name TEXT NOT NULL,
  stage TEXT,
  variant TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.product_events'::regclass
      AND polname = 'Service role manages product events'
  ) THEN
    CREATE POLICY "Service role manages product events" ON public.product_events
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_product_events_stage_created_at'
  ) THEN
    CREATE INDEX idx_product_events_stage_created_at ON public.product_events(stage, created_at DESC);
  END IF;
END $$;

-- Transactions policies (table exists in schema.sql, policies are added here).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.transactions'::regclass
      AND polname = 'Users can view their own transactions'
  ) THEN
    CREATE POLICY "Users can view their own transactions"
      ON public.transactions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.transactions'::regclass
      AND polname = 'Users can insert their own transactions'
  ) THEN
    CREATE POLICY "Users can insert their own transactions"
      ON public.transactions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.transactions'::regclass
      AND polname = 'Service role can manage all transactions'
  ) THEN
    CREATE POLICY "Service role can manage all transactions"
      ON public.transactions FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Authenticated seeker read policies.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.jobs'::regclass
      AND polname = 'Authenticated users can view active jobs'
  ) THEN
    CREATE POLICY "Authenticated users can view active jobs" ON public.jobs
      FOR SELECT TO authenticated USING (status = 'ACTIVE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.employers'::regclass
      AND polname = 'Authenticated users can view employer basic info'
  ) THEN
    CREATE POLICY "Authenticated users can view employer basic info" ON public.employers
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Company logo storage bucket and policies.
INSERT INTO storage.buckets (id, name, public)
VALUES ('company_logos', 'company_logos', true)
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access'
  ) THEN
    CREATE POLICY "Public Access" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'company_logos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Employers can upload logos'
  ) THEN
    CREATE POLICY "Employers can upload logos" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'company_logos' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Employers can update logos'
  ) THEN
    CREATE POLICY "Employers can update logos" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'company_logos' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Employers can delete logos'
  ) THEN
    CREATE POLICY "Employers can delete logos" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'company_logos' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

-- Cleanup for legacy artifacts if present.
DROP TABLE IF EXISTS public.notes CASCADE;
ALTER TABLE public.certificates
  DROP COLUMN IF EXISTS verification_confidence,
  DROP COLUMN IF EXISTS verification_summary;

COMMIT;
