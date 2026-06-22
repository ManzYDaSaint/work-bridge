-- Job Alerts table for Saved Searches
-- Allows seekers to save their search criteria and receive automated alerts

CREATE TABLE IF NOT EXISTS public.job_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Search criteria
  keywords TEXT,           -- E.g., 'software engineer', 'marketing'
  location TEXT,           -- E.g., 'Lilongwe', 'Remote'
  job_type TEXT,           -- E.g., 'FULL_TIME', 'CONTRACT'
  work_mode TEXT,          -- E.g., 'REMOTE', 'HYBRID', 'ON_SITE'
  
  -- Settings
  frequency TEXT DEFAULT 'WEEKLY' NOT NULL CHECK (frequency IN ('DAILY', 'WEEKLY')),
  last_run_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  
  -- Prevent exact duplicate alerts for the same user
  UNIQUE NULLS NOT DISTINCT (user_id, keywords, location, job_type, work_mode)
);

ALTER TABLE public.job_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seekers view own alerts"
  ON public.job_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Seekers manage own alerts"
  ON public.job_alerts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins full access to alerts"
  ON public.job_alerts FOR ALL
  USING (public.is_admin());

-- Index for the cron job to find alerts that need running based on frequency
CREATE INDEX IF NOT EXISTS job_alerts_frequency_last_run_idx
  ON public.job_alerts (frequency, last_run_at);
