-- 1. Add profile_views to job_seekers
ALTER TABLE public.job_seekers ADD COLUMN IF NOT EXISTS profile_views INTEGER DEFAULT 0;

-- 2. Create employer_saved_candidates table
CREATE TABLE IF NOT EXISTS public.employer_saved_candidates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employer_id UUID REFERENCES public.employers(id) ON DELETE CASCADE NOT NULL,
    seeker_id UUID REFERENCES public.job_seekers(id) ON DELETE CASCADE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(employer_id, seeker_id)
);

-- 3. RLS for employer_saved_candidates
ALTER TABLE public.employer_saved_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers can manage own saved candidates" 
ON public.employer_saved_candidates FOR ALL 
USING (auth.uid() = employer_id);
