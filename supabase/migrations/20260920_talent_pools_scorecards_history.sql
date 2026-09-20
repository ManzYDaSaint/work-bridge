-- =================================================================─────────────
-- Migration: Add Talent Pools, Evaluation Scorecards & Application History
-- Date: 2026-09-20
-- =================================================================─────────────

-- 1. Employer Talent Pools
CREATE TABLE IF NOT EXISTS public.employer_talent_pools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID REFERENCES public.employers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color_tag TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Talent Pool Members
CREATE TABLE IF NOT EXISTS public.talent_pool_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pool_id UUID REFERENCES public.employer_talent_pools(id) ON DELETE CASCADE NOT NULL,
  seeker_id UUID REFERENCES public.job_seekers(id) ON DELETE CASCADE NOT NULL,
  notes TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(pool_id, seeker_id)
);

-- 3. Application Evaluation Scorecards
CREATE TABLE IF NOT EXISTS public.application_evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  evaluator_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  technical_rating INTEGER CHECK (technical_rating BETWEEN 1 AND 5),
  experience_rating INTEGER CHECK (experience_rating BETWEEN 1 AND 5),
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  overall_score NUMERIC(3, 2),
  recommendation TEXT CHECK (recommendation IN ('STRONG_YES', 'YES', 'NEUTRAL', 'NO')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(application_id, evaluator_id)
);

-- 4. Application History Timeline
CREATE TABLE IF NOT EXISTS public.application_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  from_status public.application_status,
  to_status public.application_status NOT NULL,
  changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.employer_talent_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_pool_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Employers can manage their own talent pools"
  ON public.employer_talent_pools FOR ALL
  USING (auth.uid() = employer_id);

CREATE POLICY "Employers can manage pool members"
  ON public.talent_pool_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.employer_talent_pools
      WHERE id = talent_pool_members.pool_id
      AND employer_id = auth.uid()
    )
  );

CREATE POLICY "Evaluators can view and edit their application scorecards"
  ON public.application_evaluations FOR ALL
  USING (auth.uid() = evaluator_id);

CREATE POLICY "Seekers and Employers can view application history"
  ON public.application_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.id = application_history.application_id
      AND (a.user_id = auth.uid() OR j.employer_id = auth.uid())
    )
  );
