-- =================================================================─────────────
-- Aganyu Migration: Opportunity Ingestion Engine & Schema Enhancements
-- 1. Extend opportunities table with host_institutions, target_regions, and gender_eligibility
-- 2. Create ingested_opportunities_queue for raw/parsed opportunity staging
-- 3. Register opportunity ingestion automation plugins
-- 4. Seed default Opportunity ingestion sources (ScholarshipTab)
-- =================================================================─────────────

-- 1. Extend opportunities table
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS target_regions TEXT[] DEFAULT ARRAY['GLOBAL']::TEXT[];
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS host_institutions TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS gender_eligibility TEXT DEFAULT 'ANY' CHECK (gender_eligibility IN ('ANY', 'WOMEN_ONLY', 'MEN_ONLY'));

ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS ai_processed BOOLEAN DEFAULT false;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS ai_model_used TEXT;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS ai_confidence INTEGER;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS source_content_hash TEXT;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS raw_payload_id UUID;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS ingestion_source_id UUID;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMPTZ;

-- 2. Create ingested_opportunities_queue table
CREATE TABLE IF NOT EXISTS public.ingested_opportunities_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_payload_id UUID REFERENCES public.ingested_raw_payloads(id) ON DELETE SET NULL,
    source_id UUID REFERENCES public.job_ingestion_sources(id) ON DELETE CASCADE,

    -- Extracted Opportunity Fields
    title TEXT NOT NULL,
    organization_name TEXT NOT NULL,
    description TEXT NOT NULL,
    short_description TEXT,
    category TEXT DEFAULT 'SCHOLARSHIP' NOT NULL,
    country TEXT DEFAULT 'Global',
    location_type TEXT DEFAULT 'GLOBAL',
    application_url TEXT NOT NULL,
    contact_email TEXT,
    deadline DATE,
    eligibility_requirements TEXT,
    education_requirements TEXT,
    required_skills TEXT[] DEFAULT '{}',
    required_certifications TEXT[] DEFAULT '{}',
    age_min INTEGER,
    age_max INTEGER,
    experience_years_min INTEGER DEFAULT 0,
    funding_type TEXT DEFAULT 'FULL_FUNDING',
    funding_amount TEXT,
    target_regions TEXT[] DEFAULT ARRAY['GLOBAL']::TEXT[],
    host_institutions TEXT[] DEFAULT ARRAY[]::TEXT[],
    gender_eligibility TEXT DEFAULT 'ANY',

    -- AI & Intelligence Metadata
    extraction_method TEXT DEFAULT 'AI_FULL',
    overall_confidence INTEGER DEFAULT 0,
    field_confidence JSONB DEFAULT '{}'::jsonb,
    ai_model_used TEXT,
    ai_tokens_used INTEGER DEFAULT 0,

    -- Duplicate & Staging Control
    dna_hash TEXT,
    source_url_hash TEXT,
    duplicate_of_opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
    duplicate_similarity NUMERIC,

    -- Review Status
    status TEXT DEFAULT 'PENDING_REVIEW' CHECK (status IN (
        'PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED', 'DUPLICATE'
    )),
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    published_opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ing_opps_status ON public.ingested_opportunities_queue(status);
CREATE INDEX IF NOT EXISTS idx_ing_opps_source ON public.ingested_opportunities_queue(source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ing_opps_dna_hash ON public.ingested_opportunities_queue(dna_hash);
CREATE INDEX IF NOT EXISTS idx_ing_opps_url_hash ON public.ingested_opportunities_queue(source_url_hash);

-- Row Level Security
ALTER TABLE public.ingested_opportunities_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access opps_queue" ON public.ingested_opportunities_queue FOR ALL USING (public.is_admin());

-- Register Opportunity Ingestion Automation Plugins
INSERT INTO public.automation_plugins (id, name, description)
VALUES
    ('opportunity-ingestion-crawler', 'Opportunity Ingestion Crawler', 'Fetches scholarship & opportunity listings from configured sources.'),
    ('opportunity-ingestion-parser', 'Opportunity Ingestion Parser', 'Extracts structured scholarship data using Gemini AI parser.'),
    ('opportunity-ingestion-publisher', 'Opportunity Ingestion Publisher', 'Publishes approved ingested opportunities to the main opportunities table.')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = timezone('utc'::text, now());

-- Seed default ScholarshipTab source in job_ingestion_sources
INSERT INTO public.job_ingestion_sources (name, slug, connector_type, base_url, feed_url, default_location, is_enabled, auto_publish, crawl_frequency_minutes)
VALUES
    ('ScholarshipTab (African Students RSS)', 'scholarshiptab-african-rss', 'RSS', 'https://www.scholarshiptab.com', 'https://www.scholarshiptab.com/scholarshipxml.xml', 'Global', true, false, 720)
ON CONFLICT (slug) DO NOTHING;
