-- Add last_alert_sent_at column to jobs table for cron job expiration alerts

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS last_alert_sent_at TIMESTAMP WITH TIME ZONE;
