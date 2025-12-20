-- =============================================
-- ENABLE REALTIME FOR STUDENT_SESSIONS
-- =============================================
-- This allows students to receive real-time updates when they are assigned to groups

ALTER PUBLICATION supabase_realtime ADD TABLE student_sessions;

COMMENT ON TABLE student_sessions IS 'Temporary sessions for students accessing activities via invitation links. Realtime enabled for group assignment notifications.';
