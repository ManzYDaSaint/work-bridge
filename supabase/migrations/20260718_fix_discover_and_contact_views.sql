-- ============================================================
-- Fix Employer Discover Feature (Safe Migration)
-- ============================================================

-- ============================================================
-- 1. Fix profile_visibility default
-- ============================================================

ALTER TABLE public.job_seekers
ALTER COLUMN profile_visibility SET DEFAULT 'PUBLIC';

-- ============================================================
-- 2. Create employer_contact_views table if missing
-- ============================================================

CREATE TABLE IF NOT EXISTS public.employer_contact_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_id UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
    seeker_id UUID NOT NULL REFERENCES public.job_seekers(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. Add month_key if missing
-- ============================================================

ALTER TABLE public.employer_contact_views
ADD COLUMN IF NOT EXISTS month_key TEXT;

-- Populate existing rows
UPDATE public.employer_contact_views
SET month_key = to_char(viewed_at AT TIME ZONE 'UTC', 'YYYY-MM')
WHERE month_key IS NULL;

ALTER TABLE public.employer_contact_views
ALTER COLUMN month_key SET NOT NULL;

-- ============================================================
-- 4. Create unique index
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_ecv_employer_seeker_month
ON public.employer_contact_views (
    employer_id,
    seeker_id,
    month_key
);

CREATE INDEX IF NOT EXISTS idx_ecv_employer_month
ON public.employer_contact_views (
    employer_id,
    month_key
);

-- ============================================================
-- 5. Enable RLS
-- ============================================================

ALTER TABLE public.employer_contact_views
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employers can view own contact views"
ON public.employer_contact_views;

CREATE POLICY "Employers can view own contact views"
ON public.employer_contact_views
FOR SELECT
USING (auth.uid() = employer_id);

-- ============================================================
-- 6. RPC Function
-- ============================================================

CREATE OR REPLACE FUNCTION public.try_record_employer_contact_view(
    p_employer_id UUID,
    p_seeker_id UUID,
    p_month_limit INTEGER DEFAULT 30
)
RETURNS TABLE(can_see BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_month_key TEXT := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM');
    v_existing UUID;
    v_count INTEGER;
BEGIN

    -- Already unlocked this month?
    SELECT id
    INTO v_existing
    FROM public.employer_contact_views
    WHERE employer_id = p_employer_id
      AND seeker_id = p_seeker_id
      AND month_key = v_month_key
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT TRUE;
        RETURN;
    END IF;

    -- Count unlocked seekers this month
    SELECT COUNT(*)
    INTO v_count
    FROM public.employer_contact_views
    WHERE employer_id = p_employer_id
      AND month_key = v_month_key;

    IF v_count >= p_month_limit THEN
        RETURN QUERY SELECT FALSE;
        RETURN;
    END IF;

    -- Record unlock
    INSERT INTO public.employer_contact_views (
        employer_id,
        seeker_id,
        month_key
    )
    VALUES (
        p_employer_id,
        p_seeker_id,
        v_month_key
    )
    ON CONFLICT DO NOTHING;

    RETURN QUERY SELECT TRUE;
END;
$$;

GRANT EXECUTE
ON FUNCTION public.try_record_employer_contact_view
TO authenticated;
