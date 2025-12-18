-- =============================================
-- ALLOW STUDENTS TO LOOKUP COURSES BY INVITATION CODE
-- =============================================

-- Drop the existing select policy for students
DROP POLICY IF EXISTS "courses_select_policy" ON courses;

-- Recreate with ability to lookup by invitation code
CREATE POLICY "courses_select_policy"
  ON courses FOR SELECT
  USING (
    teacher_id = auth.uid()
    OR id IN (
      SELECT course_id FROM course_members WHERE user_id = auth.uid()
    )
    OR invitation_code IS NOT NULL  -- Allow students to search by invitation code
  );
