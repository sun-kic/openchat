-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshot ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROFILES POLICIES
-- =============================================
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================
-- COURSES POLICIES
-- =============================================
-- Teachers can view their own courses
CREATE POLICY "Teachers can view own courses"
  ON courses FOR SELECT
  USING (auth.uid() = teacher_id);

-- Teachers can create courses
CREATE POLICY "Teachers can create courses"
  ON courses FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

-- Teachers can update their own courses
CREATE POLICY "Teachers can update own courses"
  ON courses FOR UPDATE
  USING (auth.uid() = teacher_id);

-- Teachers can delete their own courses
CREATE POLICY "Teachers can delete own courses"
  ON courses FOR DELETE
  USING (auth.uid() = teacher_id);

-- Students can view courses they are members of
CREATE POLICY "Students can view enrolled courses"
  ON courses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM course_members
      WHERE course_members.course_id = courses.id
      AND course_members.user_id = auth.uid()
    )
  );

-- =============================================
-- COURSE_MEMBERS POLICIES
-- =============================================
-- Teachers can view members of their courses
CREATE POLICY "Teachers can view course members"
  ON course_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_members.course_id
      AND courses.teacher_id = auth.uid()
    )
  );

-- Teachers can add members to their courses
CREATE POLICY "Teachers can add course members"
  ON course_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_members.course_id
      AND courses.teacher_id = auth.uid()
    )
  );

-- Students can view their own memberships
CREATE POLICY "Students can view own memberships"
  ON course_members FOR SELECT
  USING (auth.uid() = user_id);

-- Students can join courses (via invitation code - handled in app logic)
CREATE POLICY "Students can join courses"
  ON course_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- ACTIVITIES POLICIES
-- =============================================
-- Teachers can manage activities in their courses
CREATE POLICY "Teachers can manage activities"
  ON activities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = activities.course_id
      AND courses.teacher_id = auth.uid()
    )
  );

-- Students can view activities in courses they're enrolled in
CREATE POLICY "Students can view activities"
  ON activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM course_members
      WHERE course_members.course_id = activities.course_id
      AND course_members.user_id = auth.uid()
    )
  );

-- =============================================
-- QUESTIONS POLICIES
-- =============================================
-- Teachers can manage questions in their courses
CREATE POLICY "Teachers can manage questions"
  ON questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = questions.course_id
      AND courses.teacher_id = auth.uid()
    )
  );

-- Students can view questions in activities they participate in
CREATE POLICY "Students can view questions"
  ON questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM activity_questions
      JOIN activities ON activities.id = activity_questions.activity_id
      JOIN course_members ON course_members.course_id = activities.course_id
      WHERE activity_questions.question_id = questions.id
      AND course_members.user_id = auth.uid()
    )
  );

-- =============================================
-- ACTIVITY_QUESTIONS POLICIES
-- =============================================
-- Teachers can manage activity questions
CREATE POLICY "Teachers can manage activity questions"
  ON activity_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM activities
      JOIN courses ON courses.id = activities.course_id
      WHERE activities.id = activity_questions.activity_id
      AND courses.teacher_id = auth.uid()
    )
  );

-- Students can view activity questions
CREATE POLICY "Students can view activity questions"
  ON activity_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM activities
      JOIN course_members ON course_members.course_id = activities.course_id
      WHERE activities.id = activity_questions.activity_id
      AND course_members.user_id = auth.uid()
    )
  );

-- =============================================
-- GROUPS POLICIES
-- =============================================
-- Teachers can manage groups in their activities
CREATE POLICY "Teachers can manage groups"
  ON groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM activities
      JOIN courses ON courses.id = activities.course_id
      WHERE activities.id = groups.activity_id
      AND courses.teacher_id = auth.uid()
    )
  );

-- Students can view their own group
CREATE POLICY "Students can view own group"
  ON groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

-- =============================================
-- GROUP_MEMBERS POLICIES
-- =============================================
-- Teachers can manage group members
CREATE POLICY "Teachers can manage group members"
  ON group_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM groups
      JOIN activities ON activities.id = groups.activity_id
      JOIN courses ON courses.id = activities.course_id
      WHERE groups.id = group_members.group_id
      AND courses.teacher_id = auth.uid()
    )
  );

-- Students can view members of their own group
CREATE POLICY "Students can view own group members"
  ON group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm2
      WHERE gm2.group_id = group_members.group_id
      AND gm2.user_id = auth.uid()
    )
  );

-- =============================================
-- ROUNDS POLICIES
-- =============================================
-- Teachers can manage rounds
CREATE POLICY "Teachers can manage rounds"
  ON rounds FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM activities
      JOIN courses ON courses.id = activities.course_id
      WHERE activities.id = rounds.activity_id
      AND courses.teacher_id = auth.uid()
    )
  );

-- Students can view rounds in their activities
CREATE POLICY "Students can view rounds"
  ON rounds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM activities
      JOIN course_members ON course_members.course_id = activities.course_id
      WHERE activities.id = rounds.activity_id
      AND course_members.user_id = auth.uid()
    )
  );

-- =============================================
-- MESSAGES POLICIES (CRITICAL FOR SECURITY)
-- =============================================
-- Teachers can view all messages in their courses
CREATE POLICY "Teachers can view all messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM activities
      JOIN courses ON courses.id = activities.course_id
      WHERE activities.id = messages.activity_id
      AND courses.teacher_id = auth.uid()
    )
  );

-- Students can only view messages in their own group
CREATE POLICY "Students can view own group messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = messages.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Students can only insert messages in their own group
CREATE POLICY "Students can insert own group messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = messages.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- =============================================
-- SUBMISSIONS POLICIES
-- =============================================
-- Teachers can view all submissions
CREATE POLICY "Teachers can view all submissions"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM activities
      JOIN courses ON courses.id = activities.course_id
      WHERE activities.id = submissions.activity_id
      AND courses.teacher_id = auth.uid()
    )
  );

-- Students can view submissions in their own group
CREATE POLICY "Students can view own group submissions"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = submissions.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Students can insert their own submissions
CREATE POLICY "Students can insert own submissions"
  ON submissions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = submissions.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- =============================================
-- TEACHER_NOTES POLICIES
-- =============================================
-- Teachers can manage their own notes
CREATE POLICY "Teachers can manage own notes"
  ON teacher_notes FOR ALL
  USING (auth.uid() = teacher_id);

-- TAs can view notes in courses they assist
CREATE POLICY "TAs can view notes"
  ON teacher_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ta'
    )
  );

-- =============================================
-- ANALYTICS_SNAPSHOT POLICIES
-- =============================================
-- Teachers can view analytics for their courses
CREATE POLICY "Teachers can view analytics"
  ON analytics_snapshot FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM activities
      JOIN courses ON courses.id = activities.course_id
      WHERE activities.id = analytics_snapshot.activity_id
      AND courses.teacher_id = auth.uid()
    )
  );

-- System can insert analytics (via service role)
CREATE POLICY "System can insert analytics"
  ON analytics_snapshot FOR INSERT
  WITH CHECK (true);
