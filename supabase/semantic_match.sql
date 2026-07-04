-- Enable the pgvector extension to enable vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to job_seekers for semantic profile search
ALTER TABLE public.job_seekers 
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Add embedding column to jobs for semantic job search
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Create a function to perform semantic matching
-- This function returns seekers ordered by their cosine similarity to a job's embedding
CREATE OR REPLACE FUNCTION match_candidates(
  query_embedding vector(768), 
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

-- Create indexes for high-performance vector search
CREATE INDEX ON public.job_seekers USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON public.jobs USING hnsw (embedding vector_cosine_ops);
