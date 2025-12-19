-- =============================================
-- UPDATE ROUNDS RLS FOR DUAL AUTHENTICATION
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Students can view rounds in their activities" ON rounds;
DROP POLICY IF EXISTS "Teachers can manage rounds" ON rounds;

-- SELECT: Students can view rounds in activities they participate in
CREATE POLICY "Students can view rounds in their activities"
  ON rounds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM get_user_context() ctx
      WHERE ctx.role = 'student'
        AND (
          -- Permanent students via course enrollment
          EXISTS (
            SELECT 1 FROM activities a
            JOIN courses c ON c.id = a.course_id
            JOIN course_members cm ON cm.course_id = c.id
            WHERE a.id = rounds.activity_id
              AND cm.user_id = ctx.user_id
          )
          OR
          -- Temporary students via student_sessions
          EXISTS (
            SELECT 1 FROM student_sessions ss
            WHERE ss.id = ctx.user_id
              AND ss.activity_id = rounds.activity_id
              AND ss.expires_at > NOW()
          )
        )
    )
    OR
    -- Teachers can view all rounds
    EXISTS (
      SELECT 1 FROM get_user_context() ctx
      WHERE ctx.role IN ('teacher', 'ta', 'admin')
        AND EXISTS (
          SELECT 1 FROM activities a
          JOIN courses c ON c.id = a.course_id
          WHERE a.id = rounds.activity_id
            AND c.teacher_id = ctx.user_id
        )
    )
  );

-- ALL: Teachers can fully manage rounds
CREATE POLICY "Teachers can manage rounds"
  ON rounds FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM get_user_context() ctx
      WHERE ctx.role IN ('teacher', 'ta', 'admin')
        AND EXISTS (
          SELECT 1 FROM activities a
          JOIN courses c ON c.id = a.course_id
          WHERE a.id = rounds.activity_id
            AND c.teacher_id = ctx.user_id
        )
    )
  );

COMMENT ON POLICY "Students can view rounds in their activities" ON rounds
  IS 'Supports both permanent students (via course_members) and temporary students (via student_sessions)';
