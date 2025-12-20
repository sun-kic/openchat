-- =============================================
-- COMPLETE FIX FOR GROUPS RLS - DROP ALL AND RECREATE
-- =============================================

-- First, disable RLS temporarily to clean up
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on groups
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE tablename = 'groups'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON groups', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL existing policies on group_members
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE tablename = 'group_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON group_members', pol.policyname);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- ==================
-- GROUPS TABLE - Simple non-recursive policies
-- ==================

-- Teachers can do everything with groups in their activities
CREATE POLICY "groups_teacher_all"
  ON groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = groups.activity_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Students can only SELECT groups they're members of
CREATE POLICY "groups_student_select"
  ON groups FOR SELECT
  USING (
    id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- Group leaders can UPDATE their group (for final choice)
CREATE POLICY "groups_leader_update"
  ON groups FOR UPDATE
  USING (leader_user_id = auth.uid())
  WITH CHECK (leader_user_id = auth.uid());

-- ==================
-- GROUP_MEMBERS TABLE - Simple non-recursive policies
-- ==================

-- Teachers can do everything with group_members in their activities
CREATE POLICY "group_members_teacher_all"
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

-- Students can view members of their own group (simple self-join)
CREATE POLICY "group_members_student_select"
  ON group_members FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );
