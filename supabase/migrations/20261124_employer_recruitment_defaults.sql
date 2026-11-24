-- Migration: 20261124_employer_recruitment_defaults.sql
-- Adds default recruitment and application settings directly to the employers table
-- to streamline job creation for all employers and the Aganyu operations account.

ALTER TABLE public.employers
    ADD COLUMN IF NOT EXISTS default_scheduling_link TEXT,
    ADD COLUMN IF NOT EXISTS default_application_method TEXT DEFAULT 'one_tap',
    ADD COLUMN IF NOT EXISTS default_apply_phone TEXT,
    ADD COLUMN IF NOT EXISTS default_apply_whatsapp TEXT;

COMMENT ON COLUMN public.employers.default_scheduling_link IS 'Default calendar/interview scheduling URL (e.g. Cal.com or Calendly)';
COMMENT ON COLUMN public.employers.recruitment_email IS 'Default email address for receiving candidate applications';
COMMENT ON COLUMN public.employers.recruitment_url IS 'Default careers page or external ATS application URL';
COMMENT ON COLUMN public.employers.default_application_method IS 'Default application channel: one_tap, external_url, email, whatsapp, phone';
