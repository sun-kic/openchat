-- =============================================
-- ALLOW USERS TO VIEW TEACHER AND PEER PROFILES
-- =============================================

-- Drop existing profile policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Recreate with ability to view teachers and course members
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  USING (
    -- Users can see their own profile
    auth.uid() = id
    OR
    -- Users can see teachers of courses they're in
    id IN (
      SELECT c.teacher_id
      FROM courses c
      JOIN course_members cm ON cm.course_id = c.id
      WHERE cm.user_id = auth.uid()
    )
    OR
    -- Users can see other members of their courses
    id IN (
      SELECT cm2.user_id
      FROM course_members cm1
      JOIN course_members cm2 ON cm2.course_id = cm1.course_id
      WHERE cm1.user_id = auth.uid()
    )
    OR
    -- Teachers can see their students
    id IN (
      SELECT cm.user_id
      FROM courses c
      JOIN course_members cm ON cm.course_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );
