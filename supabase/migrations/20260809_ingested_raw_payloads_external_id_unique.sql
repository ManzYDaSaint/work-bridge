-- Migration: Enforce unique external_id per ingestion source for raw payloads
-- Removes any duplicate raw payload rows and creates a unique constraint.

BEGIN;

-- Remove duplicate raw payload rows if any exist.
DELETE FROM public.ingested_raw_payloads a
USING public.ingested_raw_payloads b
WHERE a.source_id = b.source_id
  AND a.external_id = b.external_id
  AND a.id > b.id;

-- Add a unique index to prevent duplicate raw payloads for the same source.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ing_raw_payloads_source_external_id
ON public.ingested_raw_payloads(source_id, external_id);

COMMIT;
