-- Migration: Add guest application support to public.applications
-- Allows unauthenticated / unregistered job seekers to apply via the single-page application form.

ALTER TABLE public.applications
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS is_guest_application BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS guest_full_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS guest_phone TEXT,
  ADD COLUMN IF NOT EXISTS resume_url TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Drop foreign key strictness if necessary or ensure nullable user_id is allowed
-- Note: applications_job_id_user_id_key unique constraint must only apply when user_id is NOT NULL
ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_job_id_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_registered_unique 
  ON public.applications (job_id, user_id) 
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_guest_unique 
  ON public.applications (job_id, LOWER(guest_email)) 
  WHERE is_guest_application = TRUE AND guest_email IS NOT NULL;

-- Policy to allow anonymous/guest inserts into applications
DROP POLICY IF EXISTS "Allow public guest applications" ON public.applications;
CREATE POLICY "Allow public guest applications" 
  ON public.applications 
  FOR INSERT 
  WITH CHECK (is_guest_application = TRUE AND user_id IS NULL);
