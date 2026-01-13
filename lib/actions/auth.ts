'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Profile, ProfileInsert, UserIdentity } from '@/types'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
  role: 'teacher' | 'student' | 'ta',
  studentNumber?: string
) {
  const supabase = await createClient()

  // Sign up the user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: 'Failed to create user' }
  }

  // Create a new client with service role to bypass RLS for profile creation
  const { createClient: createServiceClient } = await import('@supabase/supabase-js')
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Create profile using service role
  const profile: ProfileInsert = {
    id: authData.user.id,
    role,
    display_name: displayName,
    student_number: studentNumber || null,
  }

  const { error: profileError } = await serviceSupabase
    .from('profiles')
    .insert(profile)

  if (profileError) {
    return { error: profileError.message }
  }

  return { success: true }
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data
}

/**
 * Get unified user identity supporting both permanent users and temporary students
 * This is the new primary authentication function that replaces getCurrentProfile()
 */
export async function getCurrentIdentity(): Promise<UserIdentity | null> {
  // Check for student session token FIRST
  // This allows temporary students to work even in browsers where a teacher is logged in
  const sessionToken = await getStudentSessionToken()

  if (sessionToken) {
    // Use service client to bypass RLS for student session lookup
    const serviceSupabase = createServiceClient()
    const { data: session } = await serviceSupabase
      .from('student_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (session) {
      // Update last active timestamp
      await serviceSupabase
        .from('student_sessions')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', session.id)

      return {
        id: session.id,
        role: 'student',
        display_name: session.display_name,
        student_number: session.student_number,
        session_type: 'temporary',
        activity_id: session.activity_id,
        group_id: session.group_id || undefined,
      }
    } else {
      // Session expired or invalid - clear cookie
      const cookieStore = await cookies()
      cookieStore.delete('student_session')
    }
  }

  // Fall back to permanent auth (teachers, admin, permanent students)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Fetch profile from database
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) return null

    return {
      id: profile.id,
      role: profile.role as any,
      display_name: profile.display_name,
      student_number: profile.student_number,
      session_type: 'permanent',
    }
  }

  return null
}

/**
 * Helper function to get student session token from cookie
 */
async function getStudentSessionToken(): Promise<string | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get('student_session')
  return cookie?.value || null
}
