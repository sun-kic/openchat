-- =============================================
-- FIX ADMIN PROFILES RLS (avoid recursive check)
-- =============================================

-- Drop existing profile select policy
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;

-- Create a security definer function to check admin status
-- This bypasses RLS to avoid infinite recursion
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- Recreate policy using the function
CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  USING (
    -- Users can see their own profile
    auth.uid() = id
    OR
    -- Admins can see all profiles (using security definer function)
    is_admin(auth.uid())
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
