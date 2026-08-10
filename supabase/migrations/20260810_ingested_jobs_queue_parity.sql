-- Align ingested_jobs_queue with public.jobs posting fields for full admin-review parity.

ALTER TABLE public.ingested_jobs_queue
    ADD COLUMN IF NOT EXISTS screening_questions JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS posting_type TEXT NOT NULL DEFAULT 'AGANYU',
    ADD COLUMN IF NOT EXISTS allow_one_tap_apply BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS job_source TEXT DEFAULT 'Ingestion Engine';

ALTER TABLE public.ingested_jobs_queue
    DROP CONSTRAINT IF EXISTS ingested_jobs_queue_posting_type_check;

ALTER TABLE public.ingested_jobs_queue
    ADD CONSTRAINT ingested_jobs_queue_posting_type_check
    CHECK (posting_type IN ('DIRECT', 'AGENCY', 'AGANYU'));

ALTER TABLE public.ingested_jobs_queue
    DROP CONSTRAINT IF EXISTS ingested_jobs_queue_application_method_check;

ALTER TABLE public.ingested_jobs_queue
    ADD CONSTRAINT ingested_jobs_queue_application_method_check
    CHECK (application_method IN ('one_tap', 'external_url', 'email', 'whatsapp', 'phone', 'manual'));
