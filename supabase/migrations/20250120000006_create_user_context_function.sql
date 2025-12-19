-- =============================================
-- UNIFIED USER CONTEXT FUNCTION
-- =============================================
-- Returns current user identity from either Supabase Auth or student session

CREATE OR REPLACE FUNCTION get_user_context()
RETURNS TABLE (
  user_id UUID,
  role TEXT,
  session_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE -- Cache result for duration of transaction
AS $$
DECLARE
  auth_id UUID;
  user_role TEXT;
BEGIN
  -- First, try to get authenticated user from Supabase Auth
  auth_id := auth.uid();

  IF auth_id IS NOT NULL THEN
    -- Fetch role from profiles
    SELECT p.role::TEXT INTO user_role
    FROM profiles p
    WHERE p.id = auth_id;

    IF user_role IS NOT NULL THEN
      RETURN QUERY
      SELECT
        auth_id as user_id,
        user_role as role,
        'permanent'::TEXT as session_type;
      RETURN;
    END IF;
  END IF;

  -- If no auth user, check for student session via custom header
  -- Note: This will be set by middleware when validating student_session cookie
  -- For now, this function primarily supports permanent users
  -- Student session validation will happen at application level initially

  -- Return empty result if no user found
  RETURN;
END;
$$;

COMMENT ON FUNCTION get_user_context() IS 'Unified function to get current user identity from either Supabase Auth or student session. Used by RLS policies to support hybrid authentication.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_context() TO authenticated, anon;
