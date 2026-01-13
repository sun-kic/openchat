'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
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
  const identity = await getCurrentIdentity()

  console.log('[submitMessage] Identity:', identity ? {
    id: identity.id,
    role: identity.role,
    session_type: identity.session_type,
    activity_id: identity.activity_id,
    group_id: identity.group_id
  } : 'null')
  console.log('[submitMessage] Requested groupId:', groupId)

  if (!identity || identity.role !== 'student') {
    console.log('[submitMessage] Unauthorized - identity:', identity)
    return { error: 'Unauthorized' }
  }

  // Use service client for temporary students (they don't have Supabase auth)
  // Use regular client for permanent students (RLS will apply)
  const supabase = identity.session_type === 'temporary'
    ? createServiceClient()
    : await createClient()

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
  console.log('[submitMessage] Fetching round:', roundId)
  const { data: round, error: roundError } = await supabase
    .from('rounds')
    .select('*, questions(concept_tags)')
    .eq('id', roundId)
    .single()

  console.log('[submitMessage] Round result:', { round: round?.id, status: round?.status, error: roundError })

  if (!round || round.status !== 'open') {
    console.log('[submitMessage] Round not open:', { round, roundError })
    return { error: 'This round is not open for submissions' }
  }

  // Validate content
  const minLen = (round.rules as any)?.min_len || 20
  const conceptTags = (round.questions as any)?.concept_tags || []
  console.log('[submitMessage] Validating content:', { contentLength: content.length, minLen, conceptTags })
  const validation = validateMessageContent(content, minLen, conceptTags)

  console.log('[submitMessage] Validation result:', validation)

  if (!validation.valid) {
    console.log('[submitMessage] Validation failed:', validation.error)
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

  console.log('[submitMessage] Inserting message:', message)
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single()

  console.log('[submitMessage] Insert result:', { data: data?.id, error })

  if (error) {
    console.log('[submitMessage] Insert error:', error)
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
  const identity = await getCurrentIdentity()

  if (!identity) {
    return { error: 'Not authenticated' }
  }

  // Use service client to bypass RLS for message fetching
  // Authorization is checked via identity above
  const supabase = createServiceClient()

  // Verify user has access to this group
  if (identity.session_type === 'temporary') {
    // Temporary students must be assigned to this group
    if (identity.group_id !== groupId) {
      return { error: 'Not authorized to view this group' }
    }
  } else if (identity.role === 'student') {
    // Permanent students must be members of this group
    const { data: membership } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', identity.id)
      .single()

    if (!membership) {
      return { error: 'Not authorized to view this group' }
    }
  }
  // Teachers/TAs/Admins can view any group

  // Fetch messages without profile join
  const { data: messagesData, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .eq('group_id', groupId)
    .eq('round_id', roundId)
    .order('created_at', { ascending: true })

  if (messagesError) {
    return { error: messagesError.message }
  }

  if (!messagesData || messagesData.length === 0) {
    return { data: [] }
  }

  // Get unique user IDs from messages
  const userIds = [...new Set(messagesData.map(m => m.user_id))]

  // Fetch profiles for these user IDs (permanent users)
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, display_name, student_number')
    .in('id', userIds)

  // Fetch student sessions for these user IDs (temporary students)
  const { data: sessionsData } = await supabase
    .from('student_sessions')
    .select('id, display_name, student_number')
    .in('id', userIds)

  // Create a lookup map for user info
  const userMap = new Map<string, { id: string; display_name: string; student_number: string | null }>()

  profilesData?.forEach(p => {
    userMap.set(p.id, { id: p.id, display_name: p.display_name, student_number: p.student_number })
  })

  sessionsData?.forEach(s => {
    userMap.set(s.id, { id: s.id, display_name: s.display_name, student_number: s.student_number })
  })

  // Map messages with user info
  const messagesWithProfiles = messagesData.map(msg => ({
    ...msg,
    profiles: userMap.get(msg.user_id) || { id: msg.user_id, display_name: 'Unknown', student_number: null },
    parent_message: null // TODO: Handle reply_to if needed
  }))

  return { data: messagesWithProfiles }
}

export async function getCurrentRound(activityId: string, questionId: string) {
  const identity = await getCurrentIdentity()

  if (!identity) {
    return { data: null }
  }

  // Use service client for temporary students to bypass RLS
  const supabase = identity.session_type === 'temporary'
    ? createServiceClient()
    : await createClient()

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
    console.log('[getCurrentRound] Error:', error)
    return { data: null }
  }

  return { data }
}
