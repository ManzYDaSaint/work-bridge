-- =================================================================─────────────
-- Aganyu Master Canonical Database Schema & Migrations
-- Single Consolidated Migration File
-- =================================================================─────────────

-- 0. EXTENSIONS & TYPES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TYPE public.user_role AS ENUM ('ADMIN', 'EMPLOYER', 'JOB_SEEKER');
CREATE TYPE public.employer_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE public.job_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'EXPIRED', 'FILLED');
CREATE TYPE public.application_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'SHORTLISTED', 'INTERVIEWING', 'INVITED', 'HIRED', 'WITHDRAWN');

CREATE TYPE public.opportunity_category AS ENUM (
    'SCHOLARSHIP', 'GRANT', 'FUNDING', 'TRAINING',
    'CERTIFICATION', 'FELLOWSHIP', 'INTERNSHIP', 'CAREER_PROGRAM'
);
CREATE TYPE public.opportunity_status AS ENUM (
    'DRAFT', 'PUBLISHED', 'FEATURED', 'CLOSING_SOON', 'EXPIRED', 'ARCHIVED'
);
CREATE TYPE public.opportunity_location_type AS ENUM (
    'REMOTE', 'IN_PERSON', 'HYBRID', 'GLOBAL'
);
CREATE TYPE public.opportunity_funding_type AS ENUM (
    'FULL_FUNDING', 'PARTIAL_FUNDING', 'STIPEND', 'UNPAID', 'NOT_APPLICABLE'
);
CREATE TYPE public.opportunity_match_status AS ENUM (
    'PENDING', 'NOTIFIED', 'VIEWED', 'APPLIED', 'DISMISSED'
);

-- =================================================================─────────────
-- 1. CORE TABLES
-- =================================================================─────────────

CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role public.user_role DEFAULT 'JOB_SEEKER' NOT NULL,
  onboarding_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.job_seekers (
  id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  bio TEXT,
  location TEXT,
  skills TEXT[] DEFAULT '{}',
  experience JSONB[] DEFAULT '{}',
  education JSONB[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  qualification TEXT,
  resume_url TEXT,
  avatar_url TEXT,
  salary_expectation TEXT,
  seniority_level TEXT,
  employment_type TEXT,
  phone TEXT,
  whatsapp BOOLEAN DEFAULT FALSE,
  is_subscribed BOOLEAN DEFAULT FALSE,
  has_badge BOOLEAN DEFAULT FALSE,
  badge_seeker_number INTEGER,
  completion INTEGER DEFAULT 0,
  search_intent TEXT DEFAULT 'ACTIVELY_LOOKING',
  profile_visibility TEXT DEFAULT 'PUBLIC',
  public_slug TEXT,
  portfolio_links TEXT[] DEFAULT '{}',
  profile_views INTEGER DEFAULT 0,
  application_limit_bonus INTEGER DEFAULT 0,
  dna_hash TEXT,
  embedding vector(384),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.employers (
  id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  company_name TEXT NOT NULL,
  industry TEXT,
  location TEXT,
  website TEXT,
  description TEXT,
  logo_url TEXT,
  status public.employer_status DEFAULT 'PENDING' NOT NULL,
  plan TEXT DEFAULT 'FREE' NOT NULL,
  plan_expires_at TIMESTAMP WITH TIME ZONE,
  recruiter_verified BOOLEAN DEFAULT FALSE,
  profile_views INTEGER DEFAULT 0,
  application_alerts BOOLEAN DEFAULT TRUE,
  hiring_velocity BOOLEAN DEFAULT TRUE,
  candidate_privacy BOOLEAN DEFAULT FALSE,
  contact_limit_bonus INTEGER DEFAULT 0,
  default_scheduling_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID REFERENCES public.employers(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  type TEXT NOT NULL,
  work_mode TEXT DEFAULT 'REMOTE' NOT NULL,
  skills TEXT[] DEFAULT '{}',
  must_have_skills TEXT[] DEFAULT '{}',
  nice_to_have_skills TEXT[] DEFAULT '{}',
  minimum_years_experience INTEGER DEFAULT 0,
  qualification TEXT,
  salary_range TEXT,
  deadline DATE,
  screening_questions JSONB DEFAULT '[]'::jsonb,
  status public.job_status DEFAULT 'PENDING' NOT NULL,
  public_slug TEXT,
  dna_hash TEXT,
  embedding vector(384),
  
  -- Multi-channel posting fields
  application_method TEXT NOT NULL DEFAULT 'one_tap' CHECK (application_method IN ('one_tap', 'external_url', 'email', 'whatsapp', 'phone', 'manual')),
  external_apply_url TEXT,
  apply_email TEXT,
  apply_whatsapp TEXT,
  apply_phone TEXT,
  application_instructions TEXT,
  allow_one_tap_apply BOOLEAN NOT NULL DEFAULT TRUE,
  posting_type TEXT NOT NULL DEFAULT 'DIRECT' CHECK (posting_type IN ('DIRECT', 'AGENCY', 'AGANYU')),
  display_company_name TEXT,
  job_source TEXT DEFAULT 'Employer Portal',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status public.application_status DEFAULT 'PENDING' NOT NULL,
  screening_answers JSONB DEFAULT '{}'::jsonb,
  screening_score INTEGER DEFAULT 0,
  screening_summary TEXT,
  screening_breakdown JSONB DEFAULT '[]'::jsonb,
  meets_required_criteria BOOLEAN DEFAULT FALSE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(job_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seeker_id UUID REFERENCES public.job_seekers(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(seeker_id, job_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  type TEXT DEFAULT 'GENERAL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seeker_id UUID REFERENCES public.job_seekers(id) ON DELETE CASCADE NOT NULL,
  employer_id UUID REFERENCES public.employers(id) ON DELETE CASCADE NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(seeker_id, employer_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.account_close_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT,
  reasons TEXT[] DEFAULT '{}' NOT NULL,
  additional_notes TEXT,
  status TEXT DEFAULT 'PENDING' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  path TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  ip TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seeker_id UUID REFERENCES public.job_seekers(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  issuer TEXT,
  issue_date DATE,
  credential_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_tier INTEGER DEFAULT -1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.employer_saved_candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID REFERENCES public.employers(id) ON DELETE CASCADE NOT NULL,
  seeker_id UUID REFERENCES public.job_seekers(id) ON DELETE CASCADE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(employer_id, seeker_id)
);

CREATE TABLE IF NOT EXISTS public.employer_contact_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_id UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
    seeker_id UUID NOT NULL REFERENCES public.job_seekers(id) ON DELETE CASCADE,
    month_key TEXT NOT NULL,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =================================================================─────────────
-- 2. AUTOMATION, AI HEALTH & CRM SYSTEM
-- =================================================================─────────────

CREATE TABLE IF NOT EXISTS public.automation_plugins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.automation_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plugin_id TEXT REFERENCES public.automation_plugins(id) ON DELETE SET NULL,
  payload JSONB DEFAULT '{}'::jsonb NOT NULL,
  priority TEXT DEFAULT 'MEDIUM' NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
  status TEXT DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  attempts INTEGER DEFAULT 0 NOT NULL,
  last_error TEXT,
  run_after TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ai_health_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.automation_tasks(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  template_id TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_message_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mission_control_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('INFO', 'SUCCESS', 'WARNING', 'CRITICAL')),
    event TEXT NOT NULL,
    message TEXT NOT NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =================================================================─────────────
-- 3. OPPORTUNITIES MODULE
-- =================================================================─────────────

CREATE TABLE IF NOT EXISTS public.opportunities (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title                   TEXT NOT NULL,
    slug                    TEXT UNIQUE NOT NULL,
    category                public.opportunity_category NOT NULL,
    organization_name       TEXT NOT NULL,
    organization_logo       TEXT,
    description             TEXT NOT NULL,
    short_description       TEXT NOT NULL,
    country                 TEXT,
    location_type           public.opportunity_location_type NOT NULL DEFAULT 'GLOBAL',
    application_url         TEXT NOT NULL,
    contact_email           TEXT,
    deadline                TIMESTAMPTZ,
    eligibility_requirements TEXT,
    education_requirements  TEXT,
    required_skills         TEXT[] DEFAULT '{}',
    required_certifications TEXT[] DEFAULT '{}',
    age_min                 INTEGER,
    age_max                 INTEGER,
    experience_years_min    INTEGER DEFAULT 0,
    funding_type            public.opportunity_funding_type NOT NULL DEFAULT 'NOT_APPLICABLE',
    funding_amount          TEXT,
    source                  TEXT DEFAULT 'MANUAL',
    weight_education        INTEGER NOT NULL DEFAULT 40 CHECK (weight_education >= 0 AND weight_education <= 100),
    weight_certifications   INTEGER NOT NULL DEFAULT 30 CHECK (weight_certifications >= 0 AND weight_certifications <= 100),
    weight_skills           INTEGER NOT NULL DEFAULT 20 CHECK (weight_skills >= 0 AND weight_skills <= 100),
    weight_location         INTEGER NOT NULL DEFAULT 10 CHECK (weight_location >= 0 AND weight_location <= 100),
    embedding               vector(384),
    status                  public.opportunity_status NOT NULL DEFAULT 'DRAFT',
    featured                BOOLEAN NOT NULL DEFAULT false,
    created_by_admin        UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at            TIMESTAMPTZ,
    expires_at              TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.opportunity_views (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id  UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ip_address      TEXT,
    apply_clicked   BOOLEAN NOT NULL DEFAULT false,
    viewed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.opportunity_matches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id  UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
    job_seeker_id   UUID NOT NULL REFERENCES public.job_seekers(id) ON DELETE CASCADE,
    match_score     INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
    match_reason    TEXT,
    match_breakdown JSONB DEFAULT '{}'::jsonb,
    status          public.opportunity_match_status NOT NULL DEFAULT 'PENDING',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (opportunity_id, job_seeker_id)
);

-- =================================================================─────────────
-- 4. HELPER FUNCTIONS & TRIGGERS
-- =================================================================─────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'JOB_SEEKER');
  IF v_role NOT IN ('ADMIN', 'EMPLOYER', 'JOB_SEEKER') THEN
    v_role := 'JOB_SEEKER';
  END IF;

  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, v_role::public.user_role)
  ON CONFLICT (id) DO NOTHING;

  IF v_role = 'JOB_SEEKER' THEN
    INSERT INTO public.job_seekers (id, full_name, location, public_slug)
    VALUES (
      NEW.id,
      COALESCE(split_part(NEW.email, '@', 1), ''),
      'To be updated',
      lower(regexp_replace(regexp_replace(COALESCE(split_part(NEW.email, '@', 1), 'candidate'), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')) || '-' || left(replace(NEW.id::text, '-', ''), 8)
    )
    ON CONFLICT (id) DO NOTHING;

  ELSIF v_role = 'EMPLOYER' THEN
    INSERT INTO public.employers (id, company_name, industry, location, status, recruiter_verified)
    VALUES (NEW.id, 'New Company', 'To be updated', 'To be updated', 'PENDING', FALSE)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION update_opportunities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_opportunities_updated_at ON opportunities;
CREATE TRIGGER trg_opportunities_updated_at
    BEFORE UPDATE ON opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_opportunities_updated_at();

-- Vector Match Function
CREATE OR REPLACE FUNCTION match_candidates(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  full_name text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    job_seekers.id,
    job_seekers.full_name,
    1 - (job_seekers.embedding <=> query_embedding) AS similarity
  FROM job_seekers
  WHERE job_seekers.profile_visibility != 'HIDDEN'
    AND job_seekers.embedding IS NOT NULL
    AND 1 - (job_seekers.embedding <=> query_embedding) > match_threshold
  ORDER BY job_seekers.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Employer contact view limits
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
    SELECT id INTO v_existing
    FROM public.employer_contact_views
    WHERE employer_id = p_employer_id AND seeker_id = p_seeker_id AND month_key = v_month_key
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT TRUE;
        RETURN;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.employer_contact_views
    WHERE employer_id = p_employer_id AND month_key = v_month_key;

    IF v_count >= p_month_limit THEN
        RETURN QUERY SELECT FALSE;
        RETURN;
    END IF;

    INSERT INTO public.employer_contact_views (employer_id, seeker_id, month_key)
    VALUES (p_employer_id, p_seeker_id, v_month_key)
    ON CONFLICT DO NOTHING;

    RETURN QUERY SELECT TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.try_record_employer_contact_view TO authenticated;

-- =================================================================─────────────
-- 5. ROW LEVEL SECURITY (RLS)
-- =================================================================─────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_seekers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_close_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_saved_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_contact_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_control_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_matches ENABLE ROW LEVEL SECURITY;

-- ADMIN GLOBAL POLICIES
CREATE POLICY "Admins have full access users" ON public.users FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access seekers" ON public.job_seekers FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access employers" ON public.employers FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access jobs" ON public.jobs FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access applications" ON public.applications FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access notifications" ON public.notifications FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access audit" ON public.audit_logs FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access plugins" ON public.automation_plugins FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access tasks" ON public.automation_tasks FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access ai_health" ON public.ai_health_logs FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access email_logs" ON public.email_logs FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access mission_control" ON public.mission_control_events FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access opportunities" ON public.opportunities FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access opp_views" ON public.opportunity_views FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access opp_matches" ON public.opportunity_matches FOR ALL USING (public.is_admin());

-- USER / PUBLIC POLICIES
CREATE POLICY "Users can view own record" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Seekers can manage own profile" ON public.job_seekers FOR ALL USING (auth.uid() = id);
CREATE POLICY "Employers can manage own profile" ON public.employers FOR ALL USING (auth.uid() = id);
CREATE POLICY "Public can view employer basic info" ON public.employers FOR SELECT USING (true);
CREATE POLICY "Employers can manage saved candidates" ON public.employer_saved_candidates FOR ALL USING (auth.uid() = employer_id);
CREATE POLICY "Employers can view own contact views" ON public.employer_contact_views FOR SELECT USING (auth.uid() = employer_id);

CREATE POLICY "Public can view active jobs" ON public.jobs FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "Employers can manage own jobs" ON public.jobs FOR ALL USING (auth.uid() = employer_id);

CREATE POLICY "Seekers can view own applications" ON public.applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Seekers can submit applications" ON public.applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Employers can view applications for their jobs" ON public.applications FOR SELECT USING (EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND employer_id = auth.uid()));
CREATE POLICY "Employers can update application status" ON public.applications FOR UPDATE USING (EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND employer_id = auth.uid()));

CREATE POLICY "Public can view published opportunities" ON public.opportunities FOR SELECT USING (status IN ('PUBLISHED', 'FEATURED', 'CLOSING_SOON'));
CREATE POLICY "Authenticated users insert opp views" ON public.opportunity_views FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users view own opp views" ON public.opportunity_views FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Job seekers view own opp matches" ON public.opportunity_matches FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM job_seekers WHERE job_seekers.id = opportunity_matches.job_seeker_id AND job_seekers.id = auth.uid()));

-- =================================================================─────────────
-- 6. INDEXES & SEED PLUGINS
-- =================================================================─────────────

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON public.jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_posting_type ON public.jobs(posting_type);
CREATE INDEX IF NOT EXISTS idx_jobs_application_method ON public.jobs(application_method);
CREATE INDEX IF NOT EXISTS idx_applications_status_created ON public.applications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_ecv_employer_seeker_month ON public.employer_contact_views(employer_id, seeker_id, month_key);

CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_category ON opportunities(category);
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON opportunities(deadline);
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline_status ON opportunities(deadline, status);
CREATE INDEX IF NOT EXISTS idx_opportunity_matches_score ON opportunity_matches(match_score DESC);

INSERT INTO public.automation_plugins (id, name, description)
VALUES
  ('email-notifier', 'Email Notifier', 'Sends queued transactional emails.'),
  ('crm-manager', 'CRM Manager', 'Maintains employer CRM lifecycle data.'),
  ('buffer-social-poster', 'Buffer Social Poster', 'Automatically shares jobs to LinkedIn and Facebook Pages via Buffer.'),
  ('opportunity-matcher', 'Opportunity Matcher', 'Generates AI opportunity matches for candidates.')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = timezone('utc'::text, now());

-- Realtime Setup
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunity_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mission_control_events;
