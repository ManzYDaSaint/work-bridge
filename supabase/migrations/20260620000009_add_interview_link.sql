-- Add interview_link to applications table
-- Allows employers to provide a Calendly/Google Meet link when moving a candidate to INTERVIEWING status.

ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS interview_link TEXT;
