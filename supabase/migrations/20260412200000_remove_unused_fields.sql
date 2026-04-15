BEGIN;

ALTER TABLE public.employers DROP COLUMN IF EXISTS hiring_velocity;
ALTER TABLE public.employers DROP COLUMN IF EXISTS candidate_privacy;
ALTER TABLE public.certificates DROP COLUMN IF EXISTS issue_date;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS status;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS start_date;

COMMIT;

-- Reload postgrest schema cache
NOTIFY pgrst, reload_schema;
