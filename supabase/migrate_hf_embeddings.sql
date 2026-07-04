-- Migration: Transition from Gemini (768) to HuggingFace MiniLM (384)
-- ===================================================================

-- 1. Remove existing vector columns and indexes
-- We must drop them because dimensions are changing from 768 to 384
ALTER TABLE public.job_seekers DROP COLUMN IF EXISTS embedding;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS embedding;

-- 2. Add new 384-dimension vector columns
ALTER TABLE public.job_seekers ADD COLUMN embedding vector(384);
ALTER TABLE public.jobs ADD COLUMN embedding vector(384);

-- 3. Re-create the semantic matching function with the new dimension
CREATE OR REPLACE FUNCTION match_candidates(
  query_embedding vector(384), 
  match_threshold float, 
  match_count int
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

-- 4. Re-create HNSW indexes for high-performance search
CREATE INDEX ON public.job_seekers USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON public.jobs USING hnsw (embedding vector_cosine_ops);
