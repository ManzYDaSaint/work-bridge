-- Migration: 20261122_employer_leads_and_claiming.sql
-- Enables LEAD employers without a registered user account, support for claim invitations,
-- and seamless conversion into registered/active employers without breaking PostgREST joins or onboarding.

-- 1. Ensure employers table has independent user_id column, account_type, and claiming fields
ALTER TABLE public.employers
    ADD COLUMN IF NOT EXISTS user_id UUID,
    ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'REGISTERED',
    ADD COLUMN IF NOT EXISTS recruitment_email TEXT,
    ADD COLUMN IF NOT EXISTS recruitment_url TEXT,
    ADD COLUMN IF NOT EXISTS claim_token_hash TEXT,
    ADD COLUMN IF NOT EXISTS claim_token_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS claimed_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS sourced_at TIMESTAMPTZ;

-- Add check constraint safely if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'employers_account_type_check' 
          AND conrelid = 'public.employers'::regclass
    ) THEN
        ALTER TABLE public.employers 
            ADD CONSTRAINT employers_account_type_check 
            CHECK (account_type IN ('LEAD', 'REGISTERED', 'ACTIVE', 'INACTIVE', 'CHURNED'));
    END IF;
END $$;

-- 2. Backfill user_id for existing registered employers FIRST before altering constraints
UPDATE public.employers
SET user_id = id
WHERE user_id IS NULL 
  AND id IN (SELECT id FROM public.users);

UPDATE public.employers
SET account_type = 'ACTIVE'
WHERE account_type = 'REGISTERED' AND status = 'APPROVED';

-- 3. Configure Foreign Keys for PostgREST
-- Drop restrictive 1:1 PK constraint employers.id -> users.id so LEAD employers can exist with independent UUIDs
ALTER TABLE public.employers DROP CONSTRAINT IF EXISTS employers_id_fkey;

-- Ensure explicit foreign key from employers.user_id -> users.id exists for PostgREST resource embedding
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'employers_user_id_fkey' 
          AND conrelid = 'public.employers'::regclass
    ) THEN
        ALTER TABLE public.employers
            ADD CONSTRAINT employers_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'employers_claimed_by_user_id_fkey' 
          AND conrelid = 'public.employers'::regclass
    ) THEN
        ALTER TABLE public.employers
            ADD CONSTRAINT employers_claimed_by_user_id_fkey 
            FOREIGN KEY (claimed_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Create indexes for quick lookups, joins, and claiming
CREATE INDEX IF NOT EXISTS idx_employers_user_id ON public.employers(user_id);
CREATE INDEX IF NOT EXISTS idx_employers_account_type ON public.employers(account_type);
CREATE INDEX IF NOT EXISTS idx_employers_recruitment_email ON public.employers(recruitment_email);
CREATE INDEX IF NOT EXISTS idx_employers_claim_token ON public.employers(claim_token_hash);
CREATE INDEX IF NOT EXISTS idx_employers_company_name ON public.employers(company_name);

-- 5. Update RLS policies on public.employers
DROP POLICY IF EXISTS "Employers can manage own profile" ON public.employers;
CREATE POLICY "Employers can manage own profile"
    ON public.employers FOR ALL
    USING (
        auth.uid() IS NOT NULL AND (
            user_id = auth.uid() OR id = auth.uid()
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND (
            user_id = auth.uid() OR id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Public can view employer basic info" ON public.employers;
CREATE POLICY "Public can view employer basic info"
    ON public.employers FOR SELECT
    USING (true);

-- 6. Update RLS policies on public.jobs & applications to recognize decoupled employers.user_id
DROP POLICY IF EXISTS "Employers can manage own jobs" ON public.jobs;
CREATE POLICY "Employers can manage own jobs"
    ON public.jobs FOR ALL
    USING (
        auth.uid() IS NOT NULL AND (
            employer_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.employers e
                WHERE e.id = jobs.employer_id AND (e.user_id = auth.uid() OR e.id = auth.uid())
            )
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND (
            employer_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.employers e
                WHERE e.id = jobs.employer_id AND (e.user_id = auth.uid() OR e.id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "Employers can view applications for their jobs" ON public.applications;
CREATE POLICY "Employers can view applications for their jobs"
    ON public.applications FOR SELECT
    USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM public.jobs j
                JOIN public.employers e ON e.id = j.employer_id
                WHERE j.id = applications.job_id
                  AND (j.employer_id = auth.uid() OR e.user_id = auth.uid() OR e.id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "Employers can update application status" ON public.applications;
CREATE POLICY "Employers can update application status"
    ON public.applications FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM public.jobs j
                JOIN public.employers e ON e.id = j.employer_id
                WHERE j.id = applications.job_id
                  AND (j.employer_id = auth.uid() OR e.user_id = auth.uid() OR e.id = auth.uid())
            )
        )
    );

-- 7. Ensure employer_crm_profiles table exists and has proper indexes
CREATE TABLE IF NOT EXISTS public.employer_crm_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_id UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'LEAD',
    priority TEXT NOT NULL DEFAULT 'LOW' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    engagement_score INTEGER NOT NULL DEFAULT 0,
    last_activity_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_employer_crm_employer UNIQUE (employer_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_employer_id ON public.employer_crm_profiles(employer_id);
CREATE INDEX IF NOT EXISTS idx_crm_status ON public.employer_crm_profiles(status);
CREATE INDEX IF NOT EXISTS idx_crm_priority ON public.employer_crm_profiles(priority);

ALTER TABLE public.employer_crm_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins have full access to employer_crm_profiles" ON public.employer_crm_profiles;
CREATE POLICY "Admins have full access to employer_crm_profiles"
    ON public.employer_crm_profiles FOR ALL
    USING (public.is_admin());

-- 8. Invalidate PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
