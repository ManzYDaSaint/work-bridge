-- =================================================================─────────────
-- Aganyu Comprehensive RLS Audit Migration
-- Fixes all RLS gaps identified across the full migration history:
--
-- GAPS IDENTIFIED:
-- [1] public.users         — Missing UPDATE policy (fixed separately in 20260819_fix_users_rls_onboarding.sql)
-- [2] public.notifications — Missing UPDATE policy (users can't mark notifications read via RLS)
-- [3] public.saved_jobs    — Missing policies entirely (covered by admin only, no user INSERT/DELETE)
-- [4] public.subscription_payments — No user-facing SELECT policy (seeker can't see their own payment history)
-- [5] public.subscription_trials   — No user-facing SELECT policy
-- [6] public.notification_queue    — No user-facing SELECT policy (seeker can't verify queue status)
-- [7] public.certificates  — No self-SELECT policy for seekers (only admin policy exists)
-- [8] public.whatsapp_delivery_logs — No INSERT policy (server-side writes need admin/service_role path)
-- [9] public.referrals     — Table used in code but never defined in migrations (missing RLS entirely)
-- [10] system_settings     — Conflicting policies between two migrations (one allows public SELECT, one does not)
-- =================================================================─────────────


-- ─────────────────────────────────────────────────────────────────
-- [1] public.users — UPDATE policy (already done in fix_users_rls_onboarding.sql)
--     Included here for completeness / idempotency
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can update own record" ON public.users;
CREATE POLICY "Users can update own record" ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);


-- ─────────────────────────────────────────────────────────────────
-- [2] public.notifications — Missing UPDATE policy
--     The notifications API route does:
--       supabase.from("notifications").update({ is_read: true }).eq("user_id", userId)
--     This runs with the anon key, so without an UPDATE policy it silently does nothing.
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Also add SELECT and DELETE policies for completeness
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
    FOR DELETE
    USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────
-- [3] public.saved_jobs — Missing user-facing policies
--     The master schema only has admin policy. The saved-jobs API
--     uses the anon-key client and relies on RLS for seeker_id isolation.
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Seekers can manage own saved jobs" ON public.saved_jobs;
CREATE POLICY "Seekers can manage own saved jobs" ON public.saved_jobs
    FOR ALL
    USING (auth.uid() = seeker_id)
    WITH CHECK (auth.uid() = seeker_id);

-- Public job seekers browsing jobs can check their saved status
DROP POLICY IF EXISTS "Seekers can view own saved jobs" ON public.saved_jobs;
-- (covered by the ALL policy above)


-- ─────────────────────────────────────────────────────────────────
-- [4] public.subscription_payments — Missing seeker SELECT policy
--     Seekers should be able to view their own payment history.
--     The table links via subscription_id → premium_subscriptions(seeker_id).
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins full access subscription_payments" ON public.subscription_payments;
CREATE POLICY "Admins full access subscription_payments" ON public.subscription_payments
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Seekers can view own payments" ON public.subscription_payments;
CREATE POLICY "Seekers can view own payments" ON public.subscription_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.premium_subscriptions ps
            WHERE ps.id = subscription_payments.subscription_id
              AND ps.seeker_id = auth.uid()
        )
    );


-- ─────────────────────────────────────────────────────────────────
-- [5] public.subscription_trials — Missing all user-facing policies
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins full access subscription_trials" ON public.subscription_trials;
CREATE POLICY "Admins full access subscription_trials" ON public.subscription_trials
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Seekers can view own trial" ON public.subscription_trials;
CREATE POLICY "Seekers can view own trial" ON public.subscription_trials
    FOR SELECT USING (auth.uid() = seeker_id);


-- ─────────────────────────────────────────────────────────────────
-- [6] public.notification_queue — Add seeker view of own queue entries
--     This lets seekers (and the admin dashboard) check delivery status.
--     Write/update operations go through service_role only.
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins full access notification_queue" ON public.notification_queue;
CREATE POLICY "Admins full access notification_queue" ON public.notification_queue
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Seekers can view own queue entries" ON public.notification_queue;
CREATE POLICY "Seekers can view own queue entries" ON public.notification_queue
    FOR SELECT USING (auth.uid() = seeker_id);


-- ─────────────────────────────────────────────────────────────────
-- [7] public.certificates — Add seeker-facing SELECT policy
--     The master schema only has admin policy. Seekers need to SELECT
--     their own certs to display them on their profile page.
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Seekers can manage own certificates" ON public.certificates;
CREATE POLICY "Seekers can manage own certificates" ON public.certificates
    FOR ALL USING (auth.uid() = seeker_id)
    WITH CHECK (auth.uid() = seeker_id);

-- Public employers can view seeker certificates when browsing talent
DROP POLICY IF EXISTS "Public can view certificates" ON public.certificates;
CREATE POLICY "Public can view certificates" ON public.certificates
    FOR SELECT USING (true);


-- ─────────────────────────────────────────────────────────────────
-- [8] public.whatsapp_delivery_logs — Admin INSERT policy
--     The admin SELECT policy exists, but no INSERT policy.
--     Cron jobs that write delivery logs use service_role (bypasses RLS),
--     so this is low-risk, but adding it for correctness.
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins full access whatsapp_logs" ON public.whatsapp_delivery_logs;
CREATE POLICY "Admins full access whatsapp_logs" ON public.whatsapp_delivery_logs
    FOR ALL USING (public.is_admin());


-- ─────────────────────────────────────────────────────────────────
-- [9] public.referrals — Table used in API code but never defined in migrations
--     The register callback and profile PUT route use this table.
--     Create it here if missing, with proper RLS.
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'EXPIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(referred_id)  -- Each new user can only have one referrer
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access referrals" ON public.referrals;
CREATE POLICY "Admins full access referrals" ON public.referrals
    FOR ALL USING (public.is_admin());

-- Referrers can see referrals they initiated
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
CREATE POLICY "Users can view own referrals" ON public.referrals
    FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);


-- ─────────────────────────────────────────────────────────────────
-- [10] public.system_settings — Resolve conflicting policies
--      20260807 migration creates: public SELECT + admins full access
--      20260816 migration creates: admins full access ONLY (no public)
--      20260818 migration re-creates: admins full access ONLY
--      Result: policy conflict. Standardise to public read (settings
--      like ingestion toggles need to be readable by cron routes
--      which run under anon key for some operations).
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow public read access to system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins full access system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins full access" ON public.system_settings;

-- Authenticated users can READ system settings (needed for cron checks)
CREATE POLICY "Authenticated users can read system_settings" ON public.system_settings
    FOR SELECT TO authenticated USING (true);

-- Only admins can write to system settings
CREATE POLICY "Admins can write system_settings" ON public.system_settings
    FOR ALL USING (public.is_admin());


-- ─────────────────────────────────────────────────────────────────
-- [11] public.account_close_requests — Missing user-facing INSERT policy
--      The master schema has no user-facing policy for this table.
--      Users need to INSERT their own close requests.
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins full access account_close_requests" ON public.account_close_requests;
CREATE POLICY "Admins full access account_close_requests" ON public.account_close_requests
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users can submit close request" ON public.account_close_requests;
CREATE POLICY "Users can submit close request" ON public.account_close_requests
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own close request" ON public.account_close_requests;
CREATE POLICY "Users can view own close request" ON public.account_close_requests
    FOR SELECT USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────
-- [12] public.conversations & public.messages — Verify policies exist
--      The master schema enables RLS but adds no policies for these tables.
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Participants can view own conversations" ON public.conversations;
CREATE POLICY "Participants can view own conversations" ON public.conversations
    FOR SELECT USING (auth.uid() = seeker_id OR auth.uid() = employer_id);

DROP POLICY IF EXISTS "Participants can manage conversations" ON public.conversations;
CREATE POLICY "Participants can manage conversations" ON public.conversations
    FOR ALL USING (auth.uid() = seeker_id OR auth.uid() = employer_id)
    WITH CHECK (auth.uid() = seeker_id OR auth.uid() = employer_id);

DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND (c.seeker_id = auth.uid() OR c.employer_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
CREATE POLICY "Participants can send messages" ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND (c.seeker_id = auth.uid() OR c.employer_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Admins full access conversations" ON public.conversations;
CREATE POLICY "Admins full access conversations" ON public.conversations
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins full access messages" ON public.messages;
CREATE POLICY "Admins full access messages" ON public.messages
    FOR ALL USING (public.is_admin());
