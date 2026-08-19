-- =================================================================─────────────
-- Aganyu Premium Subscription & WhatsApp Schema Extension
-- =================================================================─────────────

-- 1. ENUMS & TYPES
CREATE TYPE public.subscription_status AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TYPE public.payment_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE public.notification_frequency AS ENUM ('INSTANT', 'MORNING', 'EVENING', 'DAILY', 'WEEKLY');

-- 2. PREMIUM TABLES

CREATE TABLE IF NOT EXISTS public.subscription_trials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seeker_id UUID REFERENCES public.job_seekers(id) ON DELETE CASCADE UNIQUE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.premium_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seeker_id UUID REFERENCES public.job_seekers(id) ON DELETE CASCADE UNIQUE,
    status public.subscription_status DEFAULT 'ACTIVE' NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,
    payment_provider TEXT, -- e.g., 'PAYCHANGU'
    payment_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES public.premium_subscriptions(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'MWK',
    status public.payment_status DEFAULT 'PENDING' NOT NULL,
    provider_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    seeker_id UUID PRIMARY KEY REFERENCES public.job_seekers(id) ON DELETE CASCADE,
    whatsapp_enabled BOOLEAN DEFAULT FALSE,
    frequency public.notification_frequency DEFAULT 'DAILY' NOT NULL,
    min_match_score INTEGER DEFAULT 80 CHECK (min_match_score >= 0 AND min_match_score <= 100),
    job_categories TEXT[] DEFAULT '{}',
    districts TEXT[] DEFAULT '{}',
    employment_types TEXT[] DEFAULT '{}',
    salary_range_min INTEGER,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seeker_id UUID REFERENCES public.job_seekers(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    template_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT DEFAULT 'REQUIRES_APPROVAL' CHECK (status IN ('REQUIRES_APPROVAL', 'PENDING', 'PROCESSING', 'SENT', 'FAILED', 'REJECTED')),
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID REFERENCES public.notification_queue(id) ON DELETE SET NULL,
    message_id TEXT,
    status TEXT NOT NULL,
    error_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. INDEXES
CREATE INDEX idx_premium_subs_seeker ON public.premium_subscriptions(seeker_id);
CREATE INDEX idx_premium_subs_status ON public.premium_subscriptions(status);
CREATE INDEX idx_notification_queue_status ON public.notification_queue(status, scheduled_for);
CREATE INDEX idx_whatsapp_logs_message_id ON public.whatsapp_delivery_logs(message_id);

-- 4. RLS POLICIES
ALTER TABLE public.subscription_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS (Admins full access, Users own data)
CREATE POLICY "Admins full access" ON public.premium_subscriptions FOR ALL USING (public.is_admin());
CREATE POLICY "Users view own subscription" ON public.premium_subscriptions FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.job_seekers WHERE id = seeker_id)
);

CREATE POLICY "Users manage own preferences" ON public.notification_preferences FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.job_seekers WHERE id = seeker_id)
);
CREATE POLICY "Admins view all logs" ON public.whatsapp_delivery_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins full access system_settings" ON public.system_settings FOR ALL USING (public.is_admin());

