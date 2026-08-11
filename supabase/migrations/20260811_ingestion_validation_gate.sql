-- Finish the Job Intelligence Engine validation gate support.
-- Adds the separate repair queue state and source-level discovery filters
-- already used by the crawler.

ALTER TABLE public.job_ingestion_sources
    ADD COLUMN IF NOT EXISTS path_whitelist TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS path_blacklist TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS discovery_keywords TEXT[] DEFAULT '{}';

ALTER TABLE public.job_ingestion_sources
    DROP CONSTRAINT IF EXISTS job_ingestion_sources_connector_type_check;

ALTER TABLE public.job_ingestion_sources
    ADD CONSTRAINT job_ingestion_sources_connector_type_check
    CHECK (connector_type IN (
        'RSS',
        'REST_API',
        'CAREER_PAGE',
        'HTML_PARSER',
        'EMAIL_WEBHOOK',
        'GREENHOUSE',
        'LEVER',
        'ASHBY',
        'WORKDAY',
        'SMARTRECRUITERS',
        'WORDPRESS_JOBS'
    ));

ALTER TABLE public.ingested_jobs_queue
    DROP CONSTRAINT IF EXISTS ingested_jobs_queue_status_check;

ALTER TABLE public.ingested_jobs_queue
    ADD CONSTRAINT ingested_jobs_queue_status_check
    CHECK (status IN (
        'PENDING_REVIEW',
        'NEEDS_MORE_DATA',
        'APPROVED',
        'PUBLISHED',
        'REJECTED',
        'DUPLICATE'
    ));

CREATE INDEX IF NOT EXISTS idx_ing_sources_discovery_keywords
    ON public.job_ingestion_sources USING GIN (discovery_keywords);
