-- =============================================
-- FIX INFINITE RECURSION IN ACTIVITIES RLS
-- =============================================
-- The issue is a circular dependency:
-- - activities policy checks activity_invitations
-- - activity_invitations policies check activities
--
-- Solution: Use SECURITY DEFINER functions to bypass RLS when checking ownership

-- Create a function that checks if user owns the activity via course
-- This bypasses RLS to prevent recursion
CREATE OR REPLACE FUNCTION is_activity_owner(p_activity_id UUID, p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM activities a
    JOIN courses c ON c.id = a.course_id
    WHERE a.id = p_activity_id
      AND c.teacher_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- Create a function that checks if activity has valid invitation
-- This bypasses RLS to prevent recursion
CREATE OR REPLACE FUNCTION activity_has_valid_invitation(p_activity_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM activity_invitations ai
    WHERE ai.activity_id = p_activity_id
      AND ai.is_active = true
      AND (ai.expires_at IS NULL OR ai.expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Drop the problematic policies
DROP POLICY IF EXISTS "Public can view activities via valid invitation" ON activities;
DROP POLICY IF EXISTS "Teachers can view own activity invitations" ON activity_invitations;
DROP POLICY IF EXISTS "Teachers can create activity invitations" ON activity_invitations;
DROP POLICY IF EXISTS "Teachers can update own activity invitations" ON activity_invitations;

-- Recreate activities policy using the helper function
CREATE POLICY "Public can view activities via valid invitation"
  ON activities FOR SELECT
  USING (activity_has_valid_invitation(id));

-- Recreate activity_invitations policies using the helper function
CREATE POLICY "Teachers can view own activity invitations"
  ON activity_invitations FOR SELECT
  USING (is_activity_owner(activity_id, auth.uid()));

CREATE POLICY "Teachers can create activity invitations"
  ON activity_invitations FOR INSERT
  WITH CHECK (is_activity_owner(activity_id, auth.uid()));

CREATE POLICY "Teachers can update own activity invitations"
  ON activity_invitations FOR UPDATE
  USING (is_activity_owner(activity_id, auth.uid()));

COMMENT ON FUNCTION is_activity_owner IS 'Checks if user owns activity via course. Uses SECURITY DEFINER to bypass RLS.';
COMMENT ON FUNCTION activity_has_valid_invitation IS 'Checks if activity has valid invitation. Uses SECURITY DEFINER to bypass RLS.';
