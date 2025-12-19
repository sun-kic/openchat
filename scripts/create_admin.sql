-- =============================================
-- 创建管理员账号脚本
-- =============================================
-- 使用说明：
-- 1. 先在Supabase Dashboard → Authentication → Users 创建一个用户
-- 2. 复制用户ID
-- 3. 替换下面的 'YOUR_AUTH_USER_ID' 和 'YOUR_ADMIN_EMAIL'
-- 4. 在Supabase SQL Editor中运行此脚本

-- 替换这两个值
DO $$
DECLARE
  v_user_id UUID := 'YOUR_AUTH_USER_ID';  -- 从Auth → Users中复制的用户ID
  v_display_name TEXT := 'System Administrator';
BEGIN
  -- 检查用户是否存在于auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Auth user with ID % does not exist. Please create user in Supabase Dashboard first.', v_user_id;
  END IF;

  -- 插入或更新profile为admin
  INSERT INTO profiles (id, role, display_name)
  VALUES (v_user_id, 'admin', v_display_name)
  ON CONFLICT (id) DO UPDATE
  SET role = 'admin',
      display_name = EXCLUDED.display_name,
      updated_at = NOW();

  RAISE NOTICE 'Admin profile created successfully for user ID: %', v_user_id;
END $$;

-- 验证管理员创建成功
SELECT
  p.id,
  u.email,
  p.role,
  p.display_name,
  p.created_at
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'admin';
