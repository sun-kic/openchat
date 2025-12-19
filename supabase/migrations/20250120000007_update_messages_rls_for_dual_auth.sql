-- =============================================
-- UPDATE MESSAGES RLS FOR DUAL AUTHENTICATION
-- =============================================
-- Support both permanent users (via auth.uid) and temporary students (via student_sessions)

-- Drop existing policies
DROP POLICY IF EXISTS "Students can view own group messages" ON messages;
DROP POLICY IF EXISTS "Teachers can view all activity messages" ON messages;
DROP POLICY IF EXISTS "Students can insert own group messages" ON messages;
DROP POLICY IF EXISTS "Teachers can delete messages" ON messages;

-- CREATE UPDATED POLICIES

-- SELECT: Students can view messages in their group
CREATE POLICY "Students can view own group messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM get_user_context() ctx
      WHERE ctx.role = 'student'
        AND (
          -- Permanent students via group_members
          EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = messages.group_id
              AND gm.user_id = ctx.user_id
          )
          OR
          -- Temporary students via student_sessions
          EXISTS (
            SELECT 1 FROM student_sessions ss
            WHERE ss.id = ctx.user_id
              AND ss.activity_id = messages.activity_id
              AND ss.group_id = messages.group_id
              AND ss.expires_at > NOW()
          )
        )
    )
  );

-- SELECT: Teachers can view all messages in their activities
CREATE POLICY "Teachers can view all activity messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM get_user_context() ctx
      WHERE ctx.role IN ('teacher', 'ta', 'admin')
        AND EXISTS (
          SELECT 1 FROM activities a
          JOIN courses c ON c.id = a.course_id
          WHERE a.id = messages.activity_id
            AND c.teacher_id = ctx.user_id
        )
    )
  );

-- INSERT: Students can insert messages in their group
CREATE POLICY "Students can insert own group messages"
  ON messages FOR INSERT
  WITH CHECK (
    (SELECT user_id FROM get_user_context()) = messages.user_id
    AND (
      -- Permanent students: verify group membership
      EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.group_id = messages.group_id
          AND gm.user_id = messages.user_id
      )
      OR
      -- Temporary students: verify session and group assignment
      EXISTS (
        SELECT 1 FROM student_sessions ss
        WHERE ss.id = messages.user_id
          AND ss.activity_id = messages.activity_id
          AND ss.group_id = messages.group_id
          AND ss.expires_at > NOW()
      )
    )
  );

-- DELETE: Teachers can delete messages in their activities
CREATE POLICY "Teachers can delete messages"
  ON messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM get_user_context() ctx
      WHERE ctx.role IN ('teacher', 'ta', 'admin')
        AND EXISTS (
          SELECT 1 FROM activities a
          JOIN courses c ON c.id = a.course_id
          WHERE a.id = messages.activity_id
            AND c.teacher_id = ctx.user_id
        )
    )
  );

COMMENT ON POLICY "Students can view own group messages" ON messages
  IS 'Supports both permanent students (via group_members) and temporary students (via student_sessions)';

COMMENT ON POLICY "Students can insert own group messages" ON messages
  IS 'Validates group membership for permanent students and session+group for temporary students';
