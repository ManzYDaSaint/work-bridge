-- =================================================================─────────────
-- Aganyu Schema Migration Update: Premium Features & Human-in-the-Loop Approvals
-- =================================================================─────────────

-- 1. Update notification_queue status CHECK constraint to support HITL Approval Workflow
ALTER TABLE public.notification_queue 
DROP CONSTRAINT IF EXISTS notification_queue_status_check;

ALTER TABLE public.notification_queue 
ADD CONSTRAINT notification_queue_status_check 
CHECK (status IN ('REQUIRES_APPROVAL', 'PENDING', 'PROCESSING', 'SENT', 'FAILED', 'REJECTED'));

-- 2. Create system_settings table if it doesn't exist for match dispatch & threshold controls
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure value column is JSONB if system_settings was created with TEXT previously
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'system_settings' 
          AND column_name = 'value' 
          AND data_type = 'text'
    ) THEN
        ALTER TABLE public.system_settings 
        ALTER COLUMN value TYPE JSONB USING to_jsonb(value);
    END IF;
END $$;

-- Enable RLS for system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Admins full access to system_settings
DROP POLICY IF EXISTS "Admins full access system_settings" ON public.system_settings;
CREATE POLICY "Admins full access system_settings" ON public.system_settings FOR ALL USING (public.is_admin());

-- 3. Fix RLS policies on premium_subscriptions & notification_preferences (auth.uid() corresponds to job_seekers.id)
DROP POLICY IF EXISTS "Users view own subscription" ON public.premium_subscriptions;
CREATE POLICY "Users view own subscription" ON public.premium_subscriptions 
FOR SELECT USING (
    auth.uid() = seeker_id
);

DROP POLICY IF EXISTS "Users manage own preferences" ON public.notification_preferences;
CREATE POLICY "Users manage own preferences" ON public.notification_preferences 
FOR ALL USING (
    auth.uid() = seeker_id
);

-- 4. Default System Settings Seed
INSERT INTO public.system_settings (key, value)
VALUES 
    ('ADMIN_MATCH_DISPATCH_MODE', '"MANUAL"'::jsonb),
    ('MATCH_SCORE_THRESHOLD', '"50"'::jsonb),
    ('BULK_APPROVE_MIN_SCORE', '"80"'::jsonb),
    ('WHATSAPP_DAILY_CAP', '"100"'::jsonb)
ON CONFLICT (key) DO NOTHING;

