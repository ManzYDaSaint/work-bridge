-- =============================================================================
-- Migration: 20261004_fix_v_seekers_domain_status_security.sql
--
-- Purpose:
--   Supabase lint flagged public.v_seekers_domain_status as SECURITY DEFINER.
--   Views created by a privileged role (e.g. service_role) implicitly inherit
--   SECURITY DEFINER behaviour, bypassing RLS on the underlying tables.
--
--   Fix: Recreate the view with SECURITY INVOKER so each querying user's own
--   permissions and RLS policies are enforced, rather than the view creator's.
--   An accompanying RLS policy on job_seekers already restricts Admin-only access.
-- =============================================================================

-- Drop and recreate with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.v_seekers_domain_status;

CREATE OR REPLACE VIEW public.v_seekers_domain_status
WITH (security_invoker = true)
AS
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
    'Admin intervention via Gemini AI classification. '
    'Uses SECURITY INVOKER so querying user RLS policies are enforced.';
