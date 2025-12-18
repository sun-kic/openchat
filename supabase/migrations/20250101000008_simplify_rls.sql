-- =============================================
-- SIMPLIFY RLS - REMOVE CIRCULAR DEPENDENCIES
-- =============================================

-- Disable RLS temporarily to clean up
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE course_members DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "Teachers can view own courses" ON courses;
DROP POLICY IF EXISTS "Teachers can create courses" ON courses;
DROP POLICY IF EXISTS "Teachers can update own courses" ON courses;
DROP POLICY IF EXISTS "Teachers can delete own courses" ON courses;
DROP POLICY IF EXISTS "Students can view enrolled courses" ON courses;
DROP POLICY IF EXISTS "Teachers can manage course members" ON course_members;
DROP POLICY IF EXISTS "Teachers can view course members" ON course_members;
DROP POLICY IF EXISTS "Teachers can add course members" ON course_members;
DROP POLICY IF EXISTS "Students can view own memberships" ON course_members;
DROP POLICY IF EXISTS "Students can join courses" ON course_members;

-- Re-enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_members ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies for courses
CREATE POLICY "courses_select_policy"
  ON courses FOR SELECT
  USING (
    teacher_id = auth.uid()
    OR id IN (
      SELECT course_id FROM course_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "courses_insert_policy"
  ON courses FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "courses_update_policy"
  ON courses FOR UPDATE
  USING (teacher_id = auth.uid());

CREATE POLICY "courses_delete_policy"
  ON courses FOR DELETE
  USING (teacher_id = auth.uid());

-- Create simple policies for course_members
CREATE POLICY "course_members_select_policy"
  ON course_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "course_members_insert_policy"
  ON course_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "course_members_delete_policy"
  ON course_members FOR DELETE
  USING (user_id = auth.uid());
