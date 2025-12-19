-- =============================================
-- UPDATE GROUPS & GROUP_MEMBERS RLS FOR DUAL AUTHENTICATION
-- =============================================

-- ==================
-- GROUPS TABLE
-- ==================

-- Drop existing policies
DROP POLICY IF EXISTS "Students can view own group" ON groups;
DROP POLICY IF EXISTS "Teachers can manage groups" ON groups;

-- SELECT: Students can view their assigned group
CREATE POLICY "Students can view own group"
  ON groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM get_user_context() ctx
      WHERE ctx.role = 'student'
        AND (
          -- Permanent students via group_members
          EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = groups.id
              AND gm.user_id = ctx.user_id
          )
          OR
          -- Temporary students via student_sessions
          EXISTS (
            SELECT 1 FROM student_sessions ss
            WHERE ss.id = ctx.user_id
              AND ss.group_id = groups.id
              AND ss.expires_at > NOW()
          )
        )
    )
    OR
    -- Teachers can view all groups in their activities
    EXISTS (
      SELECT 1 FROM get_user_context() ctx
      WHERE ctx.role IN ('teacher', 'ta', 'admin')
        AND EXISTS (
          SELECT 1 FROM activities a
          JOIN courses c ON c.id = a.course_id
          WHERE a.id = groups.activity_id
            AND c.teacher_id = ctx.user_id
        )
    )
  );

-- ALL: Teachers can fully manage groups
CREATE POLICY "Teachers can manage groups"
  ON groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM get_user_context() ctx
      WHERE ctx.role IN ('teacher', 'ta', 'admin')
        AND EXISTS (
          SELECT 1 FROM activities a
          JOIN courses c ON c.id = a.course_id
          WHERE a.id = groups.activity_id
            AND c.teacher_id = ctx.user_id
        )
    )
  );

-- UPDATE: Students can update final choice if they are group leader
CREATE POLICY "Group leaders can update final choice"
  ON groups FOR UPDATE
  USING (
    (SELECT user_id FROM get_user_context()) = groups.leader_user_id
  );

-- ==================
-- GROUP_MEMBERS TABLE
-- ==================

-- Drop existing policies
DROP POLICY IF EXISTS "Students can view own group members" ON group_members;
DROP POLICY IF EXISTS "Teachers can manage group members" ON group_members;

-- SELECT: Students can view members of their group
CREATE POLICY "Students can view own group members"
  ON group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM get_user_context() ctx
      WHERE ctx.role = 'student'
        AND (
          -- Permanent students
          EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_members.group_id
              AND gm.user_id = ctx.user_id
          )
          OR
          -- Temporary students
          EXISTS (
            SELECT 1 FROM student_sessions ss
            WHERE ss.id = ctx.user_id
              AND ss.group_id = group_members.group_id
              AND ss.expires_at > NOW()
          )
        )
    )
    OR
    -- Teachers can view all group members
    EXISTS (
      SELECT 1 FROM get_user_context() ctx
      WHERE ctx.role IN ('teacher', 'ta', 'admin')
        AND EXISTS (
          SELECT 1 FROM groups g
          JOIN activities a ON a.id = g.activity_id
          JOIN courses c ON c.id = a.course_id
          WHERE g.id = group_members.group_id
            AND c.teacher_id = ctx.user_id
        )
    )
  );

-- ALL: Teachers can fully manage group members
CREATE POLICY "Teachers can manage group members"
  ON group_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM get_user_context() ctx
      WHERE ctx.role IN ('teacher', 'ta', 'admin')
        AND EXISTS (
          SELECT 1 FROM groups g
          JOIN activities a ON a.id = g.activity_id
          JOIN courses c ON c.id = a.course_id
          WHERE g.id = group_members.group_id
            AND c.teacher_id = ctx.user_id
        )
    )
  );

COMMENT ON POLICY "Students can view own group" ON groups
  IS 'Students can see their assigned group via group_members or student_sessions';

COMMENT ON POLICY "Group leaders can update final choice" ON groups
  IS 'Allows both permanent and temporary student group leaders to submit final choice';
