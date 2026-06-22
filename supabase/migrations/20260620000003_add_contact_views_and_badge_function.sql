-- Fix 1: Create employer_contact_views table
-- This table was referenced in code but missing from all migrations,
-- causing the contact view gate to silently fail in production.

CREATE TABLE IF NOT EXISTS public.employer_contact_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID REFERENCES public.employers(id) ON DELETE CASCADE NOT NULL,
  seeker_id UUID REFERENCES public.job_seekers(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Fix 3: The monthly dedup constraint cannot be defined inline in Postgres
-- because date_trunc() is a function expression. It must be a unique index.
-- This prevents duplicate monthly contact view rows under concurrency.
CREATE UNIQUE INDEX IF NOT EXISTS employer_contact_views_monthly_unique
  ON public.employer_contact_views (employer_id, seeker_id, date_trunc('month', viewed_at AT TIME ZONE 'UTC'));

ALTER TABLE public.employer_contact_views ENABLE ROW LEVEL SECURITY;

-- Employers can only see their own contact views
CREATE POLICY "Employers view own contact views"
  ON public.employer_contact_views FOR SELECT
  USING (auth.uid() = employer_id);

-- Employers can insert their own contact views
CREATE POLICY "Employers insert own contact views"
  ON public.employer_contact_views FOR INSERT
  WITH CHECK (auth.uid() = employer_id);

-- Admins have full access
CREATE POLICY "Admins full access to contact views"
  ON public.employer_contact_views FOR ALL
  USING (public.is_admin());


-- Fix 2: Atomic badge grant function to prevent race conditions.
-- Uses FOR UPDATE to lock the seeker row, then checks the global badge
-- count and grants in a single transaction — no JS-level read-then-write.

CREATE OR REPLACE FUNCTION public.try_grant_early_badge(p_seeker_id UUID, p_limit INT DEFAULT 100)
RETURNS BOOLEAN AS $$
DECLARE
  v_already_has_badge BOOLEAN;
  v_badge_count INT;
  v_rows_updated INT := 0;
BEGIN
  -- Lock the seeker row to prevent concurrent badge grants for the same user
  SELECT has_badge INTO v_already_has_badge
  FROM public.job_seekers
  WHERE id = p_seeker_id
  FOR UPDATE;

  -- Cheap exit: already has badge
  IF v_already_has_badge THEN
    RETURN TRUE;
  END IF;

  -- Count current badge holders under the lock
  SELECT COUNT(*) INTO v_badge_count
  FROM public.job_seekers
  WHERE has_badge = TRUE;

  IF v_badge_count < p_limit THEN
    UPDATE public.job_seekers
    SET has_badge = TRUE,
        badge_seeker_number = v_badge_count + 1
    WHERE id = p_seeker_id
      AND has_badge = FALSE; -- Extra guard against concurrent grants

    -- Capture affected row count into an INT (not BOOLEAN)
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    RETURN v_rows_updated > 0;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.try_record_employer_contact_view(
  p_employer_id UUID,
  p_seeker_id UUID,
  p_month_limit INT DEFAULT 30
)
RETURNS TABLE(can_see BOOLEAN, view_count INT) AS $$
DECLARE
  v_current_views INT;
  v_has_existing BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO v_current_views
  FROM public.employer_contact_views
  WHERE employer_id = p_employer_id
    AND viewed_at >= date_trunc('month', now() AT TIME ZONE 'UTC');

  SELECT EXISTS(
      SELECT 1 FROM public.employer_contact_views
      WHERE employer_id = p_employer_id
        AND seeker_id = p_seeker_id
        AND viewed_at >= date_trunc('month', now() AT TIME ZONE 'UTC')
  ) INTO v_has_existing;

  IF v_has_existing THEN
    RETURN QUERY SELECT TRUE AS can_see, v_current_views AS view_count;
    RETURN;
  END IF;

  IF v_current_views < p_month_limit THEN
    INSERT INTO public.employer_contact_views (employer_id, seeker_id)
    VALUES (p_employer_id, p_seeker_id);
    RETURN QUERY SELECT TRUE AS can_see, v_current_views + 1 AS view_count;
    RETURN;
  END IF;

  RETURN QUERY SELECT FALSE AS can_see, v_current_views AS view_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
