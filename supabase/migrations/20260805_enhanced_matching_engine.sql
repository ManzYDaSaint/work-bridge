-- =================================================================─────────────
-- Aganyu Migration: Enhanced Candidate Matching Engine (match_candidates_v2)
-- Evaluates candidates purely on qualifications, skills, and experience.
-- Removes strict location filtering so candidate location does not affect match results.
-- =================================================================─────────────

CREATE OR REPLACE FUNCTION match_candidates_v2(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.25,
  match_count int DEFAULT 50,
  min_experience_years int DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  full_name text,
  similarity float,
  experience_matched boolean
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    job_seekers.id,
    job_seekers.full_name,
    (1 - (job_seekers.embedding <=> query_embedding))::float AS similarity,
    CASE 
      WHEN min_experience_years IS NULL THEN true
      WHEN jsonb_array_length(job_seekers.experience) >= min_experience_years THEN true
      ELSE false
    END AS experience_matched
  FROM job_seekers
  WHERE job_seekers.profile_visibility != 'HIDDEN'
    AND job_seekers.embedding IS NOT NULL
    AND (1 - (job_seekers.embedding <=> query_embedding)) > match_threshold
  ORDER BY job_seekers.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_candidates_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION match_candidates_v2 TO service_role;
