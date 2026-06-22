CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'PENDING' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(referred_id)
);

ALTER TABLE public.job_seekers 
ADD COLUMN IF NOT EXISTS application_limit_bonus INTEGER DEFAULT 0;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access" ON public.referrals FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_referral_code TEXT;
  v_referrer_id UUID;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'JOB_SEEKER');
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';
  
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
    
    IF v_referral_code IS NOT NULL THEN
      SELECT id INTO v_referrer_id FROM public.job_seekers WHERE public_slug = v_referral_code;
      IF v_referrer_id IS NOT NULL THEN
        INSERT INTO public.referrals (referrer_id, referred_id, status)
        VALUES (v_referrer_id, NEW.id, 'PENDING')
        ON CONFLICT (referred_id) DO NOTHING;
      END IF;
    END IF;

  ELSIF v_role = 'EMPLOYER' THEN
    INSERT INTO public.employers (id, company_name, industry, location, status, recruiter_verified)
    VALUES (NEW.id, 'New Company', 'To be updated', 'To be updated', 'PENDING', FALSE)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
