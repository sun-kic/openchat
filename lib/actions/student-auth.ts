'use server'

import { createClient } from '@/lib/supabase/server'
import { generateSecureToken } from '@/lib/utils/crypto'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

/**
 * Validate an activity invitation token
 * Checks if token is valid, active, not expired, and activity is running
 */
export async function validateInvitationToken(token: string) {
  const supabase = await createClient()

  const { data: invitation, error } = await supabase
    .from('activity_invitations')
    .select(
      `
      *,
      activities (
        id,
        title,
        description,
        status,
        course_id
      )
    `
    )
    .eq('token', token)
    .eq('is_active', true)
    .single()

  if (error || !invitation) {
    return { valid: false, error: 'Invalid invitation link' }
  }

  // Check expiration
  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    return { valid: false, error: 'Invitation has expired' }
  }

  // Check max uses
  if (invitation.max_uses && invitation.use_count >= invitation.max_uses) {
    return { valid: false, error: 'Invitation link has reached maximum uses' }
  }

  // Check activity status
  if (invitation.activities.status === 'ended') {
    return { valid: false, error: 'Activity has ended' }
  }

  return {
    valid: true,
    invitation,
    activity: invitation.activities,
  }
}

/**
 * Join an activity using invitation token
 * Creates a student session and sets session cookie
 */
export async function joinActivityWithToken(
  invitationToken: string,
  studentNumber: string,
  displayName: string
) {
  const supabase = await createClient()

  // 1. Validate invitation
  const validation = await validateInvitationToken(invitationToken)
  if (!validation.valid) {
    return { error: validation.error }
  }

  const { activity, invitation } = validation

  // 2. Check for existing session
  const { data: existingSession } = await supabase
    .from('student_sessions')
    .select('*')
    .eq('activity_id', activity.id)
    .eq('student_number', studentNumber.trim())
    .gt('expires_at', new Date().toISOString())
    .single()

  if (existingSession) {
    // Update last active and return existing token
    await supabase
      .from('student_sessions')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', existingSession.id)

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set('student_session', existingSession.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return {
      success: true,
      sessionToken: existingSession.session_token,
      activityId: activity.id,
      groupId: existingSession.group_id,
    }
  }

  // 3. Create new session
  const sessionToken = generateSecureToken('stu_sess_')

  // Calculate expiration: 7 days from now
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data: session, error: sessionError } = await supabase
    .from('student_sessions')
    .insert({
      session_token: sessionToken,
      activity_id: activity.id,
      student_number: studentNumber.trim(),
      display_name: displayName.trim(),
      invitation_token: invitationToken,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (sessionError) {
    return { error: sessionError.message }
  }

  // 4. Increment invitation use count
  await supabase
    .from('activity_invitations')
    .update({ use_count: (invitation as any).use_count + 1 })
    .eq('id', invitation.id)

  // 5. Set cookie
  const cookieStore = await cookies()
  cookieStore.set('student_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  revalidatePath(`/student/activities/${activity.id}`)

  return {
    success: true,
    sessionToken,
    activityId: activity.id,
    groupId: null,
  }
}

/**
 * End student session (logout)
 */
export async function endStudentSession() {
  const cookieStore = await cookies()
  cookieStore.delete('student_session')
  return { success: true }
}

/**
 * Get current student session info
 */
export async function getStudentSessionInfo() {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('student_session')?.value

  if (!sessionToken) {
    return { data: null }
  }

  const { data: session } = await supabase
    .from('student_sessions')
    .select('*')
    .eq('session_token', sessionToken)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!session) {
    // Session expired - clear cookie
    cookieStore.delete('student_session')
    return { data: null }
  }

  return { data: session }
}
