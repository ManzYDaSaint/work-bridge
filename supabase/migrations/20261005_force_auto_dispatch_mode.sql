-- Update system_settings table to force ADMIN_MATCH_DISPATCH_MODE to AUTO
INSERT INTO public.system_settings (key, value, updated_at)
VALUES ('ADMIN_MATCH_DISPATCH_MODE', '"AUTO"', NOW())
ON CONFLICT (key) DO UPDATE 
SET value = '"AUTO"', updated_at = NOW();
