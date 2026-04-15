-- Account close requests: stores employer reasons for wanting to delete their account
CREATE TABLE IF NOT EXISTS public.account_close_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT,
  reasons TEXT[] NOT NULL DEFAULT '{}',
  additional_notes TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | REVIEWED | ACTIONED
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.account_close_requests ENABLE ROW LEVEL SECURITY;

-- Employers can submit their own close request
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.account_close_requests'::regclass
      AND polname = 'Employers can insert own close request'
  ) THEN
    CREATE POLICY "Employers can insert own close request" ON public.account_close_requests
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Service role (admin API) can read all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.account_close_requests'::regclass
      AND polname = 'Service role manages close requests'
  ) THEN
    CREATE POLICY "Service role manages close requests" ON public.account_close_requests
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Index for admin list view (newest first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_account_close_requests_created_at'
  ) THEN
    CREATE INDEX idx_account_close_requests_created_at
      ON public.account_close_requests(created_at DESC);
  END IF;
END $$;
