-- =============================================
-- FIX COURSES RLS POLICIES TO AVOID RECURSION
-- =============================================

-- Drop all existing courses policies
DROP POLICY IF EXISTS "Teachers can view own courses" ON courses;
DROP POLICY IF EXISTS "Teachers can create courses" ON courses;
DROP POLICY IF EXISTS "Teachers can update own courses" ON courses;
DROP POLICY IF EXISTS "Teachers can delete own courses" ON courses;
DROP POLICY IF EXISTS "Students can view enrolled courses" ON courses;

-- Drop all existing course_members policies
DROP POLICY IF EXISTS "Teachers can view course members" ON course_members;
DROP POLICY IF EXISTS "Teachers can add course members" ON course_members;
DROP POLICY IF EXISTS "Students can view own memberships" ON course_members;
DROP POLICY IF EXISTS "Students can join courses" ON course_members;

-- Recreate courses policies (simpler, no circular dependencies)
CREATE POLICY "Teachers can view own courses"
  ON courses FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create courses"
  ON courses FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own courses"
  ON courses FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own courses"
  ON courses FOR DELETE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view enrolled courses"
  ON courses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM course_members cm
      WHERE cm.course_id = courses.id
      AND cm.user_id = auth.uid()
    )
  );

-- Recreate course_members policies (avoid checking courses table)
CREATE POLICY "Teachers can manage course members"
  ON course_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_members.course_id
      AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_members.course_id
      AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own memberships"
  ON course_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Students can join courses"
  ON course_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);
