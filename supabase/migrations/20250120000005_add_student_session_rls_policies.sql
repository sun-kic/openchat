-- =============================================
-- RLS POLICIES FOR STUDENT_SESSIONS
-- =============================================

-- Enable RLS
ALTER TABLE student_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can create student sessions (validation happens in server action)
-- This is necessary for the initial join flow
CREATE POLICY "Public can create student sessions"
  ON student_sessions FOR INSERT
  WITH CHECK (true);

-- Students can view their own session (we'll implement custom auth check in middleware)
-- For now, allow anyone to view their session via server action
CREATE POLICY "Anyone can view student sessions"
  ON student_sessions FOR SELECT
  USING (true);

-- Allow updates to last_active_at (will be restricted in server action)
CREATE POLICY "Sessions can be updated"
  ON student_sessions FOR UPDATE
  USING (true);

-- Teachers can view all sessions for their activities
CREATE POLICY "Teachers can view activity sessions"
  ON student_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = student_sessions.activity_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Teachers can delete sessions for their activities (to revoke access)
CREATE POLICY "Teachers can delete activity sessions"
  ON student_sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = student_sessions.activity_id
        AND c.teacher_id = auth.uid()
    )
  );

COMMENT ON POLICY "Public can create student sessions" ON student_sessions
  IS 'Allows initial session creation during join flow. Validation is enforced in server action via invitation token check.';

COMMENT ON POLICY "Anyone can view student sessions" ON student_sessions
  IS 'Temporary policy - will be tightened once get_user_context() is implemented';
