'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile, getCurrentIdentity } from './auth'
import { revalidatePath } from 'next/cache'
import { MessageInsert, SubmissionInsert } from '@/types'
import { Json } from '@/types/database.generated'
import { validateMessageContent } from '@/lib/utils/validation'

export async function submitMessage(
  activityId: string,
  questionId: string,
  groupId: string,
  roundId: string,
  content: string,
  replyToMessageId?: string
) {
  const supabase = await createClient()
  const identity = await getCurrentIdentity()

  if (!identity || identity.role !== 'student') {
    return { error: 'Unauthorized' }
  }

  // For temporary students, verify activity and group match
  if (identity.session_type === 'temporary') {
    if (identity.activity_id !== activityId) {
      return { error: 'Activity mismatch - you can only access your assigned activity' }
    }
    if (identity.group_id !== groupId) {
      return { error: 'You are not assigned to this group' }
    }
  } else {
    // For permanent students, verify group membership
    const { data: membership } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', identity.id)
      .single()

    if (!membership) {
      return { error: 'You are not a member of this group' }
    }
  }

  // Get round rules
  const { data: round } = await supabase
    .from('rounds')
    .select('*, questions(concept_tags)')
    .eq('id', roundId)
    .single()

  if (!round || round.status !== 'open') {
    return { error: 'This round is not open for submissions' }
  }

  // Validate content
  const minLen = (round.rules as any)?.min_len || 20
  const conceptTags = (round.questions as any)?.concept_tags || []
  const validation = validateMessageContent(content, minLen, conceptTags)

  if (!validation.valid) {
    return { error: validation.error }
  }

  // Insert message
  const message: MessageInsert = {
    activity_id: activityId,
    question_id: questionId,
    group_id: groupId,
    round_id: roundId,
    user_id: identity.id, // Works for both permanent and temporary users
    content: content.trim(),
    meta: validation.meta as Json,
    reply_to: replyToMessageId || null,
  }

  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/student/activities/${activityId}`)
  return { success: true, data }
}

export async function submitIndividualChoice(
  activityId: string,
  questionId: string,
  groupId: string,
  choice: 'A' | 'B' | 'C' | 'D',
  rationale: string
) {
  const supabase = await createClient()
  const identity = await getCurrentIdentity()

  if (!identity || identity.role !== 'student') {
    return { error: 'Unauthorized' }
  }

  // For temporary students, verify activity and group match
  if (identity.session_type === 'temporary') {
    if (identity.activity_id !== activityId) {
      return { error: 'Activity mismatch' }
    }
    if (identity.group_id !== groupId) {
      return { error: 'You are not assigned to this group' }
    }
  } else {
    // For permanent students, verify membership
    const { data: membership } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', identity.id)
      .single()

    if (!membership) {
      return { error: 'Unauthorized' }
    }
  }

  const submission: SubmissionInsert = {
    activity_id: activityId,
    question_id: questionId,
    group_id: groupId,
    user_id: identity.id,
    type: 'individual_choice',
    choice,
    rationale: rationale.trim() || null,
  }

  const { data, error } = await supabase
    .from('submissions')
    .upsert(submission, {
      onConflict: 'activity_id,question_id,group_id,user_id,type',
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  return { success: true, data }
}

export async function submitFinalChoice(
  activityId: string,
  questionId: string,
  groupId: string,
  choice: 'A' | 'B' | 'C' | 'D',
  rationale: string
) {
  const supabase = await createClient()
  const identity = await getCurrentIdentity()

  if (!identity || identity.role !== 'student') {
    return { error: 'Unauthorized' }
  }

  // For temporary students, verify activity and group match
  if (identity.session_type === 'temporary') {
    if (identity.activity_id !== activityId) {
      return { error: 'Activity mismatch' }
    }
    if (identity.group_id !== groupId) {
      return { error: 'You are not assigned to this group' }
    }
  }

  // Verify user is the group leader
  const { data: group } = await supabase
    .from('groups')
    .select('leader_user_id')
    .eq('id', groupId)
    .single()

  if (!group || group.leader_user_id !== identity.id) {
    return { error: 'Only the group leader can submit the final choice' }
  }

  // Update the group with final choice
  const { error: groupError } = await supabase
    .from('groups')
    .update({
      final_choice: choice,
      final_rationale: rationale.trim(),
      final_submitted_at: new Date().toISOString(),
      final_submitted_by: identity.id,
    })
    .eq('id', groupId)

  if (groupError) {
    return { error: groupError.message }
  }

  // Also create a submission record for tracking
  const submission: SubmissionInsert = {
    activity_id: activityId,
    question_id: questionId,
    group_id: groupId,
    user_id: identity.id,
    type: 'final_choice',
    choice,
    rationale: rationale.trim() || null,
  }

  const { data, error } = await supabase
    .from('submissions')
    .upsert(submission, {
      onConflict: 'activity_id,question_id,group_id,user_id,type',
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/student/activities/${activityId}`)
  return { success: true, data }
}

export async function getGroupMessages(groupId: string, roundId: string) {
  const supabase = await createClient()
  const identity = await getCurrentIdentity()

  if (!identity) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      profiles!messages_user_id_fkey (
        id,
        display_name,
        student_number
      ),
      parent_message:messages!messages_reply_to_fkey (
        id,
        content,
        profiles!messages_user_id_fkey (
          display_name
        )
      )
    `)
    .eq('group_id', groupId)
    .eq('round_id', roundId)
    .order('created_at', { ascending: true })

  if (error) {
    return { error: error.message }
  }

  return { data }
}

export async function getCurrentRound(activityId: string, questionId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('activity_id', activityId)
    .eq('question_id', questionId)
    .eq('status', 'open')
    .order('round_no', { ascending: true })
    .limit(1)
    .single()

  if (error) {
    return { data: null }
  }

  return { data }
}
