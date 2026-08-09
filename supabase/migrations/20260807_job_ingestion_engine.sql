-- =================================================================─────────────
-- Aganyu Migration: Job Ingestion Engine
-- Creates the full data layer for automated job ingestion:
--   1. Source Registry
--   2. Raw Payload Storage
--   3. Ingested Jobs Staging Queue
--   4. AI Response Cache
--   5. Human Feedback Learning
--   6. Extend public.jobs with ingestion metadata
-- =================================================================─────────────

-- =================================================================
-- 1. SOURCE REGISTRY
-- =================================================================

CREATE TABLE IF NOT EXISTS public.job_ingestion_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    connector_type TEXT NOT NULL CHECK (connector_type IN (
        'RSS', 'REST_API', 'CAREER_PAGE', 'HTML_PARSER', 'EMAIL_WEBHOOK'
    )),
    base_url TEXT NOT NULL,
    feed_url TEXT,
    default_location TEXT DEFAULT 'Malawi',
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    auto_publish BOOLEAN DEFAULT false NOT NULL,

    -- Adaptive Scheduling
    crawl_frequency_minutes INTEGER DEFAULT 360 NOT NULL,
    adaptive_scheduling BOOLEAN DEFAULT true NOT NULL,
    min_frequency_minutes INTEGER DEFAULT 15,
    max_frequency_minutes INTEGER DEFAULT 1440,

    -- Dynamic Reputation
    reputation_score INTEGER DEFAULT 80 CHECK (reputation_score BETWEEN 0 AND 100),
    health_status TEXT DEFAULT 'HEALTHY' CHECK (health_status IN (
        'HEALTHY', 'DEGRADED', 'FAILING', 'DISABLED'
    )),
    total_jobs_ingested INTEGER DEFAULT 0,
    total_duplicates INTEGER DEFAULT 0,
    total_rejections INTEGER DEFAULT 0,
    last_crawl_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_job_found_at TIMESTAMPTZ,
    error_count INTEGER DEFAULT 0,
    consecutive_errors INTEGER DEFAULT 0,
    last_error_message TEXT,

    -- Legal Compliance
    robots_allowed BOOLEAN DEFAULT true NOT NULL,
    last_robots_check TIMESTAMPTZ,
    terms_reviewed BOOLEAN DEFAULT false NOT NULL,
    attribution_required BOOLEAN DEFAULT true NOT NULL,
    compliance_notes TEXT,

    -- Connector Config
    auth_config JSONB DEFAULT '{}'::jsonb,
    selector_config JSONB DEFAULT '{}'::jsonb,
    custom_headers JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =================================================================
-- 2. RAW PAYLOAD STORAGE
-- =================================================================

CREATE TABLE IF NOT EXISTS public.ingested_raw_payloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.job_ingestion_sources(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    url TEXT NOT NULL,
    payload TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN (
        'HTML', 'JSON', 'XML', 'RSS', 'TEXT'
    )),
    response_headers JSONB DEFAULT '{}'::jsonb,
    checksum TEXT NOT NULL,
    UNIQUE(source_id, external_id),
    etag TEXT,
    last_modified_header TEXT,
    processing_status TEXT DEFAULT 'PENDING' CHECK (processing_status IN (
        'PENDING', 'PARSING', 'PARSED', 'FAILED', 'SKIPPED_UNCHANGED'
    )),
    error_message TEXT,
    parse_attempts INTEGER DEFAULT 0,
    fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    parsed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(source_id, checksum)
);

-- =================================================================
-- 3. INGESTED JOBS STAGING QUEUE
-- Mirrors public.jobs extractable fields exactly.
-- =================================================================

CREATE TABLE IF NOT EXISTS public.ingested_jobs_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_payload_id UUID REFERENCES public.ingested_raw_payloads(id) ON DELETE SET NULL,
    source_id UUID NOT NULL REFERENCES public.job_ingestion_sources(id) ON DELETE CASCADE,

    -- Extracted Job Fields (1:1 with public.jobs extractable columns)
    title TEXT NOT NULL,
    display_company_name TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    type TEXT DEFAULT 'Full-time' NOT NULL,
    work_mode TEXT DEFAULT 'ON_SITE' NOT NULL,
    skills TEXT[] DEFAULT '{}',
    must_have_skills TEXT[] DEFAULT '{}',
    nice_to_have_skills TEXT[] DEFAULT '{}',
    minimum_years_experience INTEGER DEFAULT 0,
    qualification TEXT,
    salary_range TEXT,
    deadline DATE,
    external_apply_url TEXT,
    apply_email TEXT,
    apply_whatsapp TEXT,
    apply_phone TEXT,
    application_instructions TEXT,

    -- Derived: determined from which apply channels were extracted
    application_method TEXT DEFAULT 'manual' CHECK (application_method IN (
        'external_url', 'email', 'whatsapp', 'phone', 'manual'
    )),

    -- AI & Intelligence Metadata (NOT written to public.jobs)
    extraction_method TEXT DEFAULT 'RULE_ONLY' CHECK (extraction_method IN (
        'RULE_ONLY', 'RULE_PLUS_AI', 'AI_FULL'
    )),
    overall_confidence INTEGER DEFAULT 0,
    field_confidence JSONB DEFAULT '{}'::jsonb,
    ai_model_used TEXT,
    ai_tokens_used INTEGER DEFAULT 0,
    quality_score INTEGER DEFAULT 0,
    scam_risk_score INTEGER DEFAULT 0,
    seniority_level TEXT,
    industry_category TEXT,

    -- Duplicate Detection
    dna_hash TEXT,
    source_url_hash TEXT,
    embedding vector(384),
    duplicate_of_job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    duplicate_similarity NUMERIC,

    -- Review Status
    status TEXT DEFAULT 'PENDING_REVIEW' CHECK (status IN (
        'PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED', 'DUPLICATE'
    )),
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    published_job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =================================================================
-- 4. AI RESPONSE CACHE
-- =================================================================

CREATE TABLE IF NOT EXISTS public.ingested_ai_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_hash TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    model_version TEXT DEFAULT 'gemini-2.0-flash',
    response JSONB NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(content_hash, prompt_version)
);

-- =================================================================
-- 5. HUMAN FEEDBACK LEARNING
-- =================================================================

CREATE TABLE IF NOT EXISTS public.ingested_human_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_item_id UUID REFERENCES public.ingested_jobs_queue(id) ON DELETE SET NULL,
    raw_payload_id UUID REFERENCES public.ingested_raw_payloads(id) ON DELETE SET NULL,
    source_id UUID REFERENCES public.job_ingestion_sources(id) ON DELETE SET NULL,
    field_name TEXT NOT NULL,
    original_value JSONB,
    corrected_value JSONB,
    confidence_at_extraction INTEGER,
    extraction_method TEXT,
    admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =================================================================
-- 6. EXTEND public.jobs WITH INGESTION METADATA
-- =================================================================

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS ai_processed BOOLEAN DEFAULT false;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS ai_model_used TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS ai_confidence INTEGER;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS source_content_hash TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS extraction_version TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS raw_payload_id UUID;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS ingestion_source_id UUID;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMPTZ;

-- =================================================================
-- 7. INDEXES
-- =================================================================

CREATE INDEX IF NOT EXISTS idx_ing_sources_enabled ON public.job_ingestion_sources(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_ing_sources_health ON public.job_ingestion_sources(health_status);
CREATE INDEX IF NOT EXISTS idx_ing_sources_next_crawl ON public.job_ingestion_sources(last_crawl_at, crawl_frequency_minutes) WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_raw_payloads_status ON public.ingested_raw_payloads(processing_status);
CREATE INDEX IF NOT EXISTS idx_raw_payloads_source ON public.ingested_raw_payloads(source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_payloads_checksum ON public.ingested_raw_payloads(checksum);

CREATE INDEX IF NOT EXISTS idx_ing_queue_status ON public.ingested_jobs_queue(status);
CREATE INDEX IF NOT EXISTS idx_ing_queue_source ON public.ingested_jobs_queue(source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ing_queue_dna_hash ON public.ingested_jobs_queue(dna_hash);
CREATE INDEX IF NOT EXISTS idx_ing_queue_url_hash ON public.ingested_jobs_queue(source_url_hash);

CREATE INDEX IF NOT EXISTS idx_ai_cache_lookup ON public.ingested_ai_cache(content_hash, prompt_version);

CREATE INDEX IF NOT EXISTS idx_feedback_source ON public.ingested_human_feedback(source_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_source_hash ON public.jobs(source_content_hash) WHERE source_content_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_ingestion_source ON public.jobs(ingestion_source_id) WHERE ingestion_source_id IS NOT NULL;

-- =================================================================
-- 8. ROW LEVEL SECURITY
-- =================================================================

ALTER TABLE public.job_ingestion_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingested_raw_payloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingested_jobs_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingested_ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingested_human_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access ingestion_sources" ON public.job_ingestion_sources FOR ALL USING (public.is_admin());
CREATE POLICY "Admins full access raw_payloads" ON public.ingested_raw_payloads FOR ALL USING (public.is_admin());
CREATE POLICY "Admins full access jobs_queue" ON public.ingested_jobs_queue FOR ALL USING (public.is_admin());
CREATE POLICY "Admins full access ai_cache" ON public.ingested_ai_cache FOR ALL USING (public.is_admin());
CREATE POLICY "Admins full access human_feedback" ON public.ingested_human_feedback FOR ALL USING (public.is_admin());

-- =================================================================
-- 9. SEED INGESTION AUTOMATION PLUGINS
-- =================================================================

INSERT INTO public.automation_plugins (id, name, description)
VALUES
    ('job-ingestion-crawler', 'Job Ingestion Crawler', 'Fetches job listings from configured sources via the Connector Framework.'),
    ('job-ingestion-parser', 'Job Ingestion Parser', 'Extracts structured job data using rule engine and optional Gemini AI enrichment.'),
    ('job-ingestion-publisher', 'Job Ingestion Publisher', 'Publishes approved ingested jobs to the main jobs table and triggers downstream events.')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = timezone('utc'::text, now());

-- =================================================================
-- 10. HELPER RPC FUNCTIONS & SAMPLE SEED SOURCES
-- =================================================================

CREATE OR REPLACE FUNCTION increment_source_jobs_ingested(source_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.job_ingestion_sources
  SET total_jobs_ingested = total_jobs_ingested + 1,
      last_job_found_at = NOW(),
      updated_at = NOW()
  WHERE id = source_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_source_jobs_ingested TO service_role;

-- Seed default starter job sources for Malawi
INSERT INTO public.job_ingestion_sources (name, slug, connector_type, base_url, feed_url, default_location, is_enabled, auto_publish, crawl_frequency_minutes)
VALUES
    ('Careers Malawi (RSS)', 'careers-malawi-rss', 'RSS', 'https://careersmw.com', 'https://careersmw.com/feed/?post_type=job_listing', 'Malawi', true, false, 360),
    ('JobSearch MW (RSS)', 'jobsearch-mw-rss', 'RSS', 'https://jobsearchmalawi.com', 'https://jobsearchmalawi.com/feed/?post_type=job_listing', 'Malawi', true, false, 360),
    ('Online Jobs MW (API)', 'online-jobs-mw-api', 'REST_API', 'https://onlinejobsmalawi.com', 'https://onlinejobsmalawi.com/api/v1/vacancies', 'Malawi', false, false, 720)
ON CONFLICT (slug) DO NOTHING;

-- =================================================================
-- 11. GLOBAL SYSTEM SETTINGS FOR INGESTION & APPROVAL GATE
-- =================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to system_settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Admins full access system_settings" ON public.system_settings FOR ALL USING (public.is_admin());

-- Default Settings: Ingestion service enabled, Admin approval strictly required
INSERT INTO public.system_settings (key, value, description)
VALUES
    ('ingestion_service_enabled', 'true'::jsonb, 'Master kill switch for automated job crawler & parser service'),
    ('ingestion_require_admin_approval', 'true'::jsonb, 'Require manual admin review before any scraped job goes live')
ON CONFLICT (key) DO NOTHING;


