-- Enable UUID extension (pgcrypto is default on Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student', 'ta')),
  display_name TEXT NOT NULL,
  student_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- COURSES TABLE
-- =============================================
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  invitation_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_courses_teacher ON courses(teacher_id);
CREATE INDEX idx_courses_invitation_code ON courses(invitation_code);

-- =============================================
-- COURSE_MEMBERS TABLE
-- =============================================
CREATE TABLE course_members (
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (course_id, user_id)
);

CREATE INDEX idx_course_members_user ON course_members(user_id);

-- =============================================
-- ACTIVITIES TABLE
-- =============================================
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'ended')),
  current_question_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_course ON activities(course_id);
CREATE INDEX idx_activities_status ON activities(status);

-- =============================================
-- QUESTIONS TABLE
-- =============================================
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  context TEXT,
  concept_tags TEXT[] DEFAULT '{}',
  choices JSONB NOT NULL, -- {A: {text, correct}, B: {...}, ...}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_course ON questions(course_id);

-- =============================================
-- ACTIVITY_QUESTIONS TABLE (Join/Order)
-- =============================================
CREATE TABLE activity_questions (
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  PRIMARY KEY (activity_id, question_id),
  UNIQUE (activity_id, order_index)
);

CREATE INDEX idx_activity_questions_activity ON activity_questions(activity_id);

-- =============================================
-- GROUPS TABLE
-- =============================================
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  leader_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_groups_activity ON groups(activity_id);
CREATE INDEX idx_groups_leader ON groups(leader_user_id);

-- =============================================
-- GROUP_MEMBERS TABLE
-- =============================================
CREATE TABLE group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_in_group TEXT CHECK (role_in_group IN ('explainer', 'example', 'challenger', 'summarizer')),
  seat_no INTEGER NOT NULL CHECK (seat_no >= 1 AND seat_no <= 4),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id),
  UNIQUE (group_id, seat_no)
);

CREATE INDEX idx_group_members_user ON group_members(user_id);

-- =============================================
-- ROUNDS TABLE
-- =============================================
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  round_no INTEGER NOT NULL CHECK (round_no >= 1 AND round_no <= 3),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  rules JSONB DEFAULT '{}', -- {min_len: 20, required_elements: [...]}
  start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (activity_id, question_id, round_no)
);

CREATE INDEX idx_rounds_activity ON rounds(activity_id);
CREATE INDEX idx_rounds_question ON rounds(question_id);
CREATE INDEX idx_rounds_status ON rounds(status);

-- =============================================
-- MESSAGES TABLE
-- =============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  meta JSONB DEFAULT '{}', -- {len, keyword_hits, has_example, has_if_then}
  reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_activity ON messages(activity_id);
CREATE INDEX idx_messages_question ON messages(question_id);
CREATE INDEX idx_messages_group ON messages(group_id);
CREATE INDEX idx_messages_round ON messages(round_id);
CREATE INDEX idx_messages_user ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- =============================================
-- SUBMISSIONS TABLE
-- =============================================
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('individual_choice', 'final_choice')),
  choice TEXT NOT NULL CHECK (choice IN ('A', 'B', 'C', 'D')),
  rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (activity_id, question_id, group_id, user_id, type)
);

CREATE INDEX idx_submissions_activity ON submissions(activity_id);
CREATE INDEX idx_submissions_question ON submissions(question_id);
CREATE INDEX idx_submissions_group ON submissions(group_id);
CREATE INDEX idx_submissions_user ON submissions(user_id);

-- =============================================
-- TEACHER_NOTES TABLE
-- =============================================
CREATE TABLE teacher_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teacher_notes_activity ON teacher_notes(activity_id);
CREATE INDEX idx_teacher_notes_user ON teacher_notes(user_id);
CREATE INDEX idx_teacher_notes_teacher ON teacher_notes(teacher_id);

-- =============================================
-- ANALYTICS_SNAPSHOT TABLE (Optional)
-- =============================================
CREATE TABLE analytics_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_activity ON analytics_snapshot(activity_id);
CREATE INDEX idx_analytics_question ON analytics_snapshot(question_id);
CREATE INDEX idx_analytics_group ON analytics_snapshot(group_id);
CREATE INDEX idx_analytics_user ON analytics_snapshot(user_id);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
