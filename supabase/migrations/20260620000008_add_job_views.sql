-- Job Views table for Analytics
-- Tracks impressions/views on job postings so employers can see performance.

CREATE TABLE IF NOT EXISTS public.job_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  
  -- Optional: track who viewed it (if logged in)
  viewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Prevent spamming by tracking session or IP hash (anonymized)
  session_hash TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Index for fast aggregation by job and date
CREATE INDEX IF NOT EXISTS job_views_job_id_created_at_idx
  ON public.job_views (job_id, created_at);

-- RLS: Employers can only view stats for their own jobs
ALTER TABLE public.job_views ENABLE ROW LEVEL SECURITY;

-- Allow insert from anyone (public endpoint will use service key or anon key, 
-- but we want an RPC or API route to handle it safely to avoid client abuse).
-- We'll allow insert via an API route using the service role to ensure session_hash is set securely.

CREATE POLICY "Employers view own job views"
  ON public.job_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_views.job_id
      AND jobs.employer_id = auth.uid()
    )
  );

CREATE POLICY "Admins full access to job views"
  ON public.job_views FOR ALL
  USING (public.is_admin());

-- RPC function to increment views safely, ensuring we don't spam the DB.
-- We can do a basic insert. The API route will handle the hashing/rate limiting.
