-- Email Automation Logs & Analytics
-- Tracks email delivery, opens, clicks, and bounces.

CREATE TABLE IF NOT EXISTS public.automation_plugins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Backfill columns when this migration is run against a partially-created table.
ALTER TABLE public.automation_plugins
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE NOT NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

CREATE TABLE IF NOT EXISTS public.automation_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plugin_id TEXT REFERENCES public.automation_plugins(id) ON DELETE SET NULL,
  payload JSONB DEFAULT '{}'::jsonb NOT NULL,
  priority TEXT DEFAULT 'MEDIUM' NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
  status TEXT DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  attempts INTEGER DEFAULT 0 NOT NULL,
  last_error TEXT,
  run_after TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Backfill columns when this migration is run against a partially-created table.
ALTER TABLE public.automation_tasks
  ADD COLUMN IF NOT EXISTS plugin_id TEXT REFERENCES public.automation_plugins(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'MEDIUM' NOT NULL,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING' NOT NULL,
  ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS run_after TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

CREATE TABLE IF NOT EXISTS public.ai_health_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ai_health_logs
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.automation_tasks(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  template_id TEXT NOT NULL,
  status TEXT NOT NULL, -- 'QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'FAILED'
  provider_message_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.automation_tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS template_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_automation_tasks_status ON public.automation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_automation_tasks_plugin ON public.automation_tasks(plugin_id);
CREATE INDEX IF NOT EXISTS idx_automation_tasks_run_after ON public.automation_tasks(run_after);
CREATE INDEX IF NOT EXISTS idx_ai_health_logs_event_type ON public.ai_health_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient_email);

-- Enable RLS
ALTER TABLE public.automation_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- ADMIN Access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'automation_plugins' AND policyname = 'Admins have full access'
  ) THEN
    CREATE POLICY "Admins have full access" ON public.automation_plugins FOR ALL USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'automation_tasks' AND policyname = 'Admins have full access'
  ) THEN
    CREATE POLICY "Admins have full access" ON public.automation_tasks FOR ALL USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_health_logs' AND policyname = 'Admins have full access'
  ) THEN
    CREATE POLICY "Admins have full access" ON public.ai_health_logs FOR ALL USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_logs' AND policyname = 'Admins have full access'
  ) THEN
    CREATE POLICY "Admins have full access" ON public.email_logs FOR ALL USING (public.is_admin());
  END IF;
END $$;

INSERT INTO public.automation_plugins (id, name, description)
VALUES
  ('email-notifier', 'Email Notifier', 'Sends queued transactional emails.'),
  ('crm-manager', 'CRM Manager', 'Maintains employer CRM lifecycle data.')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = timezone('utc'::text, now());

-- Add to Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_tasks;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.email_logs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
