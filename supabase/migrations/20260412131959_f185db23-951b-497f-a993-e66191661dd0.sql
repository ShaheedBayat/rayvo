-- Add expires_at column to team_invites
ALTER TABLE public.team_invites
ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '72 hours');

-- Backfill existing pending invites
UPDATE public.team_invites
SET expires_at = invited_at + interval '72 hours'
WHERE expires_at IS NULL;