-- Migration: Create System Events Table for Mission Control

CREATE TYPE event_severity AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'CRITICAL');

CREATE TABLE IF NOT EXISTS system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    category TEXT NOT NULL,
    severity event_severity NOT NULL DEFAULT 'INFO',
    event TEXT NOT NULL,
    message TEXT NOT NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    correlation_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for filtering on dashboard
CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON system_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_category ON system_events(category);
CREATE INDEX IF NOT EXISTS idx_system_events_severity ON system_events(severity);

-- RLS policies
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

-- Only Admins can view system events
CREATE POLICY "Admins can view system events" ON system_events
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND users.role = 'ADMIN'
        )
    );

-- System can insert (Server role bypasses RLS)
-- But we can also add an insert policy just in case we need it from a specific edge function
CREATE POLICY "Admins can insert system events" ON system_events
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND users.role = 'ADMIN'
        )
    );

-- Enable real-time for Mission Control Dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE system_events;
