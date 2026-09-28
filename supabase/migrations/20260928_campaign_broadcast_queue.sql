-- Migration: Create campaign_broadcasts and broadcast_recipients tables for async broadcast queue processing

CREATE TABLE IF NOT EXISTS public.campaign_broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    audience VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('EMAIL', 'WHATSAPP', 'BOTH')),
    template_name VARCHAR(100),
    email_subject TEXT,
    email_body TEXT,
    whatsapp_heading TEXT,
    whatsapp_body TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL_FAILURE')),
    total_recipients INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    skipped_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.broadcast_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_id UUID REFERENCES public.campaign_broadcasts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    channel VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED')),
    wa_message_id VARCHAR(100),
    error_code VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_broadcasts_created_at ON public.campaign_broadcasts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_broadcasts_status ON public.campaign_broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast_id ON public.broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_wa_message_id ON public.broadcast_recipients(wa_message_id);

-- Enable RLS
ALTER TABLE public.campaign_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Admins
DROP POLICY IF EXISTS "Admins have full access to campaign_broadcasts" ON public.campaign_broadcasts;
CREATE POLICY "Admins have full access to campaign_broadcasts"
ON public.campaign_broadcasts FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to broadcast_recipients" ON public.broadcast_recipients;
CREATE POLICY "Admins have full access to broadcast_recipients"
ON public.broadcast_recipients FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());
