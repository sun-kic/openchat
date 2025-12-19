-- =============================================
-- UPDATE SUBMISSIONS RLS FOR DUAL AUTHENTICATION
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Students can view own submissions" ON submissions;
DROP POLICY IF EXISTS "Teachers can view activity submissions" ON submissions;
DROP POLICY IF EXISTS "Students can insert own submissions" ON submissions;
DROP POLICY IF EXISTS "Students can update own submissions" ON submissions;

-- CREATE UPDATED POLICIES

-- SELECT: Students can view their own submissions
CREATE POLICY "Students can view own submissions"
  ON submissions FOR SELECT
  USING (
    (SELECT user_id FROM get_user_context()) = submissions.user_id
    OR
    -- Teachers can view all submissions in their activities
    EXISTS (
      SELECT 1 FROM get_user_context() ctx
      WHERE ctx.role IN ('teacher', 'ta', 'admin')
        AND EXISTS (
          SELECT 1 FROM activities a
          JOIN courses c ON c.id = a.course_id
          WHERE a.id = submissions.activity_id
            AND c.teacher_id = ctx.user_id
        )
    )
  );

-- INSERT: Students can insert submissions
CREATE POLICY "Students can insert own submissions"
  ON submissions FOR INSERT
  WITH CHECK (
    (SELECT user_id FROM get_user_context()) = submissions.user_id
    AND EXISTS (
      SELECT 1 FROM get_user_context() ctx
      WHERE ctx.role = 'student'
        AND (
          -- Permanent students: verify group membership
          EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = submissions.group_id
              AND gm.user_id = submissions.user_id
          )
          OR
          -- Temporary students: verify session
          EXISTS (
            SELECT 1 FROM student_sessions ss
            WHERE ss.id = submissions.user_id
              AND ss.activity_id = submissions.activity_id
              AND ss.group_id = submissions.group_id
              AND ss.expires_at > NOW()
          )
        )
    )
  );

-- UPDATE: Students can update (upsert) their own submissions
CREATE POLICY "Students can update own submissions"
  ON submissions FOR UPDATE
  USING (
    (SELECT user_id FROM get_user_context()) = submissions.user_id
  );

COMMENT ON POLICY "Students can insert own submissions" ON submissions
  IS 'Supports both permanent and temporary students with appropriate group validation';
