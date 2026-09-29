-- =============================================================================
-- MIGRATION: 20260929_seeker_domain_classification.sql
-- PURPOSE   : Persist qualification domain assignment directly on job_seekers
--             so the matching engine can use a stored FK lookup instead of
--             recomputing domain strings on every match evaluation.
--
-- CHANGES
-- ─────────────────────────────────────────────────────────────────────────────
--  1. Add domain_id          FK → qualification_domains(id)  on job_seekers
--  2. Add domain_classified_at  TIMESTAMPTZ                  on job_seekers
--  3. Add domain_source         TEXT                         on job_seekers
--     (values: 'ai_cron' | 'admin_force' | 'keyword_match' | 'manual')
--  4. Create seeker_domain_overrides  — audit log of all domain changes
--  5. Index on job_seekers.domain_id  for fast domain-scoped queries
--  6. Admin-visible view: v_seekers_domain_status
--     ├── Seekers WITH a domain assigned  (classified)
--     └── Seekers WITHOUT any domain      (unassigned / needs intervention)
--  7. RLS policies for the audit table
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add domain classification columns to job_seekers
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.job_seekers
    ADD COLUMN IF NOT EXISTS domain_id             UUID        REFERENCES public.qualification_domains(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS domain_classified_at  TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS domain_source         TEXT        DEFAULT NULL
        CHECK (domain_source IS NULL OR domain_source IN ('ai_cron', 'admin_force', 'keyword_match', 'manual'));

COMMENT ON COLUMN public.job_seekers.domain_id IS
    'FK to the canonical discipline domain assigned to this seeker based on their education qualification (e.g., computing, nursing_health, engineering).';

COMMENT ON COLUMN public.job_seekers.domain_classified_at IS
    'Timestamp when the domain was last resolved/assigned. NULL means the seeker has never been classified.';

COMMENT ON COLUMN public.job_seekers.domain_source IS
    'Who/what assigned the domain: ai_cron (background cron job), admin_force (admin clicked Classify with AI), keyword_match (static DISCIPLINE_DOMAINS keyword map), or manual (admin manually selected).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Performance index — domain-scoped candidate queries
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_job_seekers_domain_id
    ON public.job_seekers (domain_id)
    WHERE domain_id IS NOT NULL;

-- Index to efficiently find ALL unclassified seekers (admin intervention queue)
CREATE INDEX IF NOT EXISTS idx_job_seekers_unclassified
    ON public.job_seekers (created_at DESC)
    WHERE domain_id IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Audit table — full history of every domain change per seeker
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seeker_domain_overrides (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    seeker_id       UUID        NOT NULL REFERENCES public.job_seekers(id) ON DELETE CASCADE,
    old_domain_id   UUID        REFERENCES public.qualification_domains(id) ON DELETE SET NULL,
    new_domain_id   UUID        REFERENCES public.qualification_domains(id) ON DELETE SET NULL,
    changed_by      UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    source          TEXT        NOT NULL DEFAULT 'manual'
        CHECK (source IN ('ai_cron', 'admin_force', 'keyword_match', 'manual')),
    raw_qualification_used TEXT,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.seeker_domain_overrides IS
    'Full audit trail of every domain assignment or override made for a job seeker. Used by Admin to review classification history.';

CREATE INDEX IF NOT EXISTS idx_seeker_domain_overrides_seeker
    ON public.seeker_domain_overrides (seeker_id, changed_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS for seeker_domain_overrides
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.seeker_domain_overrides ENABLE ROW LEVEL SECURITY;

-- Admins have full access to audit records
CREATE POLICY "Admins can manage seeker domain overrides"
    ON public.seeker_domain_overrides
    FOR ALL
    USING (public.is_admin());

-- Seekers can read their own classification history
CREATE POLICY "Seekers can view own domain history"
    ON public.seeker_domain_overrides
    FOR SELECT
    USING (seeker_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Admin convenience view — classified vs. unclassified seeker dashboard
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_seekers_domain_status AS
SELECT
    js.id                                                   AS seeker_id,
    js.full_name,
    js.qualification                                        AS raw_qualification,
    js.education                                            AS education_history,
    js.domain_id,
    qd.name                                                 AS domain_name,
    qd.description                                          AS domain_description,
    js.domain_source,
    js.domain_classified_at,
    CASE
        WHEN js.domain_id IS NOT NULL THEN 'classified'
        ELSE 'unassigned'
    END                                                     AS classification_status,
    js.created_at                                           AS seeker_registered_at
FROM
    public.job_seekers js
LEFT JOIN
    public.qualification_domains qd ON qd.id = js.domain_id
ORDER BY
    classification_status ASC,          -- unassigned rows first for admin triage
    js.created_at DESC;

COMMENT ON VIEW public.v_seekers_domain_status IS
    'Admin view showing every seeker with their assigned domain (if any). '
    'Rows with classification_status = ''unassigned'' are candidates that need '
    'Admin intervention via Gemini AI classification.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Trigger — auto-log to audit table whenever domain_id changes on job_seekers
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_log_seeker_domain_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only fire when domain_id actually changes
    IF (OLD.domain_id IS DISTINCT FROM NEW.domain_id) THEN
        INSERT INTO public.seeker_domain_overrides (
            seeker_id,
            old_domain_id,
            new_domain_id,
            changed_by,
            source,
            raw_qualification_used,
            changed_at
        ) VALUES (
            NEW.id,
            OLD.domain_id,
            NEW.domain_id,
            auth.uid(),                         -- NULL if changed by a service role / cron
            COALESCE(NEW.domain_source, 'manual'),
            COALESCE(NEW.qualification, ''),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seeker_domain_change ON public.job_seekers;

CREATE TRIGGER trg_seeker_domain_change
    AFTER UPDATE OF domain_id ON public.job_seekers
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_log_seeker_domain_change();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Backfill: pre-classify seekers whose raw_qualification already has a
--    confirmed mapping inside qualification_mappings
--    (safe — only touches rows where domain_id IS NULL)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.job_seekers js
SET
    domain_id            = qm.domain_id,
    domain_classified_at = NOW(),
    domain_source        = 'ai_cron'
FROM public.qualification_mappings qm
WHERE
    js.domain_id   IS NULL
    AND qm.domain_id IS NOT NULL
    AND qm.is_confirmed = TRUE
    AND LOWER(TRIM(js.qualification)) = LOWER(TRIM(qm.raw_qualification));

-- ─────────────────────────────────────────────────────────────────────────────
-- END OF MIGRATION
-- =============================================================================
