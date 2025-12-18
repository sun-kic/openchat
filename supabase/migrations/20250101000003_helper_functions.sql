-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to generate unique invitation codes
CREATE OR REPLACE FUNCTION generate_invitation_code(length INTEGER DEFAULT 8)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude similar chars (I, O, 0, 1)
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-group students (4 per group)
CREATE OR REPLACE FUNCTION auto_group_students(
  p_activity_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_course_id UUID;
  v_student_ids UUID[];
  v_group_size INTEGER := 4;
  v_group_count INTEGER;
  v_group_id UUID;
  v_group_name TEXT;
  i INTEGER := 0;
  j INTEGER := 1;
BEGIN
  -- Get course_id from activity
  SELECT course_id INTO v_course_id
  FROM activities
  WHERE id = p_activity_id;

  -- Get all student IDs enrolled in the course
  SELECT array_agg(user_id ORDER BY joined_at)
  INTO v_student_ids
  FROM course_members
  WHERE course_id = v_course_id;

  -- Calculate number of groups needed
  v_group_count := ceil(array_length(v_student_ids, 1)::float / v_group_size);

  -- Create groups and assign students
  FOR i IN 1..v_group_count LOOP
    v_group_name := 'Group ' || i;

    -- Create group
    INSERT INTO groups (activity_id, name)
    VALUES (p_activity_id, v_group_name)
    RETURNING id INTO v_group_id;

    -- Assign up to 4 students to this group
    FOR j IN 1..v_group_size LOOP
      DECLARE
        v_student_index INTEGER := (i - 1) * v_group_size + j;
        v_student_id UUID;
      BEGIN
        IF v_student_index <= array_length(v_student_ids, 1) THEN
          v_student_id := v_student_ids[v_student_index];

          INSERT INTO group_members (group_id, user_id, seat_no)
          VALUES (v_group_id, v_student_id, j);
        END IF;
      END;
    END LOOP;

    -- Assign first student as leader
    UPDATE groups
    SET leader_user_id = v_student_ids[(i - 1) * v_group_size + 1]
    WHERE id = v_group_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to rotate group leader
CREATE OR REPLACE FUNCTION rotate_group_leader(p_group_id UUID)
RETURNS UUID AS $$
DECLARE
  v_current_leader_seat INTEGER;
  v_next_leader_seat INTEGER;
  v_next_leader_id UUID;
  v_max_seat INTEGER;
BEGIN
  -- Get current leader's seat number
  SELECT seat_no INTO v_current_leader_seat
  FROM group_members
  WHERE group_id = p_group_id
  AND user_id = (SELECT leader_user_id FROM groups WHERE id = p_group_id);

  -- Get max seat number in group
  SELECT MAX(seat_no) INTO v_max_seat
  FROM group_members
  WHERE group_id = p_group_id;

  -- Calculate next seat (wrap around)
  v_next_leader_seat := CASE
    WHEN v_current_leader_seat >= v_max_seat THEN 1
    ELSE v_current_leader_seat + 1
  END;

  -- Get next leader user_id
  SELECT user_id INTO v_next_leader_id
  FROM group_members
  WHERE group_id = p_group_id
  AND seat_no = v_next_leader_seat;

  -- Update group leader
  UPDATE groups
  SET leader_user_id = v_next_leader_id
  WHERE id = p_group_id;

  RETURN v_next_leader_id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate round completion for a group
CREATE OR REPLACE FUNCTION check_round_completion(
  p_round_id UUID,
  p_group_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_member_count INTEGER;
  v_submission_count INTEGER;
  v_rules JSONB;
  v_all_valid BOOLEAN := TRUE;
BEGIN
  -- Get member count
  SELECT COUNT(*) INTO v_member_count
  FROM group_members
  WHERE group_id = p_group_id;

  -- Get submission count
  SELECT COUNT(*) INTO v_submission_count
  FROM messages
  WHERE round_id = p_round_id
  AND group_id = p_group_id;

  -- Check if all members submitted
  IF v_submission_count < v_member_count THEN
    RETURN FALSE;
  END IF;

  -- Get round rules
  SELECT rules INTO v_rules
  FROM rounds
  WHERE id = p_round_id;

  -- Validate each message against rules
  -- (Simplified validation - full validation should be in application layer)
  SELECT bool_and(
    length(content) >= COALESCE((v_rules->>'min_len')::int, 0)
  ) INTO v_all_valid
  FROM messages
  WHERE round_id = p_round_id
  AND group_id = p_group_id;

  RETURN COALESCE(v_all_valid, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Function to validate message content
CREATE OR REPLACE FUNCTION validate_message_content(
  p_content TEXT,
  p_keywords TEXT[],
  p_min_length INTEGER DEFAULT 20
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_keyword_hits TEXT[] := '{}';
  v_keyword TEXT;
  v_has_causality BOOLEAN := FALSE;
  v_has_example BOOLEAN := FALSE;
BEGIN
  -- Check length
  IF length(p_content) < p_min_length THEN
    v_result := jsonb_build_object(
      'valid', false,
      'error', 'Content too short',
      'min_length', p_min_length,
      'actual_length', length(p_content)
    );
    RETURN v_result;
  END IF;

  -- Check keywords
  FOREACH v_keyword IN ARRAY p_keywords
  LOOP
    IF lower(p_content) LIKE '%' || lower(v_keyword) || '%' THEN
      v_keyword_hits := array_append(v_keyword_hits, v_keyword);
    END IF;
  END LOOP;

  -- Check for causality patterns (if...then, because, therefore, etc.)
  v_has_causality := p_content ~* '(if .+ then|because|therefore|thus|hence|so |as a result)';

  -- Check for example patterns (for example, such as, e.g., like, instance)
  v_has_example := p_content ~* '(for example|such as|e\.g\.|like |for instance|example:|case:)';

  -- Build result
  v_result := jsonb_build_object(
    'valid', true,
    'len', length(p_content),
    'keyword_hits', v_keyword_hits,
    'has_causality', v_has_causality,
    'has_example', v_has_example
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get activity statistics
CREATE OR REPLACE FUNCTION get_activity_stats(p_activity_id UUID)
RETURNS TABLE (
  group_id UUID,
  group_name TEXT,
  total_members INTEGER,
  total_messages INTEGER,
  avg_message_length NUMERIC,
  completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id AS group_id,
    g.name AS group_name,
    COUNT(DISTINCT gm.user_id)::INTEGER AS total_members,
    COUNT(DISTINCT m.id)::INTEGER AS total_messages,
    COALESCE(AVG(length(m.content)), 0)::NUMERIC AS avg_message_length,
    CASE
      WHEN COUNT(DISTINCT gm.user_id) = 0 THEN 0
      ELSE (COUNT(DISTINCT m.user_id)::NUMERIC / COUNT(DISTINCT gm.user_id)::NUMERIC * 100)
    END AS completion_rate
  FROM groups g
  LEFT JOIN group_members gm ON gm.group_id = g.id
  LEFT JOIN messages m ON m.group_id = g.id
  WHERE g.activity_id = p_activity_id
  GROUP BY g.id, g.name
  ORDER BY g.name;
END;
$$ LANGUAGE plpgsql;
