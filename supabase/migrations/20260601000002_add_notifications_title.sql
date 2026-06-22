-- Add title field to notifications for in-app notification rendering
ALTER TABLE public.notifications
ADD COLUMN title TEXT DEFAULT '' NOT NULL;

UPDATE public.notifications
SET title = LEFT(message, 100)
WHERE title = '';
