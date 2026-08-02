-- Add retention reminder timestamps to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_profile_reminder_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_inactivity_reminder_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Also add viewed_at to job_seekers and employers if they don't exist
ALTER TABLE public.job_seekers
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

ALTER TABLE public.employers
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
