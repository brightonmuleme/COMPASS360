-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- This creates the highly-secure vault for school state snapshots.

CREATE TABLE IF NOT EXISTS school_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id TEXT NOT NULL,
    label TEXT NOT NULL,
    state JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexing for fast "Time Travel" lookups
CREATE INDEX IF NOT EXISTS idx_snapshots_school ON school_snapshots(school_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_created ON school_snapshots(created_at DESC);

-- RLS Security: Only the Director and authorized staff should access this.
ALTER TABLE school_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Schools can only see their own snapshots
CREATE POLICY "Schools can manage their own snapshots" 
ON school_snapshots 
FOR ALL 
USING (school_id = (select current_setting('request.jwt.claims', true)::jsonb ->> 'school_id'::text));

-- If you are using service role bypass (Direct API), RLS stays as is.
