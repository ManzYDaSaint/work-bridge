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
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Admins full access to system_settings
DROP POLICY IF EXISTS "Admins full access system_settings" ON public.system_settings;
CREATE POLICY "Admins full access system_settings" ON public.system_settings FOR ALL USING (public.is_admin());

-- 3. Fix RLS policy on premium_subscriptions (auth.uid() corresponds to job_seekers.user_id)
DROP POLICY IF EXISTS "Users view own subscription" ON public.premium_subscriptions;
CREATE POLICY "Users view own subscription" ON public.premium_subscriptions 
FOR SELECT USING (
    auth.uid() IN (
        SELECT user_id FROM public.job_seekers WHERE id = seeker_id
    )
);

-- 4. Default System Settings Seed
INSERT INTO public.system_settings (key, value)
VALUES 
    ('ADMIN_MATCH_DISPATCH_MODE', 'MANUAL'),
    ('MATCH_SCORE_THRESHOLD', '50'),
    ('BULK_APPROVE_MIN_SCORE', '80'),
    ('WHATSAPP_DAILY_CAP', '100')
ON CONFLICT (key) DO NOTHING;
