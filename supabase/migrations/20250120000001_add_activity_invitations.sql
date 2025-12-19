-- =============================================
-- ACTIVITY INVITATIONS TABLE
-- =============================================
-- Stores activity-specific invitation tokens for passwordless student access

CREATE TABLE activity_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = never expires, or set based on activity end time
  max_uses INTEGER, -- NULL = unlimited uses
  use_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Indexes for performance
CREATE INDEX idx_activity_invitations_token ON activity_invitations(token);
CREATE INDEX idx_activity_invitations_activity ON activity_invitations(activity_id);
CREATE INDEX idx_activity_invitations_created_by ON activity_invitations(created_by);
CREATE INDEX idx_activity_invitations_active ON activity_invitations(is_active) WHERE is_active = true;

COMMENT ON TABLE activity_invitations IS 'Invitation links for students to join activities without registration';
COMMENT ON COLUMN activity_invitations.token IS 'Cryptographically random token (e.g., act_inv_...)';
COMMENT ON COLUMN activity_invitations.expires_at IS 'Invitation expiration time, typically set to activity end time + grace period';
COMMENT ON COLUMN activity_invitations.max_uses IS 'Optional limit on how many times this invitation can be used';
