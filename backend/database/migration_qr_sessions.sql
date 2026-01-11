-- Migration: Add QR Sessions for Single-Use Codes
-- Run this ONCE to add the new table

-- Create QR sessions table for single-use codes
CREATE TABLE IF NOT EXISTS public.qr_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  session_token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_qr_sessions_member ON public.qr_sessions(member_id);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_token ON public.qr_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_qr_sessions_expires ON public.qr_sessions(expires_at) WHERE used = FALSE;

-- Grant permissions to gym_admin
GRANT SELECT, INSERT, UPDATE ON public.qr_sessions TO gym_admin;

-- Optional: Auto-cleanup function (removes old sessions after 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_qr_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.qr_sessions 
  WHERE expires_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ QR Sessions table created successfully!';
END $$;
