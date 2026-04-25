-- Add Talent Marketplace fields to job_seekers table

BEGIN;

ALTER TABLE public.job_seekers
  ADD COLUMN IF NOT EXISTS search_intent TEXT DEFAULT 'ACTIVELY_LOOKING',
  ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'HIDDEN',
  ADD COLUMN IF NOT EXISTS portfolio_links TEXT[] DEFAULT '{}';

-- Create indexes for employer discoverability queries
CREATE INDEX IF NOT EXISTS idx_job_seekers_visibility ON public.job_seekers(profile_visibility);
CREATE INDEX IF NOT EXISTS idx_job_seekers_intent ON public.job_seekers(search_intent);

COMMIT;
