BEGIN;

-- Add screening columns to applications table
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS screening_answers JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS screening_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS screening_summary TEXT,
  ADD COLUMN IF NOT EXISTS screening_breakdown JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS meets_required_criteria BOOLEAN DEFAULT FALSE;

COMMIT;

-- Reload postgrest schema cache
NOTIFY pgrst, reload_schema;
