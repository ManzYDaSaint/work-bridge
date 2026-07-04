-- Run this in your Supabase SQL Editor to enable the Webhook for Job Insertions

-- 1. Enable the pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Create the webhook trigger function
CREATE OR REPLACE FUNCTION trigger_job_match_webhook()
RETURNS TRIGGER AS $$
BEGIN
  -- We use pg_net to make an asynchronous POST request to our Next.js API
  -- Make sure to replace your_production_url.com with your actual domain
  -- You can add an authentication header if needed
  PERFORM net.http_post(
    url := 'https://your_production_url.com/api/webhooks/supabase/job-inserted',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'jobs',
      'record', row_to_json(NEW)
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach the trigger to the jobs table
DROP TRIGGER IF EXISTS trigger_job_match_webhook_trigger ON public.jobs;

CREATE TRIGGER trigger_job_match_webhook_trigger
AFTER INSERT ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION trigger_job_match_webhook();
