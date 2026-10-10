-- Migration: Add missing updated_at columns to job_seekers and jobs tables.
-- 
-- Fixes PostgreSQL errors:
-- 1. "column job_seekers.updated_at does not exist" (status 42703)
-- 2. "column jobs.updated_at does not exist" (status 42703)

-- 1. Add updated_at column to job_seekers
ALTER TABLE public.job_seekers
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- 2. Add updated_at column to jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- 3. Create or reuse generic update_updated_at_column function & attach triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc'::text, now());
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_job_seekers_updated_at ON public.job_seekers;
CREATE TRIGGER update_job_seekers_updated_at
  BEFORE UPDATE ON public.job_seekers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
