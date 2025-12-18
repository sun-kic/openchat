'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from './auth'
import { revalidatePath } from 'next/cache'
import { MessageInsert, MessageMeta, SubmissionInsert } from '@/types'

// Validation helper
export function validateMessageContent(
  content: string,
  minLength: number = 20,
  conceptTags: string[] = []
): { valid: boolean; error?: string; meta: MessageMeta } {
  const len = content.trim().length

  if (len < minLength) {
    return {
      valid: false,
      error: `Message must be at least ${minLength} characters (currently ${len})`,
      meta: { len },
    }
  }

  // Check for keywords from concept tags
  const keywordHits = conceptTags.filter((tag) =>
    content.toLowerCase().includes(tag.toLowerCase())
  )

  // Check for causality patterns
  const causalityPatterns = [
    /if\s+.+\s+then/i,
    /because/i,
    /therefore/i,
    /thus/i,
    /hence/i,
    /so\s+/i,
    /as a result/i,
  ]
  const hasCausality = causalityPatterns.some((pattern) => pattern.test(content))

  // Check for example patterns
  const examplePatterns = [
    /for example/i,
    /such as/i,
    /e\.g\./i,
    /like\s+/i,
    /for instance/i,
    /example:/i,
    /case:/i,
  ]
  const hasExample = examplePatterns.some((pattern) => pattern.test(content))

  // Check for boundary/edge case patterns
  const boundaryPatterns = [
    /edge case/i,
    /boundary/i,
    /empty/i,
    /null/i,
    /undefined/i,
    /zero/i,
    /negative/i,
  ]
  const hasBoundary = boundaryPatterns.some((pattern) => pattern.test(content))

  const meta: MessageMeta = {
    len,
    keyword_hits: keywordHits,
    has_causality: hasCausality,
    has_example: hasExample,
    has_boundary: hasBoundary,
    has_if_then: /if\s+.+\s+then/i.test(content),
  }

  return { valid: true, meta }
}

export async function submitMessage(
  activityId: string,
  questionId: string,
  groupId: string,
  roundId: string,
  content: string,
  replyToMessageId?: string
) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile || profile.role !== 'student') {
    return { error: 'Unauthorized' }
  }

  // Verify student is in the group
  const { data: membership } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', profile.id)
    .single()

  if (!membership) {
    return { error: 'You are not a member of this group' }
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
    user_id: profile.id,
    content: content.trim(),
    meta: validation.meta,
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
  const profile = await getCurrentProfile()

  if (!profile || profile.role !== 'student') {
    return { error: 'Unauthorized' }
  }

  // Verify membership
  const { data: membership } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', profile.id)
    .single()

  if (!membership) {
    return { error: 'Unauthorized' }
  }

  const submission: SubmissionInsert = {
    activity_id: activityId,
    question_id: questionId,
    group_id: groupId,
    user_id: profile.id,
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
  const profile = await getCurrentProfile()

  if (!profile || profile.role !== 'student') {
    return { error: 'Unauthorized' }
  }

  // Verify user is the group leader
  const { data: group } = await supabase
    .from('groups')
    .select('leader_user_id')
    .eq('id', groupId)
    .single()

  if (!group || group.leader_user_id !== profile.id) {
    return { error: 'Only the group leader can submit the final choice' }
  }

  // Update the group with final choice
  const { error: groupError } = await supabase
    .from('groups')
    .update({
      final_choice: choice,
      final_rationale: rationale.trim(),
      final_submitted_at: new Date().toISOString(),
      final_submitted_by: profile.id,
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
    user_id: profile.id,
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
  const profile = await getCurrentProfile()

  if (!profile) {
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
