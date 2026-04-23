-- WorkBridge Supabase Schema Redesign (Production - Clean)

-- ==========================================
-- 0. EXTENSIONS & TYPES
-- ==========================================

-- Standard User Roles
CREATE TYPE public.user_role AS ENUM ('ADMIN', 'EMPLOYER', 'JOB_SEEKER');

-- Status Enums for Workflows
CREATE TYPE public.employer_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE public.job_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'EXPIRED', 'FILLED');
CREATE TYPE public.application_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'SHORTLISTED', 'INTERVIEWING', 'INVITED', 'HIRED');

-- ==========================================
-- 1. CORE TABLES
-- ==========================================

-- Public profile linked to auth.users
CREATE TABLE public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role public.user_role DEFAULT 'JOB_SEEKER' NOT NULL,
  onboarding_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Job Seekers table (Personal Profiles)
CREATE TABLE public.job_seekers (
  id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  bio TEXT,
  location TEXT,
  skills TEXT[] DEFAULT '{}',
  experience JSONB[] DEFAULT '{}',
  education JSONB[] DEFAULT '{}',
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Employers table (Company Profiles)
CREATE TABLE public.employers (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Jobs Postings
CREATE TABLE public.jobs (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Applications for Jobs
CREATE TABLE public.applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status public.application_status DEFAULT 'PENDING' NOT NULL,
  screening_answers JSONB DEFAULT '{}'::jsonb,
  screening_score INTEGER DEFAULT 0,
  screening_summary TEXT,
  screening_breakdown JSONB DEFAULT '[]'::jsonb,
  meets_required_criteria BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(job_id, user_id)
);

-- Saved Jobs for Seekers
CREATE TABLE public.saved_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seeker_id UUID REFERENCES public.job_seekers(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(seeker_id, job_id)
);

-- System Notifications
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  type TEXT DEFAULT 'GENERAL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Conversations & Messaging
CREATE TABLE public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seeker_id UUID REFERENCES public.job_seekers(id) ON DELETE CASCADE NOT NULL,
  employer_id UUID REFERENCES public.employers(id) ON DELETE CASCADE NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(seeker_id, employer_id)
);

CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Administrative & Support
CREATE TABLE public.account_close_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT,
  reasons TEXT[] DEFAULT '{}' NOT NULL,
  additional_notes TEXT,
  status TEXT DEFAULT 'PENDING' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.audit_logs (
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

-- Billing & Credentials
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  plan TEXT DEFAULT 'FREE' NOT NULL,
  status TEXT DEFAULT 'ACTIVE' NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'MWK' NOT NULL,
  status TEXT DEFAULT 'PENDING' NOT NULL,
  tx_ref TEXT UNIQUE NOT NULL,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.certificates (
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

CREATE TABLE public.profile_reveals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID REFERENCES public.employers(id) ON DELETE CASCADE NOT NULL,
  seeker_id UUID REFERENCES public.job_seekers(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'PENDING' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(employer_id, seeker_id)
);

-- ==========================================
-- 2. HELPER FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ==========================================

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
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_reveals ENABLE ROW LEVEL SECURITY;

-- ADMIN: Global Access
CREATE POLICY "Admins have full access" ON public.users FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access" ON public.job_seekers FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access" ON public.employers FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access" ON public.jobs FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access" ON public.applications FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access" ON public.notifications FOR ALL USING (public.is_admin());
CREATE POLICY "Admins have full access" ON public.audit_logs FOR ALL USING (public.is_admin());

-- USERS
CREATE POLICY "Users can view own record" ON public.users FOR SELECT USING (auth.uid() = id);

-- JOB SEEKERS
CREATE POLICY "Seekers can manage own profile" ON public.job_seekers FOR ALL USING (auth.uid() = id);
CREATE POLICY "Everyone can view anonymized seeker data" ON public.job_seekers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Approved employers can view full seeker profile" ON public.job_seekers FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profile_reveals WHERE seeker_id = public.job_seekers.id AND employer_id = auth.uid() AND status = 'APPROVED'));

-- EMPLOYERS
CREATE POLICY "Employers can manage own profile" ON public.employers FOR ALL USING (auth.uid() = id);
CREATE POLICY "Public can view employer basic info" ON public.employers FOR SELECT USING (true);

-- JOBS
CREATE POLICY "Public can view active jobs" ON public.jobs FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "Employers can manage own jobs" ON public.jobs FOR ALL USING (auth.uid() = employer_id);

-- APPLICATIONS
CREATE POLICY "Seekers can view own applications" ON public.applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Seekers can submit applications" ON public.applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Employers can view applications for their jobs" ON public.applications FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND employer_id = auth.uid()));
CREATE POLICY "Employers can update application status" ON public.applications FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND employer_id = auth.uid()));

-- SAVED JOBS
CREATE POLICY "Seekers can manage own saved jobs" ON public.saved_jobs FOR ALL USING (auth.uid() = seeker_id);

-- NOTIFICATIONS
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- MESSAGING
CREATE POLICY "Users can view their conversations" ON public.conversations FOR SELECT USING (auth.uid() = seeker_id OR auth.uid() = employer_id);
CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND (seeker_id = auth.uid() OR employer_id = auth.uid())));
CREATE POLICY "Users can insert messages in their conversations" ON public.messages FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND (seeker_id = auth.uid() OR employer_id = auth.uid())));

-- ACCOUNT CLOSE REQUESTS
CREATE POLICY "Employers can submit close requests" ON public.account_close_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own close requests" ON public.account_close_requests FOR SELECT USING (auth.uid() = user_id);

-- ==========================================
-- 4. INDEXES (PERFORMANCE)
-- ==========================================

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_jobs_status_created ON public.jobs(status, created_at DESC);
CREATE INDEX idx_applications_status_created ON public.applications(status, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id) WHERE is_read = false;
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ==========================================
-- 5. AUTOMATED AUDITING TRIGGERS
-- ==========================================

CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    current_uid UUID;
    old_row JSONB := NULL;
    new_row JSONB := NULL;
BEGIN
    current_uid := auth.uid();
    IF (TG_OP = 'DELETE') THEN old_row := to_jsonb(OLD);
    ELSIF (TG_OP = 'UPDATE') THEN old_row := to_jsonb(OLD); new_row := to_jsonb(NEW);
    ELSIF (TG_OP = 'INSERT') THEN new_row := to_jsonb(NEW);
    END IF;

    INSERT INTO public.audit_logs (user_id, action, path, method, status_code, metadata)
    VALUES (current_uid, TG_TABLE_NAME || '_' || TG_OP, 'db_trigger', TG_OP, 200, 
            jsonb_build_object('table', TG_TABLE_NAME, 'old', old_row, 'new', new_row));
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_users_trigger AFTER INSERT OR UPDATE OR DELETE ON public.users FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
CREATE TRIGGER audit_jobs_trigger AFTER INSERT OR UPDATE OR DELETE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
CREATE TRIGGER audit_applications_trigger AFTER INSERT OR UPDATE OR DELETE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
CREATE TRIGGER audit_employers_trigger AFTER INSERT OR UPDATE OR DELETE ON public.employers FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
CREATE TRIGGER audit_saved_jobs_trigger AFTER INSERT OR UPDATE OR DELETE ON public.saved_jobs FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- ==========================================
-- 6. REALTIME CONFIGURATION
-- ==========================================

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

