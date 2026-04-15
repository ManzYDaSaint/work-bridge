-- Add contact fields for direct communication
BEGIN;

ALTER TABLE public.job_seekers
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp BOOLEAN DEFAULT FALSE;

COMMIT;
