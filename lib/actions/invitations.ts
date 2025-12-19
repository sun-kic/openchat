'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentIdentity } from './auth'
import { generateSecureToken } from '@/lib/utils/crypto'
import { revalidatePath } from 'next/cache'

/**
 * Generate a new activity invitation link
 * @param activityId - Activity UUID
 * @param expiresInHours - Optional expiration in hours (null = based on activity end time)
 * @param maxUses - Optional maximum number of uses
 */
export async function generateActivityInvitation(
  activityId: string,
  expiresInHours?: number,
  maxUses?: number
) {
  const supabase = await createClient()
  const identity = await getCurrentIdentity()

  if (!identity || identity.role !== 'teacher') {
    return { error: 'Unauthorized - Teacher access required' }
  }

  // Verify teacher owns the activity
  const { data: activity } = await supabase
    .from('activities')
    .select(
      `
      id,
      status,
      courses!inner (
        teacher_id
      )
    `
    )
    .eq('id', activityId)
    .single()

  if (!activity || (activity.courses as any).teacher_id !== identity.id) {
    return { error: 'Activity not found or unauthorized' }
  }

  // Generate token
  const token = generateSecureToken('act_inv_')

  // Calculate expiration
  let expiresAt = null
  if (expiresInHours) {
    expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + expiresInHours)
  }

  // Insert invitation
  const { data: invitation, error } = await supabase
    .from('activity_invitations')
    .insert({
      activity_id: activityId,
      token,
      created_by: identity.id,
      expires_at: expiresAt?.toISOString() || null,
      max_uses: maxUses || null,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Generate full URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const inviteUrl = `${baseUrl}/join/${token}`

  revalidatePath(`/teacher/activities/${activityId}`)

  return {
    success: true,
    invitation,
    url: inviteUrl,
  }
}

/**
 * List all invitations for an activity
 */
export async function listActivityInvitations(activityId: string) {
  const supabase = await createClient()
  const identity = await getCurrentIdentity()

  if (!identity || identity.role !== 'teacher') {
    return { error: 'Unauthorized' }
  }

  // Verify teacher owns the activity
  const { data: activity } = await supabase
    .from('activities')
    .select(
      `
      id,
      courses!inner (
        teacher_id
      )
    `
    )
    .eq('id', activityId)
    .single()

  if (!activity || (activity.courses as any).teacher_id !== identity.id) {
    return { error: 'Unauthorized' }
  }

  const { data, error } = await supabase
    .from('activity_invitations')
    .select('*')
    .eq('activity_id', activityId)
    .order('created_at', { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { data }
}

/**
 * Revoke (deactivate) an invitation
 */
export async function revokeInvitation(invitationId: string) {
  const supabase = await createClient()
  const identity = await getCurrentIdentity()

  if (!identity || identity.role !== 'teacher') {
    return { error: 'Unauthorized' }
  }

  // Verify teacher owns the invitation's activity
  const { data: invitation } = await supabase
    .from('activity_invitations')
    .select(
      `
      id,
      activity_id,
      activities!inner (
        id,
        courses!inner (
          teacher_id
        )
      )
    `
    )
    .eq('id', invitationId)
    .single()

  if (
    !invitation ||
    ((invitation.activities as any).courses as any).teacher_id !== identity.id
  ) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('activity_invitations')
    .update({ is_active: false })
    .eq('id', invitationId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/teacher/activities/${invitation.activity_id}`)

  return { success: true }
}

/**
 * List all student sessions for an activity (for teacher monitoring)
 */
export async function listActivitySessions(activityId: string) {
  const supabase = await createClient()
  const identity = await getCurrentIdentity()

  if (!identity || identity.role !== 'teacher') {
    return { error: 'Unauthorized' }
  }

  // Verify teacher owns the activity
  const { data: activity } = await supabase
    .from('activities')
    .select(
      `
      id,
      courses!inner (
        teacher_id
      )
    `
    )
    .eq('id', activityId)
    .single()

  if (!activity || (activity.courses as any).teacher_id !== identity.id) {
    return { error: 'Unauthorized' }
  }

  const { data, error } = await supabase
    .from('student_sessions')
    .select('*')
    .eq('activity_id', activityId)
    .order('created_at', { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { data }
}

/**
 * Revoke a student session (kick student out)
 */
export async function revokeStudentSession(sessionId: string) {
  const supabase = await createClient()
  const identity = await getCurrentIdentity()

  if (!identity || identity.role !== 'teacher') {
    return { error: 'Unauthorized' }
  }

  // Verify teacher owns the session's activity
  const { data: session } = await supabase
    .from('student_sessions')
    .select(
      `
      id,
      activity_id,
      activities!inner (
        id,
        courses!inner (
          teacher_id
        )
      )
    `
    )
    .eq('id', sessionId)
    .single()

  if (
    !session ||
    ((session.activities as any).courses as any).teacher_id !== identity.id
  ) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('student_sessions')
    .delete()
    .eq('id', sessionId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/teacher/activities/${session.activity_id}`)

  return { success: true }
}
