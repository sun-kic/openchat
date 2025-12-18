-- =============================================
-- ADD REPLY FUNCTIONALITY AND FINAL CHOICE
-- =============================================

-- Add reply_to column to messages for Round 3 peer review
ALTER TABLE messages
ADD COLUMN reply_to UUID REFERENCES messages(id) ON DELETE SET NULL;

-- Add index for reply lookups
CREATE INDEX idx_messages_reply_to ON messages(reply_to);

-- Update rounds table to track completion
ALTER TABLE rounds
ADD COLUMN completed_at TIMESTAMPTZ;

-- Add final choice fields to groups table
ALTER TABLE groups
ADD COLUMN final_choice CHAR(1) CHECK (final_choice IN ('A', 'B', 'C', 'D')),
ADD COLUMN final_rationale TEXT,
ADD COLUMN final_submitted_at TIMESTAMPTZ,
ADD COLUMN final_submitted_by UUID REFERENCES profiles(id);

-- Add index for final choice queries
CREATE INDEX idx_groups_final_choice ON groups(activity_id, final_choice);

-- Update RLS policies for replies
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
CREATE POLICY "Leader can update final choice"
  ON groups FOR UPDATE
  USING (leader_user_id = auth.uid())
  WITH CHECK (leader_user_id = auth.uid());
