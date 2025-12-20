-- =============================================
-- ALLOW PUBLIC TO READ ACTIVITY INFO VIA VALID INVITATION
-- =============================================
-- When validating an invitation token, anonymous users need to
-- read basic activity information (status, title, etc.)

-- Drop if exists (for idempotency)
DROP POLICY IF EXISTS "Public can view activities via valid invitation" ON activities;

-- Allow anyone to read activity info if there's an active invitation for it
CREATE POLICY "Public can view activities via valid invitation"
  ON activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM activity_invitations ai
      WHERE ai.activity_id = activities.id
        AND ai.is_active = true
        AND (ai.expires_at IS NULL OR ai.expires_at > NOW())
    )
  );

COMMENT ON POLICY "Public can view activities via valid invitation" ON activities
  IS 'Allows anyone to view activity info when there is an active invitation link for it';
