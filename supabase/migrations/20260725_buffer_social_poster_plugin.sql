-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260725_buffer_social_poster_plugin.sql
-- Purpose  : Register the Buffer social poster automation plugin so the
--            automation engine can dispatch JOB_POSTED tasks to it.
-- ─────────────────────────────────────────────────────────────────────────────

-- Insert the buffer-social-poster plugin (idempotent).
INSERT INTO automation_plugins (id, enabled, description)
VALUES (
    'buffer-social-poster',
    true,
    'Automatically posts new job listings to LinkedIn and Facebook Pages via the Buffer API when a JOB_POSTED event fires.'
)
ON CONFLICT (id) DO UPDATE
    SET enabled     = EXCLUDED.enabled,
        description = EXCLUDED.description,
        updated_at  = now();
