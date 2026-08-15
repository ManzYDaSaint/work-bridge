-- =================================================================─────────────
-- Aganyu Migration: Standalone Opportunity Ingestion Sources Table
-- Separates Opportunity Ingestion sources completely from Job Ingestion sources
-- =================================================================─────────────

-- 1. Create standalone opportunity_ingestion_sources table
CREATE TABLE IF NOT EXISTS public.opportunity_ingestion_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    connector_type TEXT NOT NULL DEFAULT 'RSS' CHECK (connector_type IN (
        'RSS', 'REST_API', 'CAREER_PAGE', 'HTML_PARSER'
    )),
    base_url TEXT NOT NULL,
    feed_url TEXT,
    default_location TEXT DEFAULT 'Global',
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    auto_publish BOOLEAN DEFAULT false NOT NULL,

    crawl_frequency_minutes INTEGER DEFAULT 720 NOT NULL,
    adaptive_scheduling BOOLEAN DEFAULT true NOT NULL,

    reputation_score INTEGER DEFAULT 80 CHECK (reputation_score BETWEEN 0 AND 100),
    health_status TEXT DEFAULT 'HEALTHY',
    total_jobs_ingested INTEGER DEFAULT 0,
    total_duplicates INTEGER DEFAULT 0,
    total_rejections INTEGER DEFAULT 0,
    last_crawl_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Row Level Security
ALTER TABLE public.opportunity_ingestion_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins full access opportunity_ingestion_sources" ON public.opportunity_ingestion_sources;
CREATE POLICY "Admins full access opportunity_ingestion_sources" ON public.opportunity_ingestion_sources FOR ALL USING (public.is_admin());

-- 2. Update ingested_opportunities_queue reference to point to opportunity_ingestion_sources
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ingested_opportunities_queue_source_id_fkey' 
        AND table_name = 'ingested_opportunities_queue'
    ) THEN
        ALTER TABLE public.ingested_opportunities_queue DROP CONSTRAINT ingested_opportunities_queue_source_id_fkey;
    END IF;
END $$;

ALTER TABLE public.ingested_opportunities_queue 
    ADD CONSTRAINT ingested_opportunities_queue_source_id_fkey 
    FOREIGN KEY (source_id) REFERENCES public.opportunity_ingestion_sources(id) ON DELETE CASCADE;

-- 3. Seed default ScholarshipTab source into opportunity_ingestion_sources
INSERT INTO public.opportunity_ingestion_sources (name, slug, connector_type, base_url, feed_url, default_location, is_enabled, auto_publish, crawl_frequency_minutes)
VALUES
    ('ScholarshipTab (African Students RSS)', 'scholarshiptab-african-rss', 'RSS', 'https://www.scholarshiptab.com', 'https://www.scholarshiptab.com/scholarshipxml.xml', 'Global', true, false, 720)
ON CONFLICT (slug) DO NOTHING;
