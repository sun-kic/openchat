-- =============================================
-- ADD REPLY FUNCTIONALITY AND FINAL CHOICE
-- =============================================

-- Add reply_to column to messages for Round 3 peer review (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'reply_to') THEN
    ALTER TABLE messages ADD COLUMN reply_to UUID REFERENCES messages(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for reply lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to);

-- Update rounds table to track completion (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rounds' AND column_name = 'completed_at') THEN
    ALTER TABLE rounds ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add final choice fields to groups table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'final_choice') THEN
    ALTER TABLE groups ADD COLUMN final_choice CHAR(1) CHECK (final_choice IN ('A', 'B', 'C', 'D'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'final_rationale') THEN
    ALTER TABLE groups ADD COLUMN final_rationale TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'final_submitted_at') THEN
    ALTER TABLE groups ADD COLUMN final_submitted_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'final_submitted_by') THEN
    ALTER TABLE groups ADD COLUMN final_submitted_by UUID REFERENCES profiles(id);
  END IF;
END $$;

-- Add index for final choice queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_groups_final_choice ON groups(activity_id, final_choice);

-- Update RLS policies for replies (drop if exists first)
DROP POLICY IF EXISTS "Students can view replies in their group" ON messages;
CREATE POLICY "Students can view replies in their group"
  ON messages FOR SELECT
  USING (
    reply_to IS NULL OR
    EXISTS (
      SELECT 1 FROM group_members gm
      JOIN messages parent ON parent.id = messages.reply_to
      WHERE gm.group_id = parent.group_id
      AND gm.user_id = auth.uid()
    )
  );

-- Policy for updating final choice (leader only)
DROP POLICY IF EXISTS "Leader can update final choice" ON groups;
CREATE POLICY "Leader can update final choice"
  ON groups FOR UPDATE
  USING (leader_user_id = auth.uid())
  WITH CHECK (leader_user_id = auth.uid());
