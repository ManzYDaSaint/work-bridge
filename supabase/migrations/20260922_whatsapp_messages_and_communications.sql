-- Migration: Create public.whatsapp_messages table with Foreign Keys, Indexes, and RLS Policies

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    phone VARCHAR(50) NOT NULL,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
    message_text TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'DELIVERED', 'RECEIVED', 'FAILED')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for high performance querying
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON public.whatsapp_messages(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON public.whatsapp_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON public.whatsapp_messages(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin role if not already present
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy 1: Admins have full access (Select, Insert, Update, Delete)
DROP POLICY IF EXISTS "Admins have full access to whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "Admins have full access to whatsapp_messages"
ON public.whatsapp_messages
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- RLS Policy 2: Users can view their own WhatsApp messages
DROP POLICY IF EXISTS "Users can view their own whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "Users can view their own whatsapp_messages"
ON public.whatsapp_messages
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
