'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from './auth'
import { revalidatePath } from 'next/cache'

export async function startRound(
  activityId: string,
  questionId: string,
  roundNo: number
) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile || profile.role !== 'teacher') {
    return { error: 'Unauthorized' }
  }

  // Verify teacher owns the activity
  const { data: activity } = await supabase
    .from('activities')
    .select('course_id, courses!inner(teacher_id)')
    .eq('id', activityId)
    .single()

  if (!activity || (activity.courses as any).teacher_id !== profile.id) {
    return { error: 'Unauthorized' }
  }

  // Close any open rounds for this activity/question
  await supabase
    .from('rounds')
    .update({ status: 'closed', completed_at: new Date().toISOString() })
    .eq('activity_id', activityId)
    .eq('question_id', questionId)
    .eq('status', 'open')

  // Create the new round
  const rules = {
    min_len: roundNo === 1 ? 20 : roundNo === 2 ? 20 : 15,
    require_reply: roundNo === 3,
  }

  const { data, error } = await supabase
    .from('rounds')
    .insert({
      activity_id: activityId,
      question_id: questionId,
      round_no: roundNo,
      status: 'open',
      rules,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/teacher/activities/${activityId}`)
  return { success: true, data }
}

export async function endRound(roundId: string) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile || profile.role !== 'teacher') {
    return { error: 'Unauthorized' }
  }

  // Get round info
  const { data: round } = await supabase
    .from('rounds')
    .select('activity_id, activities!inner(course_id, courses!inner(teacher_id))')
    .eq('id', roundId)
    .single()

  if (!round) {
    return { error: 'Round not found' }
  }

  const activity = round.activities as any
  const course = activity.courses as any

  if (course.teacher_id !== profile.id) {
    return { error: 'Unauthorized' }
  }

  // Close the round
  const { error } = await supabase
    .from('rounds')
    .update({ status: 'closed', completed_at: new Date().toISOString() })
    .eq('id', roundId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/teacher/activities/${round.activity_id}`)
  return { success: true }
}

export async function getRoundsByActivity(activityId: string, questionId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('activity_id', activityId)
    .eq('question_id', questionId)
    .order('round_no', { ascending: true })

  if (error) {
    return { error: error.message }
  }

  return { data }
}

export async function getActiveRound(activityId: string, questionId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('activity_id', activityId)
    .eq('question_id', questionId)
    .eq('status', 'open')
    .single()

  if (error) {
    return { data: null }
  }

  return { data }
}
