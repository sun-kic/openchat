# OpenChat 认证系统重构 - 部署和测试指南

## 📋 部署前检查清单

- [ ] 确保有Supabase项目访问权限
- [ ] 本地已安装Supabase CLI
- [ ] `.env.local` 配置正确
- [ ] 已备份当前数据库（如果有数据）

## 🚀 步骤1: 运行数据库Migrations

### 1.1 登录Supabase CLI
```bash
npx supabase login
```

### 1.2 链接到您的项目
```bash
npx supabase link --project-ref <your-project-ref>
```

查找project-ref：登录 https://app.supabase.com → 选择项目 → Settings → General → Reference ID

### 1.3 推送Migrations到数据库
```bash
npx supabase db push
```

这将按顺序执行以下10个migration文件：
1. `20250120000001_add_activity_invitations.sql` - 活动邀请表
2. `20250120000002_add_student_sessions.sql` - 学生会话表
3. `20250120000003_extend_profiles_role_admin.sql` - 添加admin角色
4. `20250120000004_add_invitation_rls_policies.sql` - 邀请RLS策略
5. `20250120000005_add_student_session_rls_policies.sql` - 会话RLS策略
6. `20250120000006_create_user_context_function.sql` - 统一身份函数
7. `20250120000007_update_messages_rls_for_dual_auth.sql` - 消息RLS更新
8. `20250120000008_update_submissions_rls_for_dual_auth.sql` - 提交RLS更新
9. `20250120000009_update_groups_rls_for_dual_auth.sql` - 小组RLS更新
10. `20250120000010_update_rounds_rls_for_dual_auth.sql` - 轮次RLS更新

### 1.4 生成TypeScript类型
```bash
npx supabase gen types typescript --linked > types/database.generated.ts
```

## 👤 步骤2: 创建首个管理员账号

### 选项A: 通过Supabase控制台（推荐）

1. 打开 Supabase Dashboard → Authentication → Users
2. 点击 "Add user" → "Create new user"
3. 填写：
   - Email: `admin@your-domain.com`
   - Password: 设置一个强密码
   - Auto Confirm User: ✅ 勾选
4. 点击 "Create user"，记下生成的 User ID

5. 打开 SQL Editor，运行以下脚本：

```sql
-- 替换 'USER_ID_HERE' 为上面创建的用户ID
INSERT INTO profiles (id, role, display_name)
VALUES ('USER_ID_HERE', 'admin', 'System Administrator')
ON CONFLICT (id) DO UPDATE
SET role = 'admin';
```

### 选项B: 通过SQL脚本（一步完成）

在 SQL Editor 中运行：

```sql
-- 创建管理员用户和profile
DO $$
DECLARE
  admin_id UUID;
BEGIN
  -- 使用 Supabase Auth Admin API 创建用户
  -- 注意：这需要在服务器端执行，或使用 service_role key

  -- 如果已有auth用户，直接插入profile
  INSERT INTO profiles (id, role, display_name)
  VALUES (
    'YOUR_AUTH_USER_ID',  -- 替换为实际的auth.users ID
    'admin',
    'System Administrator'
  )
  ON CONFLICT (id) DO UPDATE
  SET role = 'admin';
END $$;
```

### 选项C: 临时提升现有用户为管理员

如果您已经有一个教师账号：

```sql
-- 将现有用户提升为管理员
UPDATE profiles
SET role = 'admin'
WHERE id = 'YOUR_USER_ID';  -- 替换为您的用户ID
```

## 🧪 步骤3: 端到端测试

### 3.1 测试管理员功能

1. **登录管理员账号**
   - 访问: `http://localhost:3000/login`
   - 使用管理员邮箱和密码登录

2. **访问管理员仪表盘**
   - 应该自动重定向到 `/admin`
   - 确认可以看到"Admin Dashboard"页面

3. **创建教师账号**
   - 点击 "Create New Teacher"
   - 填写：
     - Email: `teacher1@test.com`
     - Display Name: `Test Teacher`
   - 点击 "Create Teacher Account"
   - **重要**: 记下生成的临时密码！

4. **验证教师账号**
   - 登出管理员账号
   - 使用教师邮箱和临时密码登录
   - 应该重定向到 `/teacher`

### 3.2 测试教师功能

1. **创建课程**（如果还没有）
   - 在教师仪表盘创建一个测试课程
   - 记下课程ID

2. **创建活动**
   - 进入课程 → 创建新活动
   - 添加至少一个问题
   - 设置活动为 "running" 状态

3. **生成邀请链接**
   - 进入活动详情页
   - 查找 "Generate Invitation Link" 或类似按钮
   - 如果没有UI，暂时可以通过测试脚本生成：

```typescript
// 在浏览器控制台运行（需要先登录教师账号）
const response = await fetch('/api/invitations/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    activityId: 'YOUR_ACTIVITY_ID',
    expiresInHours: 24
  })
});
const data = await response.json();
console.log('Invitation URL:', data.url);
```

   或者直接在SQL Editor中创建：

```sql
-- 手动创建邀请token（用于测试）
INSERT INTO activity_invitations (
  activity_id,
  token,
  created_by,
  expires_at,
  is_active
) VALUES (
  'YOUR_ACTIVITY_ID',  -- 替换为实际的活动ID
  'test_token_' || md5(random()::text),  -- 生成随机token
  'YOUR_TEACHER_ID',  -- 替换为教师ID
  NOW() + INTERVAL '24 hours',
  true
)
RETURNING token;
```

   记下返回的token，邀请链接格式为：
   `http://localhost:3000/join/{token}`

### 3.3 测试学生无密码访问

1. **打开邀请链接**
   - 在新的无痕窗口打开: `http://localhost:3000/join/{token}`
   - 应该看到 "Join Activity" 页面，显示活动标题

2. **填写学生信息**
   - Student Number: `S12345678`
   - Your Name: `张三`
   - 点击 "Join Activity"

3. **验证重定向**
   - 应该重定向到 `/student/activities/{activityId}`
   - 确认学生可以看到活动界面

4. **测试会话持久化**
   - 关闭浏览器标签
   - 重新访问 `http://localhost:3000/student/activities/{activityId}`
   - 应该仍然保持登录状态（session cookie有效）

5. **测试重复加入**
   - 在另一个无痕窗口再次访问邀请链接
   - 使用相同的学号 `S12345678`
   - 应该直接返回现有session，不创建新记录

6. **测试不同学生**
   - 使用不同学号 `S87654321` 和姓名 `李四`
   - 应该成功创建新的独立session

### 3.4 测试学生功能

1. **发送消息**（需要先创建round和分配group）
   - 确保教师已创建round并分配学生到group
   - 学生尝试发送消息
   - 验证消息成功提交

2. **提交选择**
   - 测试individual choice提交
   - 如果是group leader，测试final choice提交

## 🔍 步骤4: 数据验证

### 4.1 检查student_sessions表

```sql
-- 查看所有学生会话
SELECT
  id,
  student_number,
  display_name,
  activity_id,
  group_id,
  created_at,
  expires_at,
  last_active_at
FROM student_sessions
ORDER BY created_at DESC;
```

预期结果：
- 应该看到2个session（张三和李四）
- `expires_at` 应该是7天后
- `last_active_at` 应该是最近的时间

### 4.2 检查activity_invitations表

```sql
-- 查看邀请使用情况
SELECT
  token,
  activity_id,
  use_count,
  max_uses,
  is_active,
  expires_at
FROM activity_invitations
ORDER BY created_at DESC;
```

预期结果：
- `use_count` 应该是 2（张三和李四各用了一次）
- `is_active` 应该是 `true`

### 4.3 验证RLS策略

作为临时学生（张三的session）：

```sql
-- 设置session context（模拟middleware设置的context）
-- 注意：这需要在应用层测试，SQL无法完全模拟

-- 验证学生只能看到自己group的消息
SELECT COUNT(*) FROM messages WHERE activity_id = 'YOUR_ACTIVITY_ID';
-- 应该只返回所属group的消息数量
```

## ⚠️ 故障排查

### 问题1: Migration失败

**错误**: `relation "activity_invitations" already exists`

**解决**:
```sql
-- 检查表是否已存在
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- 如果需要重置（警告：会删除数据）
DROP TABLE IF EXISTS student_sessions CASCADE;
DROP TABLE IF EXISTS activity_invitations CASCADE;
```

### 问题2: 无法访问/admin

**症状**: 访问 `/admin` 时重定向到首页

**解决**:
```sql
-- 确认用户role是admin
SELECT id, role, display_name FROM profiles WHERE role = 'admin';

-- 如果没有，手动设置
UPDATE profiles SET role = 'admin' WHERE id = 'YOUR_USER_ID';
```

### 问题3: 学生session cookie未设置

**症状**: 学生加入后刷新页面需要重新登录

**检查**:
1. 浏览器开发工具 → Application → Cookies
2. 查找 `student_session` cookie
3. 确认 `HttpOnly`, `Secure`, `SameSite` 属性

**解决**: 检查 `lib/actions/student-auth.ts` 的cookie设置

### 问题4: RLS策略阻止访问

**症状**: "Row level security policy violation"

**调试**:
```sql
-- 检查get_user_context函数是否正常
SELECT * FROM get_user_context();

-- 临时禁用RLS进行测试（仅开发环境）
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
-- 测试完后记得重新启用
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
```

### 问题5: Middleware循环重定向

**症状**: 页面不断刷新

**检查**: `lib/supabase/middleware.ts` 中的路由保护逻辑
- 确保 `/join/*` 在 `publicRoutes` 中
- 确保不会同时满足多个重定向条件

## ✅ 测试检查清单

完成以下测试后可以认为系统正常：

- [ ] 管理员可以创建教师账号
- [ ] 教师可以生成活动邀请链接
- [ ] 学生可以通过链接无密码加入
- [ ] 学生session在关闭浏览器后仍然有效
- [ ] 相同学号无法重复加入同一活动
- [ ] 不同学生可以独立加入
- [ ] 学生可以看到活动内容
- [ ] 学生只能看到自己group的消息（RLS隔离）
- [ ] 教师可以查看所有学生会话
- [ ] 邀请链接的use_count正确递增
- [ ] /signup 路由已被阻止

## 🎯 后续优化建议

1. **添加邀请管理UI**
   - 在活动页面添加"Invitation Manager"组件
   - 显示现有邀请列表
   - 提供一键复制链接功能

2. **添加会话管理UI**
   - 教师可以查看活跃的学生会话
   - 提供撤销会话（踢出学生）功能

3. **邮件通知**
   - 创建教师账号时自动发送欢迎邮件和临时密码
   - 教师重置密码后发送通知

4. **分析面板**
   - 统计邀请链接使用情况
   - 学生参与时间分析
   - Session过期率监控

5. **定期清理**
   - 添加cron job清理过期的student_sessions
   - 清理过期的activity_invitations

## 📊 监控指标

生产环境应监控：

```sql
-- 活跃学生会话数
SELECT COUNT(*) FROM student_sessions WHERE expires_at > NOW();

-- 今日新增会话
SELECT COUNT(*) FROM student_sessions
WHERE created_at > CURRENT_DATE;

-- 邀请链接使用率
SELECT
  token,
  use_count,
  max_uses,
  CASE
    WHEN max_uses IS NULL THEN 'unlimited'
    ELSE (use_count::float / max_uses * 100)::int || '%'
  END as usage_rate
FROM activity_invitations
WHERE is_active = true;

-- 过期但未清理的会话
SELECT COUNT(*) FROM student_sessions
WHERE expires_at < NOW();
```

## 🔒 安全检查

部署到生产前确认：

- [ ] 所有环境变量已正确配置
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 仅在服务器端使用
- [ ] RLS策略已在所有表上启用
- [ ] Student session token使用crypto.randomBytes生成
- [ ] Cookie设置了Secure flag（生产环境）
- [ ] 没有硬编码的密码或敏感信息
- [ ] 管理员账号使用强密码

## 🎉 完成

如果所有测试通过，恭喜！OpenChat认证系统重构成功！

学生现在可以：
- ✅ 无需注册，点击链接即可参与
- ✅ 使用学号和姓名快速加入
- ✅ Session持久化，可随时返回

教师现在可以：
- ✅ 由管理员统一创建账号，更安全
- ✅ 为每个活动生成独立邀请链接
- ✅ 控制链接有效期和使用次数

系统现在：
- ✅ 支持混合认证（永久用户+临时学生）
- ✅ 数据严格隔离（活动级、小组级）
- ✅ 更好的安全性和可控性
