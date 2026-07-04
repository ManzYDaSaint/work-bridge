-- Monetization Quota V2
-- This migration implements dynamic limits based on user plans and time-based resets.

-- ==========================================
-- 1. SCHEMA UPDATES
-- ==========================================

-- Add a reset_at column to track the start of the current quota window
ALTER TABLE public.user_quotas ADD COLUMN IF NOT EXISTS reset_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- ==========================================
-- 2. UPDATED QUOTA LOGIC
-- ==========================================

CREATE OR REPLACE FUNCTION public.consume_quota(
  p_user_id UUID, 
  p_quota_type TEXT, 
  p_default_limit INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_usage INTEGER;
  v_plan TEXT;
  v_dynamic_limit INTEGER := p_default_limit;
  v_reset_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 1. Determine the user's plan for dynamic limits
  -- Check employers table first, then fallback to subscriptions
  SELECT plan INTO v_plan FROM public.employers WHERE id = p_user_id;
  
  IF v_plan IS NULL THEN
    SELECT plan INTO v_plan FROM public.subscriptions WHERE user_id = p_user_id AND status = 'ACTIVE' LIMIT 1;
  END IF;

  -- 2. Apply Dynamic Limit based on plan
  -- FREE: default_limit
  -- PRO: 10x default_limit
  -- ENTERPRISE: Unlimited
  IF v_plan = 'PRO' THEN
    v_dynamic_limit := p_default_limit * 10;
  ELSIF v_plan = 'ENTERPRISE' THEN
    RETURN TRUE; -- Unlimited access
  END IF;

  -- 3. Handle Time-based Reset (Daily)
  SELECT 
    discovery_count, 
    recommendation_count, 
    invite_count, 
    gap_analysis_count, 
    reset_at 
  INTO 
    v_current_usage, 
    v_current_usage, -- reuse variable for check
    v_current_usage, 
    v_current_usage, 
    v_reset_at
  FROM public.user_quotas
  WHERE user_id = p_user_id;

  -- Reset usage if more than 24 hours have passed
  IF v_reset_at IS NULL OR v_reset_at < (now() - INTERVAL '24 hours') THEN
    UPDATE public.user_quotas
    SET 
      discovery_count = 0,
      recommendation_count = 0,
      invite_count = 0,
      gap_analysis_count = 0,
      reset_at = now()
    WHERE user_id = p_user_id;
    
    v_current_usage := 0;
  END IF;

  -- Re-fetch usage after possible reset
  SELECT 
    CASE 
      WHEN p_quota_type = 'discovery' THEN discovery_count
      WHEN p_quota_type = 'recommendation' THEN recommendation_count
      WHEN p_quota_type = 'invite' THEN invite_count
      WHEN p_quota_type = 'gap_analysis' THEN gap_analysis_count
      ELSE 0 
    END INTO v_current_usage
  FROM public.user_quotas
  WHERE user_id = p_user_id;

  -- Initialize if not exists
  IF v_current_usage IS NULL THEN
    INSERT INTO public.user_quotas (user_id, reset_at) VALUES (p_user_id, now());
    v_current_usage := 0;
  END IF;

  -- 4. Final Limit Check
  IF v_current_usage >= v_dynamic_limit THEN
    RETURN FALSE;
  END IF;

  -- 5. Increment usage
  UPDATE public.user_quotas
  SET 
    discovery_count = CASE WHEN p_quota_type = 'discovery' THEN discovery_count + 1 ELSE discovery_count END,
    recommendation_count = CASE WHEN p_quota_type = 'recommendation' THEN recommendation_count + 1 ELSE recommendation_count END,
    invite_count = CASE WHEN p_quota_type = 'invite' THEN invite_count + 1 ELSE invite_count END,
    gap_analysis_count = CASE WHEN p_quota_type = 'gap_analysis' THEN gap_analysis_count + 1 ELSE gap_analysis_count END,
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
