'use server'

import { createClient } from '@/lib/supabase/server'
import { ProfileInsert } from '@/types'
import { redirect } from 'next/navigation'

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

export async function getCurrentProfile() {
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
