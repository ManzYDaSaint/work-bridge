BEGIN;

-- Ensure minimum_years_experience exists (resolves the PGRST204 cache/schema error)
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS qualification TEXT,
  ADD COLUMN IF NOT EXISTS must_have_skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS nice_to_have_skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS minimum_years_experience INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS screening_questions JSONB DEFAULT '[]'::jsonb;

-- Add qualification to job_seekers to enable matching
ALTER TABLE public.job_seekers
  ADD COLUMN IF NOT EXISTS qualification TEXT;

COMMIT;

-- Reload postgrest schema cache just in case
NOTIFY pgrst, reload_schema;
