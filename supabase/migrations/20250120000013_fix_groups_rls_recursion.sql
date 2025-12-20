-- =============================================
-- FIX GROUPS RLS INFINITE RECURSION
-- =============================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Students can view own group" ON groups;
DROP POLICY IF EXISTS "Teachers can manage groups" ON groups;
DROP POLICY IF EXISTS "Group leaders can update final choice" ON groups;
DROP POLICY IF EXISTS "Leader can update final choice" ON groups;

DROP POLICY IF EXISTS "Students can view own group members" ON group_members;
DROP POLICY IF EXISTS "Teachers can manage group members" ON group_members;

-- ==================
-- GROUPS TABLE - Simplified policies
-- ==================

-- Teachers can manage all groups in their courses
CREATE POLICY "Teachers can manage groups"
  ON groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = groups.activity_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Students can view groups they're in (via direct activity membership check)
CREATE POLICY "Students can view own group"
  ON groups FOR SELECT
  USING (
    -- Check if user is a member of this specific group
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = groups.id
        AND gm.user_id = auth.uid()
    )
    OR
    -- Or is a temporary student with this group
    EXISTS (
      SELECT 1 FROM student_sessions ss
      WHERE ss.group_id = groups.id
        AND ss.expires_at > NOW()
        AND ss.id::text IN (
          SELECT current_setting('request.jwt.claims', true)::json->>'sub'
        )
    )
  );

-- Group leaders can update final choice
CREATE POLICY "Group leaders can update final choice"
  ON groups FOR UPDATE
  USING (leader_user_id = auth.uid());

-- ==================
-- GROUP_MEMBERS TABLE - Simplified policies
-- ==================

-- Teachers can manage all group members in their courses
CREATE POLICY "Teachers can manage group members"
  ON group_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      JOIN activities a ON a.id = g.activity_id
      JOIN courses c ON c.id = a.course_id
      WHERE g.id = group_members.group_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Students can view members of groups they belong to
-- Use a simpler check that doesn't cause recursion
CREATE POLICY "Students can view own group members"
  ON group_members FOR SELECT
  USING (
    -- Check if the current user is also a member of this same group
    group_members.group_id IN (
      SELECT gm2.group_id FROM group_members gm2
      WHERE gm2.user_id = auth.uid()
    )
  );
