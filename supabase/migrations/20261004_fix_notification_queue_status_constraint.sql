-- =============================================================================
-- Migration: 20261004_fix_notification_queue_status_constraint.sql
--
-- Purpose:
--   The notification_queue table's status CHECK constraint only includes statuses
--   from the original HITL workflow. The WhatsApp worker also sets:
--     • DEAD_LETTER — when a message fails after 5 retry attempts (permanent failure)
--     • CANCELLED   — when a non-premium seeker is detected and the item is skipped
--
--   Without these in the CHECK constraint, those UPDATE calls fail silently at the
--   database level, leaving items stuck in PENDING and retried indefinitely.
--
--   Also adds next_attempt_at column used by worker.ts exponential backoff if missing.
-- =============================================================================

-- 1. Drop existing CHECK constraint
ALTER TABLE public.notification_queue
DROP CONSTRAINT IF EXISTS notification_queue_status_check;

-- 2. Re-add with the full set of statuses (including worker states)
ALTER TABLE public.notification_queue
ADD CONSTRAINT notification_queue_status_check
CHECK (status IN (
    'REQUIRES_APPROVAL',  -- MANUAL mode: awaiting admin approval
    'PENDING',            -- AUTO mode: queued for next worker run
    'PROCESSING',         -- Currently being sent
    'SENT',               -- Successfully delivered
    'FAILED',             -- Failed but may still retry
    'REJECTED',           -- Admin manually rejected (HITL)
    'DEAD_LETTER',        -- Permanently failed after 5 retries
    'CANCELLED'           -- Skipped (e.g. seeker lost premium status)
));

-- 3. Add next_attempt_at column if it doesn't already exist (worker exponential backoff)
ALTER TABLE public.notification_queue
ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.notification_queue.next_attempt_at IS
    'When set, the worker will not retry this item until this timestamp has elapsed. Used for exponential backoff retries.';

COMMENT ON COLUMN public.notification_queue.status IS
    'Lifecycle state: REQUIRES_APPROVAL (pending admin go-ahead), PENDING (queued for dispatch),
     PROCESSING (in flight), SENT (successfully delivered), FAILED (delivery error, may retry),
     REJECTED (admin declined), DEAD_LETTER (exhausted all 5 retries), CANCELLED (skipped).';
