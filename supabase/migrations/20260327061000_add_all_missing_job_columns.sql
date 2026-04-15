BEGIN;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS work_mode TEXT DEFAULT 'REMOTE' CHECK (work_mode IN ('REMOTE', 'HYBRID', 'ON_SITE')),
  ADD COLUMN IF NOT EXISTS salary_range TEXT,
  ADD COLUMN IF NOT EXISTS deadline DATE;

COMMIT;

-- Reload postgrest schema cache
NOTIFY pgrst, reload_schema;
