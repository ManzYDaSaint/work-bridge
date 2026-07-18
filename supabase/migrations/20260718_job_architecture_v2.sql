-- ============================================================
-- Migration: Job Architecture V2
-- Adds multi-posting-type, flexible application methods,
-- agency/recruitment sourcing, and display company overrides.
-- All columns have defaults matching current behavior for
-- full backward compatibility with existing rows.
-- ============================================================

-- 1. Application method — controls how candidates apply
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS application_method TEXT NOT NULL DEFAULT 'one_tap'
    CHECK (application_method IN ('one_tap', 'external_url', 'email', 'whatsapp', 'phone', 'manual'));

-- 2. Method-specific contact/redirect fields (all nullable)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS external_apply_url TEXT,
  ADD COLUMN IF NOT EXISTS apply_email TEXT,
  ADD COLUMN IF NOT EXISTS apply_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS apply_phone TEXT,
  ADD COLUMN IF NOT EXISTS application_instructions TEXT;

-- 3. Allow internal one-tap apply alongside an external method
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS allow_one_tap_apply BOOLEAN NOT NULL DEFAULT TRUE;

-- 4. Who is posting — direct employer, agency, or Aganyu
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS posting_type TEXT NOT NULL DEFAULT 'DIRECT'
    CHECK (posting_type IN ('DIRECT', 'AGENCY', 'AGANYU'));

-- 5. Company name displayed to candidates (overrides employer account name)
--    Useful when jobs@aganyu.com posts on behalf of real companies.
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS display_company_name TEXT;

-- 6. Source of the vacancy for analytics and reporting
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS job_source TEXT DEFAULT 'Employer Portal';

-- ============================================================
-- Indexes for analytics queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_jobs_posting_type ON jobs (posting_type);
CREATE INDEX IF NOT EXISTS idx_jobs_application_method ON jobs (application_method);
CREATE INDEX IF NOT EXISTS idx_jobs_job_source ON jobs (job_source);
