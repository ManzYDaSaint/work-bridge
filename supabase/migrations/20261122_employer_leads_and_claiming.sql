-- Migration: 20261122_employer_leads_and_claiming.sql
-- Enables LEAD employers without a registered user account, support for claim invitations,
-- and seamless conversion into registered/active employers.

-- 1. Ensure employers table has independent user_id column and account_type
ALTER TABLE public.employers
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'REGISTERED' CHECK (account_type IN ('LEAD', 'REGISTERED', 'ACTIVE', 'INACTIVE', 'CHURNED')),
    ADD COLUMN IF NOT EXISTS recruitment_email TEXT,
    ADD COLUMN IF NOT EXISTS recruitment_url TEXT,
    ADD COLUMN IF NOT EXISTS claim_token_hash TEXT,
    ADD COLUMN IF NOT EXISTS claim_token_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS claimed_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS sourced_at TIMESTAMPTZ;

-- 2. Drop the restrictive foreign key constraint where employers.id must be a user id
ALTER TABLE public.employers DROP CONSTRAINT IF EXISTS employers_id_fkey;

-- 3. Backfill user_id for existing registered employers
UPDATE public.employers
SET user_id = id
WHERE user_id IS NULL AND id IN (SELECT id FROM public.users);

UPDATE public.employers
SET account_type = 'ACTIVE'
WHERE account_type = 'REGISTERED' AND status = 'APPROVED';

-- 4. Create indexes for quick lookups and claiming
CREATE INDEX IF NOT EXISTS idx_employers_user_id ON public.employers(user_id);
CREATE INDEX IF NOT EXISTS idx_employers_account_type ON public.employers(account_type);
CREATE INDEX IF NOT EXISTS idx_employers_recruitment_email ON public.employers(recruitment_email);
CREATE INDEX IF NOT EXISTS idx_employers_claim_token ON public.employers(claim_token_hash);
CREATE INDEX IF NOT EXISTS idx_employers_company_name ON public.employers(company_name);

-- 5. Update RLS policies to use user_id instead of id for managing own profile
DROP POLICY IF EXISTS "Employers can manage own profile" ON public.employers;
CREATE POLICY "Employers can manage own profile"
    ON public.employers FOR ALL
    USING (auth.uid() = user_id OR auth.uid() = id);

-- 6. Ensure employer_crm_profiles table exists and has proper indexes
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
