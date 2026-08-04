-- Migration to add product_events table for analytics funnel

CREATE TABLE IF NOT EXISTS public.product_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL,
    role TEXT,
    stage TEXT NOT NULL,
    variant TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices for performance on analytics queries
CREATE INDEX IF NOT EXISTS idx_product_events_created_at ON public.product_events(created_at);
CREATE INDEX IF NOT EXISTS idx_product_events_session_id ON public.product_events(session_id);
CREATE INDEX IF NOT EXISTS idx_product_events_user_id ON public.product_events(user_id);

-- RLS Policies
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access product_events" 
ON public.product_events FOR ALL 
USING (public.is_admin());

CREATE POLICY "Anyone can insert product_events"
ON public.product_events FOR INSERT
WITH CHECK (true);
