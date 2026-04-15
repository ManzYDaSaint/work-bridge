BEGIN;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS must_have_skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS nice_to_have_skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS screening_questions JSONB DEFAULT '[]'::jsonb;

COMMIT;

-- Reload postgrest schema cache
NOTIFY pgrst, reload_schema;
