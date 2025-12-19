-- =============================================
-- RLS POLICIES FOR ACTIVITY_INVITATIONS
-- =============================================

-- Enable RLS
ALTER TABLE activity_invitations ENABLE ROW LEVEL SECURITY;

-- Teachers can view invitations for their own activities
CREATE POLICY "Teachers can view own activity invitations"
  ON activity_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = activity_invitations.activity_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Teachers can create invitations for their own activities
CREATE POLICY "Teachers can create activity invitations"
  ON activity_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = activity_invitations.activity_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Teachers can update (deactivate) invitations for their own activities
CREATE POLICY "Teachers can update own activity invitations"
  ON activity_invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = activity_invitations.activity_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Anyone can view active, non-expired invitations (for validation during join)
CREATE POLICY "Public can validate active invitations"
  ON activity_invitations FOR SELECT
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  );

COMMENT ON POLICY "Public can validate active invitations" ON activity_invitations
  IS 'Allows anyone with the token to validate it during the join process';
