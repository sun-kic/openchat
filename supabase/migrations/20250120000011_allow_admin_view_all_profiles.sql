-- =============================================
-- ALLOW ADMIN TO VIEW ALL PROFILES
-- =============================================

-- Drop existing profile select policy
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;

-- Recreate with admin access to all profiles
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  USING (
    -- Users can see their own profile
    auth.uid() = id
    OR
    -- Admins can see all profiles
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
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
