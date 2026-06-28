ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'WITHDRAWN';
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.employers ADD COLUMN IF NOT EXISTS default_scheduling_link TEXT;
