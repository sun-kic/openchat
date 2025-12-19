-- =============================================
-- STUDENT SESSIONS TABLE
-- =============================================
-- Manages temporary student access without requiring auth.users entries

CREATE TABLE student_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  student_number TEXT NOT NULL,
  display_name TEXT NOT NULL,
  invitation_token TEXT NOT NULL REFERENCES activity_invitations(token),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  meta JSONB DEFAULT '{}' -- Store IP, user agent, etc. for security audit
);

-- Indexes for performance
CREATE INDEX idx_student_sessions_token ON student_sessions(session_token);
CREATE INDEX idx_student_sessions_activity ON student_sessions(activity_id);
CREATE INDEX idx_student_sessions_group ON student_sessions(group_id);
CREATE INDEX idx_student_sessions_student_number ON student_sessions(student_number);
CREATE INDEX idx_student_sessions_expires ON student_sessions(expires_at);
CREATE INDEX idx_student_sessions_last_active ON student_sessions(last_active_at);

-- Unique constraint: one student_number per activity
CREATE UNIQUE INDEX idx_student_sessions_activity_student
  ON student_sessions(activity_id, student_number);

COMMENT ON TABLE student_sessions IS 'Temporary sessions for students accessing activities via invitation links';
COMMENT ON COLUMN student_sessions.id IS 'Session ID, used as user_id in messages and submissions';
COMMENT ON COLUMN student_sessions.session_token IS 'Token stored in browser cookie/localStorage for authentication';
COMMENT ON COLUMN student_sessions.group_id IS 'Assigned group (set by teacher), NULL until assigned';
COMMENT ON COLUMN student_sessions.expires_at IS 'Session expiration time (default: 7 days from creation)';
COMMENT ON COLUMN student_sessions.last_active_at IS 'Updated on each request for inactivity timeout detection';
