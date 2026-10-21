-- =============================================================================
-- MIGRATION: 20261022_growth_agent_core.sql
-- PURPOSE   : Tables for Aganyu Growth Agent (Content Intelligence & Scheduling)
--             Focus: What to post, when to post (Founder vs Company),
--             job domain analytics, and offline design briefs.
-- =============================================================================

-- 1. Table: growth_agent_runs (Execution history for runs / analyses)
CREATE TABLE IF NOT EXISTS public.growth_agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_type TEXT NOT NULL DEFAULT 'WEEKLY' CHECK (run_type IN ('WEEKLY', 'DAILY', 'MANUAL')),
    status TEXT NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
    summary TEXT,
    metrics_snapshot JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Table: growth_agent_suggestions (Specific post recommendations per day/slot)
CREATE TABLE IF NOT EXISTS public.growth_agent_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES public.growth_agent_runs(id) ON DELETE CASCADE,
    target_account TEXT NOT NULL CHECK (target_account IN ('FOUNDER', 'COMPANY')),
    target_channel TEXT NOT NULL DEFAULT 'LINKEDIN' CHECK (target_channel IN ('LINKEDIN', 'FACEBOOK', 'X', 'GENERAL')),
    content_pillar TEXT NOT NULL,
    scheduled_day TEXT NOT NULL CHECK (scheduled_day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    scheduled_time TEXT NOT NULL, -- e.g. "08:00" (Africa/Blantyre local)
    timezone TEXT NOT NULL DEFAULT 'Africa/Blantyre',
    opening_hook TEXT NOT NULL,
    core_message TEXT NOT NULL,
    proposed_caption TEXT NOT NULL,
    creative_brief TEXT NOT NULL, -- Detailed visual instruction for offline design (Canva/Figma)
    evidence_data JSONB DEFAULT '{}'::jsonb, -- Referencing top domains, jobs counts, etc.
    hashtags TEXT[] DEFAULT '{}',
    call_to_action TEXT,
    status TEXT NOT NULL DEFAULT 'SUGGESTED' CHECK (status IN ('SUGGESTED', 'APPROVED', 'DISMISSED', 'POSTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Indexes for fast dashboard loading
CREATE INDEX IF NOT EXISTS idx_growth_agent_suggestions_target 
    ON public.growth_agent_suggestions(target_account, scheduled_day);

CREATE INDEX IF NOT EXISTS idx_growth_agent_suggestions_status 
    ON public.growth_agent_suggestions(status);

CREATE INDEX IF NOT EXISTS idx_growth_agent_runs_created 
    ON public.growth_agent_runs(created_at DESC);

-- 4. Row Level Security: Admin-only access
ALTER TABLE public.growth_agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_agent_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access growth_agent_runs"
    ON public.growth_agent_runs
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins full access growth_agent_suggestions"
    ON public.growth_agent_suggestions
    FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
