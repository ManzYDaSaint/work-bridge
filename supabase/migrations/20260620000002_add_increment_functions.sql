CREATE OR REPLACE FUNCTION public.increment_seeker_application_limit_bonus(seeker_id UUID, increment_val INT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.job_seekers
  SET application_limit_bonus = GREATEST(0, COALESCE(application_limit_bonus, 0) + increment_val)
  WHERE id = seeker_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.increment_employer_contact_limit_bonus(employer_id UUID, increment_val INT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.employers
  SET contact_limit_bonus = GREATEST(0, COALESCE(contact_limit_bonus, 0) + increment_val)
  WHERE id = employer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
