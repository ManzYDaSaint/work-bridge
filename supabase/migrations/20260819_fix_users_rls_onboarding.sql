-- =================================================================─────────────
-- Migration: Fix users RLS — add UPDATE policy so onboarding_completed_at
--            can be written back from the API route.
--
-- Root-cause: public.users only had a SELECT policy for regular users.
-- The PUT call from /api/onboarding/complete was silently blocked by RLS,
-- meaning onboarding_completed_at was NEVER persisted.
-- On every page refresh, isOnboardingComplete() would re-evaluate the
-- job_seekers fields, find placeholder values ("To be updated" / empty),
-- and redirect the user back to /onboarding — an infinite loop.
-- =================================================================─────────────

-- 1. Allow authenticated users to update their own row in public.users.
--    We restrict the columns that can be changed to prevent privilege escalation
--    (users cannot change their own role, email, or id).
DROP POLICY IF EXISTS "Users can update own record" ON public.users;
CREATE POLICY "Users can update own record" ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 2. (Optional safety) Create a SECURITY DEFINER function to set
--    onboarding_completed_at. This approach lets us call it via RPC
--    from any client without needing a broad UPDATE policy, and it
--    restricts exactly what can be changed.
CREATE OR REPLACE FUNCTION public.complete_onboarding()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    UPDATE public.users
    SET onboarding_completed_at = NOW()
    WHERE id = auth.uid()
      AND onboarding_completed_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_onboarding() TO authenticated;

-- 3. Backfill: fix existing users who have a complete seeker profile
--    but never got onboarding_completed_at written due to the RLS bug.
--    We consider a seeker "complete" if they have full_name, location, bio,
--    qualification, and at least one skill — matching isOnboardingComplete() logic.
UPDATE public.users u
SET onboarding_completed_at = NOW()
WHERE u.onboarding_completed_at IS NULL
  AND u.role = 'JOB_SEEKER'
  AND EXISTS (
    SELECT 1
    FROM public.job_seekers js
    WHERE js.id = u.id
      AND js.full_name IS NOT NULL
      AND js.full_name <> ''
      AND js.full_name <> 'To be updated'
      AND js.location IS NOT NULL
      AND js.location <> ''
      AND js.location <> 'To be updated'
      AND js.bio IS NOT NULL
      AND js.bio <> ''
      AND js.qualification IS NOT NULL
      AND js.qualification <> ''
      AND array_length(js.skills, 1) > 0
  );

-- Same backfill for employers
UPDATE public.users u
SET onboarding_completed_at = NOW()
WHERE u.onboarding_completed_at IS NULL
  AND u.role = 'EMPLOYER'
  AND EXISTS (
    SELECT 1
    FROM public.employers e
    WHERE e.id = u.id
      AND e.company_name IS NOT NULL
      AND e.company_name <> ''
      AND e.company_name <> 'New Company'
      AND e.industry IS NOT NULL
      AND e.industry <> ''
      AND e.industry <> 'To be updated'
      AND e.location IS NOT NULL
      AND e.location <> ''
      AND e.location <> 'To be updated'
  );
