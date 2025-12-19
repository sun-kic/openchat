'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentIdentity } from './auth'
import { generateSecurePassword } from '@/lib/utils/crypto'
import { revalidatePath } from 'next/cache'

/**
 * Create a new teacher account (admin only)
 * @param email - Teacher email address
 * @param displayName - Teacher display name
 * @param password - Optional password (auto-generated if not provided)
 */
export async function createTeacherAccount(
  email: string,
  displayName: string,
  password?: string
) {
  const supabase = await createClient()
  const identity = await getCurrentIdentity()

  if (!identity || identity.role !== 'admin') {
    return { error: 'Unauthorized - Admin access required' }
  }

  // Generate password if not provided
  const generatedPassword = password || generateSecurePassword(16)

  // Use service role client for admin operations
  const { createClient: createServiceClient } = await import(
    '@supabase/supabase-js'
  )
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  // Create auth user
  const { data: authUser, error: authError } =
    await serviceSupabase.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true, // Auto-confirm email
    })

  if (authError) {
    return { error: authError.message }
  }

  // Create profile
  const { error: profileError } = await serviceSupabase.from('profiles').insert({
    id: authUser.user.id,
    role: 'teacher',
    display_name: displayName,
  })

  if (profileError) {
    // Rollback: delete auth user
    await serviceSupabase.auth.admin.deleteUser(authUser.user.id)
    return { error: profileError.message }
  }

  revalidatePath('/admin/teachers')

  return {
    success: true,
    teacher: {
      id: authUser.user.id,
      email,
      temporaryPassword: generatedPassword,
    },
  }
}

/**
 * List all teacher accounts (admin only)
 */
export async function listTeacherAccounts() {
  const supabase = await createClient()
  const identity = await getCurrentIdentity()

  if (!identity || identity.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, created_at')
    .eq('role', 'teacher')
    .order('created_at', { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { data }
}

/**
 * Delete a teacher account (admin only)
 * WARNING: This will cascade delete all courses, activities, etc.
 */
export async function deleteTeacherAccount(teacherId: string) {
  const supabase = await createClient()
  const identity = await getCurrentIdentity()

  if (!identity || identity.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  // Verify this is actually a teacher
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', teacherId)
    .single()

  if (!profile || profile.role !== 'teacher') {
    return { error: 'Teacher not found' }
  }

  // Use service role to delete auth user (will cascade to profile)
  const { createClient: createServiceClient } = await import(
    '@supabase/supabase-js'
  )
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const { error } = await serviceSupabase.auth.admin.deleteUser(teacherId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/teachers')

  return { success: true }
}

/**
 * Reset teacher password (admin only)
 */
export async function resetTeacherPassword(teacherId: string) {
  const supabase = await createClient()
  const identity = await getCurrentIdentity()

  if (!identity || identity.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  // Verify this is actually a teacher
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', teacherId)
    .single()

  if (!profile || profile.role !== 'teacher') {
    return { error: 'Teacher not found' }
  }

  // Generate new password
  const newPassword = generateSecurePassword(16)

  // Use service role to update password
  const { createClient: createServiceClient } = await import(
    '@supabase/supabase-js'
  )
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const { error } = await serviceSupabase.auth.admin.updateUserById(teacherId, {
    password: newPassword,
  })

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    newPassword,
  }
}
