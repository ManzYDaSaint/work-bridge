-- Add last_resume_reminder_at timestamp to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_resume_reminder_at TIMESTAMP WITH TIME ZONE;
