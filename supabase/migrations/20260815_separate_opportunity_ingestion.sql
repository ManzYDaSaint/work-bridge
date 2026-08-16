-- =================================================================─────────────
-- Aganyu Migration: Separate Opportunity Ingestion Tables
-- Fully segregates Opportunity Ingestion from Job Ingestion schema
-- =================================================================─────────────

-- 1. Create dedicated opportunity raw payloads table
CREATE TABLE IF NOT EXISTS public.ingested_opportunity_raw_payloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.opportunity_ingestion_sources(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    url TEXT NOT NULL,
    payload TEXT NOT NULL,
    content_type TEXT DEFAULT 'HTML' CHECK (content_type IN ('HTML', 'TEXT', 'JSON', 'RSS', 'XML', 'PDF')),
    checksum TEXT NOT NULL,
    processing_status TEXT DEFAULT 'PENDING' CHECK (processing_status IN (
        'PENDING', 'PARSED', 'FAILED', 'SKIPPED_UNCHANGED'
    )),
    error_log TEXT,
    parsed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(source_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_opp_raw_payloads_status ON public.ingested_opportunity_raw_payloads(processing_status);
CREATE INDEX IF NOT EXISTS idx_opp_raw_payloads_source ON public.ingested_opportunity_raw_payloads(source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opp_raw_payloads_checksum ON public.ingested_opportunity_raw_payloads(checksum);

ALTER TABLE public.ingested_opportunity_raw_payloads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins full access opp_raw_payloads" ON public.ingested_opportunity_raw_payloads;
CREATE POLICY "Admins full access opp_raw_payloads" ON public.ingested_opportunity_raw_payloads FOR ALL USING (public.is_admin());

-- 2. Update ingested_opportunities_queue reference if needed
ALTER TABLE public.ingested_opportunities_queue 
    DROP CONSTRAINT IF EXISTS ingested_opportunities_queue_raw_payload_id_fkey;

ALTER TABLE public.ingested_opportunities_queue
    ADD CONSTRAINT ingested_opportunities_queue_raw_payload_id_fkey 
    FOREIGN KEY (raw_payload_id) 
    REFERENCES public.ingested_opportunity_raw_payloads(id) 
    ON DELETE SET NULL;

ALTER TABLE public.ingested_opportunities_queue
    DROP CONSTRAINT IF EXISTS ingested_opportunities_queue_source_id_fkey;

ALTER TABLE public.ingested_opportunities_queue
    ADD CONSTRAINT ingested_opportunities_queue_source_id_fkey 
    FOREIGN KEY (source_id) 
    REFERENCES public.opportunity_ingestion_sources(id) 
    ON DELETE SET NULL;
