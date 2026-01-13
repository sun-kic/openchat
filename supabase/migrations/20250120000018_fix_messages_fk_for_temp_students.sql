-- Migration: Fix messages and submissions foreign keys for temporary students
-- Temporary students don't have profiles, they have student_sessions
-- We need to drop the FK constraint on user_id to allow session IDs
-- Authorization is handled by RLS policies which already support both user types

-- Drop the FK constraint on messages.user_id
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_user_id_fkey;

-- Drop the FK constraint on submissions.user_id
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_user_id_fkey;

-- Add a comment explaining the change
COMMENT ON COLUMN messages.user_id IS 'Can be either a profile ID (permanent users) or a student_session ID (temporary students). Authorization handled by RLS.';
COMMENT ON COLUMN submissions.user_id IS 'Can be either a profile ID (permanent users) or a student_session ID (temporary students). Authorization handled by RLS.';
