-- =============================================================================
-- Fix: Allow opportunity_ingestion_sources to write to ingested_raw_payloads
--
-- Root Cause: ingested_raw_payloads.source_id has a FK constraint to
-- job_ingestion_sources(id), which blocks opportunity source IDs.
--
-- Solution: Drop the FK on source_id to make the column a generic UUID
-- that works for both job and opportunity ingestion sources.
-- =============================================================================

-- 1. Drop the existing FK constraint on source_id
ALTER TABLE public.ingested_raw_payloads
    DROP CONSTRAINT IF EXISTS ingested_raw_payloads_source_id_fkey;

-- 2. Add a source_type column to distinguish job vs opportunity payloads
ALTER TABLE public.ingested_raw_payloads
    ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'JOB'
    CHECK (source_type IN ('JOB', 'OPPORTUNITY'));

-- 3. Create index for filtering by source_type
CREATE INDEX IF NOT EXISTS idx_raw_payloads_source_type ON public.ingested_raw_payloads(source_type);
