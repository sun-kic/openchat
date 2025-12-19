-- =============================================
-- EXTEND PROFILES ROLE TO INCLUDE 'admin'
-- =============================================
-- Add 'admin' role for system administrators who create teacher accounts

-- Drop existing constraint
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new constraint with 'admin' role
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('teacher', 'student', 'ta', 'admin'));

COMMENT ON COLUMN profiles.role IS 'User role: teacher (course creator), student (participant), ta (teaching assistant), admin (system administrator)';
