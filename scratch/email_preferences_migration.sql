-- Migration: Add email preferences to users table
ALTER TABLE public.users 
ADD COLUMN email_preferences JSONB DEFAULT '{"marketing": true, "job_alerts": true, "application_updates": true, "weekly_digest": true}'::jsonb;

-- Update existing rows that might have null values to ensure they receive emails by default
UPDATE public.users 
SET email_preferences = '{"marketing": true, "job_alerts": true, "application_updates": true, "weekly_digest": true}'::jsonb 
WHERE email_preferences IS NULL;
