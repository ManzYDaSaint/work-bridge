-- Employer CRM Foundation
-- Adds tracking and CRM capabilities to the existing Employer ecosystem.

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE public.crm_status AS ENUM ('LEAD', 'REGISTERED', 'VERIFICATION_PENDING', 'VERIFIED', 'ACTIVE', 'INACTIVE', 'CHURNED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.lead_source AS ENUM ('ORGANIC', 'FACEBOOK', 'LINKEDIN', 'EMAIL_OUTREACH', 'REFERRAL', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.crm_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.note_type AS ENUM ('CALL', 'EMAIL', 'MEETING', 'FOLLOW_UP', 'GENERAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.task_status AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. CRM Profiles
CREATE TABLE IF NOT EXISTS public.employer_crm_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID REFERENCES public.employers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status public.crm_status DEFAULT 'LEAD' NOT NULL,
  lead_source public.lead_source DEFAULT 'OTHER',
  assigned_admin_id UUID REFERENCES public.users(id),
  priority public.crm_priority DEFAULT 'MEDIUM',
  
  -- CRM Info (optional, overrides core employer data)
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,

  -- Metrics
  total_jobs_posted INTEGER DEFAULT 0,
  total_applications_received INTEGER DEFAULT 0,
  total_hires INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0 NOT NULL,
  last_job_posted_at TIMESTAMP WITH TIME ZONE,
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CRM Notes
CREATE TABLE IF NOT EXISTS public.employer_crm_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID REFERENCES public.employers(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID REFERENCES public.users(id) NOT NULL,
  note_type public.note_type DEFAULT 'GENERAL' NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CRM Tasks
CREATE TABLE IF NOT EXISTS public.employer_crm_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID REFERENCES public.employers(id) ON DELETE CASCADE NOT NULL,
  assigned_admin_id UUID REFERENCES public.users(id),
  title TEXT NOT NULL,
  description TEXT,
  priority public.crm_priority DEFAULT 'MEDIUM',
  due_date TIMESTAMP WITH TIME ZONE,
  status public.task_status DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 5. Additional Contacts
CREATE TABLE IF NOT EXISTS public.employer_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID REFERENCES public.employers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  position TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.employer_crm_profiles
  ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0 NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employer_crm_profiles_status ON public.employer_crm_profiles(status);
CREATE INDEX IF NOT EXISTS idx_employer_crm_profiles_priority ON public.employer_crm_profiles(priority);
CREATE INDEX IF NOT EXISTS idx_employer_crm_tasks_status ON public.employer_crm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_employer_contacts_employer_id ON public.employer_contacts(employer_id);

-- Enable RLS
ALTER TABLE public.employer_crm_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_contacts ENABLE ROW LEVEL SECURITY;

-- ADMIN Access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employer_crm_profiles' AND policyname = 'Admins have full access'
  ) THEN
    CREATE POLICY "Admins have full access" ON public.employer_crm_profiles FOR ALL USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employer_crm_notes' AND policyname = 'Admins have full access'
  ) THEN
    CREATE POLICY "Admins have full access" ON public.employer_crm_notes FOR ALL USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employer_crm_tasks' AND policyname = 'Admins have full access'
  ) THEN
    CREATE POLICY "Admins have full access" ON public.employer_crm_tasks FOR ALL USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employer_contacts' AND policyname = 'Admins have full access'
  ) THEN
    CREATE POLICY "Admins have full access" ON public.employer_contacts FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.employer_crm_profiles;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.employer_crm_tasks;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
