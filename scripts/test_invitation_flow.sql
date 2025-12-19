-- =============================================
-- 测试邀请流程 - 快速创建测试数据
-- =============================================
-- 此脚本用于快速设置测试环境

-- 步骤1: 创建测试教师账号（需要先在Auth中创建用户）
-- 替换 'TEACHER_AUTH_USER_ID' 为实际的auth用户ID

DO $$
DECLARE
  v_teacher_id UUID := 'TEACHER_AUTH_USER_ID';  -- 替换为实际ID
  v_course_id UUID;
  v_activity_id UUID;
  v_question_id UUID;
  v_invitation_token TEXT;
BEGIN
  -- 创建教师profile
  INSERT INTO profiles (id, role, display_name)
  VALUES (v_teacher_id, 'teacher', 'Test Teacher')
  ON CONFLICT (id) DO UPDATE
  SET role = 'teacher';

  -- 创建测试课程
  INSERT INTO courses (teacher_id, title, description, invitation_code)
  VALUES (
    v_teacher_id,
    'PHP编程基础',
    '测试课程',
    'TEST' || substring(md5(random()::text), 1, 4)
  )
  RETURNING id INTO v_course_id;

  RAISE NOTICE 'Course created: %', v_course_id;

  -- 创建测试问题
  INSERT INTO questions (course_id, title, prompt, concept_tags, choices)
  VALUES (
    v_course_id,
    '什么是变量？',
    '请解释PHP中变量的概念',
    ARRAY['variable', 'scope', 'type'],
    '{"A": {"text": "存储数据的容器", "correct": true}, "B": {"text": "函数", "correct": false}}'::jsonb
  )
  RETURNING id INTO v_question_id;

  -- 创建测试活动
  INSERT INTO activities (course_id, title, description, status)
  VALUES (
    v_course_id,
    'PHP变量讨论',
    '关于变量的小组讨论',
    'running'
  )
  RETURNING id INTO v_activity_id;

  RAISE NOTICE 'Activity created: %', v_activity_id;

  -- 关联问题到活动
  INSERT INTO activity_questions (activity_id, question_id, order_index)
  VALUES (v_activity_id, v_question_id, 0);

  -- 创建测试小组
  INSERT INTO groups (activity_id, name)
  VALUES (v_activity_id, 'Group 1');

  -- 生成邀请token
  v_invitation_token := 'test_' || encode(gen_random_bytes(16), 'hex');

  INSERT INTO activity_invitations (
    activity_id,
    token,
    created_by,
    expires_at,
    is_active
  )
  VALUES (
    v_activity_id,
    v_invitation_token,
    v_teacher_id,
    NOW() + INTERVAL '24 hours',
    true
  );

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Test environment created successfully!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Course ID: %', v_course_id;
  RAISE NOTICE 'Activity ID: %', v_activity_id;
  RAISE NOTICE 'Invitation Token: %', v_invitation_token;
  RAISE NOTICE 'Invitation URL: http://localhost:3000/join/%', v_invitation_token;
  RAISE NOTICE '===========================================';
END $$;
