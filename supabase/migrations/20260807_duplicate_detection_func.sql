-- Function for duplicate job detection using pgvector cosine distance
CREATE OR REPLACE FUNCTION match_duplicate_jobs(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.88,
  match_count int DEFAULT 1
)
RETURNS TABLE (
  id uuid,
  title text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    jobs.id,
    jobs.title,
    (1 - (jobs.embedding <=> query_embedding))::float AS similarity
  FROM jobs
  WHERE jobs.embedding IS NOT NULL
    AND (1 - (jobs.embedding <=> query_embedding)) >= match_threshold
  ORDER BY jobs.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_duplicate_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION match_duplicate_jobs TO service_role;
