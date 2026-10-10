-- Migration: Seed the missing `whatsapp-manager` automation plugin.
-- 
-- Root cause: automation_tasks inserts with plugin_id = 'whatsapp-manager'
-- (from src/app/api/webhooks/whatsapp/route.ts and
--  src/lib/automation/plugins/whatsapp-manager.ts) were violating the FK
-- constraint `automation_tasks_plugin_id_fkey` because the plugin row
-- had never been inserted into automation_plugins.

INSERT INTO public.automation_plugins (id, name, description)
VALUES (
    'whatsapp-manager',
    'WhatsApp Manager',
    'Processes queued WhatsApp webhook events (opt-in / opt-out handling, message routing).'
)
ON CONFLICT (id) DO UPDATE SET
    name        = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at  = timezone('utc'::text, now());
