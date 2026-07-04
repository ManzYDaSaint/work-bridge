-- AI Matching & Recommendations V1
-- This migration updates the embedding dimensions to match all-MiniLM-L6-v2 (384) 
-- and implements the core matching and quota logic.

-- ==========================================
-- 1. FIX DIMENSIONS & SCHEMA
-- ==========================================

-- Drop existing embedding columns to fix dimensions (Warning: this clears existing vectors)
ALTER TABLE public.job_seekers DROP COLUMN IF EXISTS embedding;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS embedding;

-- Re-add with correct dimensions for all-MiniLM-L6-v2
ALTER TABLE public.job_seekers ADD COLUMN embedding vector(384);
ALTER TABLE public.jobs ADD COLUMN embedding vector(384);

-- Add match_score to applications for ranking
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS match_score float;

-- ==========================================
-- 2. MONETIZATION QUOTAS
-- ==========================================

CREATE TABLE public.user_quotas (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  discovery_count INTEGER DEFAULT 0, -- For Employers discovering talent
  recommendation_count INTEGER DEFAULT 0, -- For Seekers viewing recommended jobs
  invite_count INTEGER DEFAULT 0, -- For Employers inviting candidates
  gap_analysis_count INTEGER DEFAULT 0, -- For Skill Gap reports
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Function to check and increment quota
CREATE OR REPLACE FUNCTION public.consume_quota(
  p_user_id UUID, 
  p_quota_type TEXT, 
  p_limit INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_usage INTEGER;
BEGIN
  -- Get current usage
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
    INSERT INTO public.user_quotas (user_id) VALUES (p_user_id);
    v_current_usage := 0;
  END IF;

  -- Check limit
  IF v_current_usage >= p_limit THEN
    RETURN FALSE;
  END IF;

  -- Increment usage
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

-- ==========================================
-- 3. ADVANCED MATCHING FUNCTIONS
-- ==========================================

-- Recommended Candidates for an Employer (based on Job embedding)
CREATE OR REPLACE FUNCTION match_candidates_v2(
  query_embedding vector(384), 
  match_threshold float DEFAULT 0.3, 
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    js.id, 
    js.full_name, 
    1 - (js.embedding <=> query_embedding) AS similarity
  FROM public.job_seekers js
  WHERE 
    js.profile_visibility != 'HIDDEN' 
    AND 1 - (js.embedding <=> query_embedding) > match_threshold
  ORDER BY js.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Recommended Jobs for a Seeker (based on Seeker embedding)
CREATE OR REPLACE FUNCTION match_jobs_for_seeker(
  query_embedding vector(384), 
  match_threshold float DEFAULT 0.3, 
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  company_name TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id, 
    j.title, 
    e.company_name, 
    1 - (j.embedding <=> query_embedding) AS similarity
  FROM public.jobs j
  JOIN public.employers e ON j.employer_id = e.id
  WHERE 
    j.status = 'ACTIVE' 
    AND 1 - (j.embedding <=> query_embedding) > match_threshold
  ORDER BY j.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Find Similar Jobs
CREATE OR REPLACE FUNCTION find_similar_jobs(
  query_embedding vector(384), 
  exclude_job_id UUID,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id, 
    j.title, 
    1 - (j.embedding <=> query_embedding) AS similarity
  FROM public.jobs j
  WHERE 
    j.id != exclude_job_id 
    AND j.status = 'ACTIVE'
  ORDER BY j.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Rank Applicants for a specific job
CREATE OR REPLACE FUNCTION rank_applicants(
  p_job_id UUID
)
RETURNS TABLE (
  application_id UUID,
  user_id UUID,
  full_name TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_job_embedding vector(384);
BEGIN
  SELECT embedding INTO v_job_embedding FROM public.jobs WHERE id = p_job_id;

  RETURN QUERY
  SELECT 
    a.id, 
    a.user_id, 
    js.full_name, 
    1 - (js.embedding <=> v_job_embedding) AS similarity
  FROM public.applications a
  JOIN public.job_seekers js ON a.user_id = js.id
  WHERE a.job_id = p_job_id
  ORDER BY js.embedding <=> v_job_embedding;
END;
$$;

-- Semantic Search for Jobs
CREATE OR REPLACE FUNCTION semantic_search_jobs(
  query_embedding vector(384), 
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id, 
    j.title, 
    1 - (j.embedding <=> query_embedding) AS similarity
  FROM public.jobs j
  WHERE j.status = 'ACTIVE'
  ORDER BY j.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Semantic Search for Seekers
CREATE OR REPLACE FUNCTION semantic_search_seekers(
  query_embedding vector(384), 
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    js.id, 
    js.full_name, 
    1 - (js.embedding <=> query_embedding) AS similarity
  FROM public.job_seekers js
  WHERE js.profile_visibility != 'HIDDEN'
  ORDER BY js.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ==========================================
-- 4. INDEXES
-- ==========================================

CREATE INDEX ON public.job_seekers USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON public.jobs USING hnsw (embedding vector_cosine_ops);
