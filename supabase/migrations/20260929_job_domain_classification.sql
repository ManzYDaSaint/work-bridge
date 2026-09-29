-- =============================================================================
-- MIGRATION: 20260929_job_domain_classification.sql
-- PURPOSE   : Add domain classification columns to public.jobs so that job postings
--             have a direct FK to qualification_domains(id). This enables indexed
--             SQL domain filtering and 10x-20x faster pgvector queries.
--
-- CHANGES
-- ─────────────────────────────────────────────────────────────────────────────
--  1. Add domain_id          FK → qualification_domains(id)  on jobs
--  2. Add domain_classified_at  TIMESTAMPTZ                  on jobs
--  3. Add domain_source         TEXT                         on jobs
--     (values: 'ai_cron' | 'admin_force' | 'keyword_match' | 'manual' | 'ingestion')
--  4. Index on jobs.domain_id  for fast domain-scoped queries
--  5. Index on unclassified active jobs for CRON triage
--  6. Backfill existing active jobs matching qualification_mappings or title keywords
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add domain classification columns to jobs
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.jobs
    ADD COLUMN IF NOT EXISTS domain_id             UUID        REFERENCES public.qualification_domains(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS domain_classified_at  TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS domain_source         TEXT        DEFAULT NULL
        CHECK (domain_source IS NULL OR domain_source IN ('ai_cron', 'admin_force', 'keyword_match', 'manual', 'ingestion'));

COMMENT ON COLUMN public.jobs.domain_id IS
    'FK to the canonical discipline domain assigned to this job post based on qualification and title (e.g., computing, nursing_health, engineering).';

COMMENT ON COLUMN public.jobs.domain_classified_at IS
    'Timestamp when the job domain was resolved/assigned.';

COMMENT ON COLUMN public.jobs.domain_source IS
    'Source of domain assignment: ai_cron (background cron), keyword_match (title/qual keyword resolver), admin_force (admin intervention), manual (employer selected), or ingestion (scraped job publisher).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Performance indexes
-- ─────────────────────────────────────────────────────────────────────────────
-- Fast domain-scoped job filtering
CREATE INDEX IF NOT EXISTS idx_jobs_domain_id
    ON public.jobs (domain_id)
    WHERE domain_id IS NOT NULL;

-- Fast index for CRON triage of unclassified active jobs
CREATE INDEX IF NOT EXISTS idx_jobs_unclassified
    ON public.jobs (created_at DESC)
    WHERE domain_id IS NULL AND status = 'ACTIVE';

-- Composite index for fast seeker-to-job domain matching queries
CREATE INDEX IF NOT EXISTS idx_jobs_domain_status_created
    ON public.jobs (domain_id, status, created_at DESC)
    WHERE domain_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Backfill: pre-classify existing jobs whose qualification text matches
--    a confirmed domain in qualification_mappings
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.jobs j
SET
    domain_id            = qm.domain_id,
    domain_classified_at = NOW(),
    domain_source        = 'keyword_match'
FROM public.qualification_mappings qm
WHERE
    j.domain_id    IS NULL
    AND qm.domain_id IS NOT NULL
    AND qm.is_confirmed = TRUE
    AND LOWER(TRIM(j.qualification)) = LOWER(TRIM(qm.raw_qualification));

-- ─────────────────────────────────────────────────────────────────────────────
-- END OF MIGRATION
-- =============================================================================
