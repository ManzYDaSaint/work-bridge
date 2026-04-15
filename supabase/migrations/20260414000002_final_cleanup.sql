-- Purge Messaging and Resume features legacy data structures
BEGIN;

-- 1. Drop Messaging Tables
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;

-- 2. Clean up Job Seekers
ALTER TABLE public.job_seekers 
  DROP COLUMN IF EXISTS resume_url;

-- 3. Clean up Employers
ALTER TABLE public.employers
  DROP COLUMN IF EXISTS application_alerts,
  DROP COLUMN IF EXISTS hiring_velocity,
  DROP COLUMN IF EXISTS candidate_privacy;

COMMIT;

-- Reload postgrest schema cache
NOTIFY pgrst, reload_schema;
