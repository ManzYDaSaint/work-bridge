-- WorkBridge Supabase Schema

-- 1. Users table (Public profile linked to auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'JOB_SEEKER' CHECK (role IN ('JOB_SEEKER', 'EMPLOYER', 'ADMIN')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Job Seekers table
CREATE TABLE public.job_seekers (
  id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  bio TEXT,
  location TEXT,
  skills TEXT[], -- Array of skills
  resume_url TEXT,
  completion INTEGER DEFAULT 0,
  is_subscribed BOOLEAN DEFAULT FALSE,
  experience JSONB[], -- Array of objects: { role, company, startDate, endDate, description }
  salary_expectation TEXT,
  seniority_level TEXT,
  employment_type TEXT,
  anonymized_summary TEXT,
  top_verification_tier INTEGER DEFAULT -1,
  email_alias TEXT,
  privacy_level TEXT DEFAULT 'VERIFIED_ONLY',
  new_job_alerts BOOLEAN DEFAULT TRUE,
  app_status_pulse BOOLEAN DEFAULT TRUE,
  marketing_insights BOOLEAN DEFAULT FALSE
);

-- 3. Employers table
CREATE TABLE public.employers (
  id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  company_name TEXT NOT NULL,
  industry TEXT,
  location TEXT,
  logo_url TEXT,
  website TEXT,
  description TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  profile_views INTEGER DEFAULT 0,
  application_alerts BOOLEAN DEFAULT TRUE,
  hiring_velocity BOOLEAN DEFAULT TRUE,
  candidate_privacy BOOLEAN DEFAULT FALSE
);

-- 4. Jobs table
CREATE TABLE public.jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID REFERENCES public.employers(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  type TEXT NOT NULL, -- e.g., 'FULL_TIME', 'PART_TIME', etc.
  skills TEXT[],
  salary_range TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Applications table
CREATE TABLE public.applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'SHORTLISTED', 'INTERVIEWING', 'INVITED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(job_id, user_id) -- Prevent double applications
);

-- 6. Notifications table
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  type TEXT, -- e.g., 'SUCCESS', 'WARNING', 'ERROR'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Audit Logs table
CREATE TABLE public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  path TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  ip TEXT,
  metadata JSONB, -- Added for rich action detail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Notes table
CREATE TABLE public.notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  plan TEXT DEFAULT 'FREE' CHECK (plan IN ('FREE', 'PREMIUM')),
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELED', 'EXPIRED')),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE
);

-- 10. Transactions table
CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
  tx_ref TEXT UNIQUE NOT NULL,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Certificates table (Job Seeker credentials)
CREATE TABLE public.certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seeker_id UUID REFERENCES public.job_seekers(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  issuer TEXT,
  issue_date DATE,
  credential_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_tier INTEGER DEFAULT -1, -- -1: Unverified, 0-4: Tiers
  verification_confidence NUMERIC,
  verification_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Profile Reveals table (Privacy management)
CREATE TABLE public.profile_reveals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID REFERENCES public.employers(id) ON DELETE CASCADE NOT NULL,
  seeker_id UUID REFERENCES public.job_seekers(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(employer_id, seeker_id)
);

-- Row Level Security (RLS)
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seekers can manage own certificates" ON public.certificates
  FOR ALL USING (auth.uid() = seeker_id);

CREATE POLICY "Anyone can view verified certificates" ON public.certificates
  FOR SELECT USING (is_verified = true);

-- 12. Row Level Security (RLS) - Basic Setup
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_seekers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_reveals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 11. RLS Policies

-- Job Seekers: Can always manage their own profile
CREATE POLICY "Seekers can manage own profile" ON public.job_seekers
  FOR ALL USING (auth.uid() = id);

-- Everyone (Authenticated): Can view anonymized seeker data
CREATE POLICY "Everyone can view anonymized seeker data" ON public.job_seekers
  FOR SELECT TO authenticated USING (true);

-- Employers: Can view FULL profile IF reveal is APPROVED
CREATE POLICY "Approved employers can view full seeker profile" ON public.job_seekers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profile_reveals 
      WHERE seeker_id = public.job_seekers.id 
      AND employer_id = auth.uid() 
      AND status = 'APPROVED'
    )
  );


-- 12. Automated Auditing Triggers
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    current_uid UUID;
    old_row JSONB := NULL;
    new_row JSONB := NULL;
BEGIN
    -- Get the authenticated user ID from Supabase auth
    current_uid := auth.uid();

    IF (TG_OP = 'DELETE') THEN
        old_row := to_jsonb(OLD);
    ELSIF (TG_OP = 'UPDATE') THEN
        old_row := to_jsonb(OLD);
        new_row := to_jsonb(NEW);
    ELSIF (TG_OP = 'INSERT') THEN
        new_row := to_jsonb(NEW);
    END IF;

    INSERT INTO public.audit_logs (
        user_id,
        action,
        path,
        method,
        status_code,
        metadata
    ) VALUES (
        current_uid,
        TG_TABLE_NAME || '_' || TG_OP,
        'db_trigger',
        TG_OP,
        200,
        jsonb_build_object(
            'table', TG_TABLE_NAME,
            'old', old_row,
            'new', new_row
        )
    );

    RETURN NULL; -- result is ignored since this is an AFTER trigger
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_users_trigger ON public.users;
CREATE TRIGGER audit_users_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_jobs_trigger ON public.jobs;
CREATE TRIGGER audit_jobs_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_applications_trigger ON public.applications;
CREATE TRIGGER audit_applications_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_employers_trigger ON public.employers;
CREATE TRIGGER audit_employers_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.employers
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_transactions_trigger ON public.transactions;
CREATE TRIGGER audit_transactions_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_subscriptions_trigger ON public.subscriptions;
CREATE TRIGGER audit_subscriptions_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_certificates_trigger ON public.certificates;
CREATE TRIGGER audit_certificates_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.certificates
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_profile_reveals_trigger ON public.profile_reveals;
CREATE TRIGGER audit_profile_reveals_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.profile_reveals
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- RLS Policies for profile_reveals
CREATE POLICY "Employers can manage own reveals" ON public.profile_reveals
  FOR ALL USING (auth.uid() = employer_id);
  
CREATE POLICY "Seekers can view reveals for them" ON public.profile_reveals
  FOR SELECT USING (auth.uid() = seeker_id);

CREATE POLICY "Seekers can update reveals for them" ON public.profile_reveals
  FOR UPDATE USING (auth.uid() = seeker_id);

-- 13. Conversations table
CREATE TABLE public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seeker_id UUID REFERENCES public.job_seekers(id) ON DELETE CASCADE NOT NULL,
  employer_id UUID REFERENCES public.employers(id) ON DELETE CASCADE NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(seeker_id, employer_id)
);

-- 14. Messages table
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security for Messaging
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = seeker_id OR auth.uid() = employer_id);

CREATE POLICY "Users can insert messages in their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = conversation_id 
      AND (seeker_id = auth.uid() OR employer_id = auth.uid())
    )
  );

CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = conversation_id 
      AND (seeker_id = auth.uid() OR employer_id = auth.uid())
    )
  );

-- Enable Supabase Realtime
-- This is usually done via the Supabase Dashboard, but can be done via SQL
-- Note: Realtime might not catch up immediately if the publication doesn't exist.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- 15. Saved Jobs table
CREATE TABLE public.saved_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seeker_id UUID REFERENCES public.job_seekers(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(seeker_id, job_id)
);

-- RLS for Saved Jobs
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seekers can manage own saved jobs" ON public.saved_jobs
  FOR ALL USING (auth.uid() = seeker_id);

-- Audit Trigger for Saved Jobs
CREATE TRIGGER audit_saved_jobs_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.saved_jobs
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

