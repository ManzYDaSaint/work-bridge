-- Drop the obsolete portfolio_links field from job seeker profiles.
-- This matches the UI removal and prevents stale profile data from being written/read.

ALTER TABLE public.job_seekers
  DROP COLUMN IF EXISTS portfolio_links;
