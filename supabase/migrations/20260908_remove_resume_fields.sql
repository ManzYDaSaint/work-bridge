-- Remove resume-related data from job seekers and reminder tracking.
-- This drops the obsolete resume attachment field and the reminder timestamp used only for resume nudges.

ALTER TABLE public.job_seekers
  DROP COLUMN IF EXISTS resume_url;

ALTER TABLE public.users
  DROP COLUMN IF EXISTS last_resume_reminder_at;

-- Optional cleanup: remove the old storage bucket references from code and app logic has already been removed.
