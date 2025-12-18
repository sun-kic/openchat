'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from './auth'
import { revalidatePath } from 'next/cache'
import { ActivityInsert, ActivityQuestionInsert } from '@/types'

export async function createActivity(
  courseId: string,
  title: string,
  description: string | null,
  questionIds: string[]
) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile || (profile.role !== 'teacher' && profile.role !== 'ta')) {
    return { error: 'Unauthorized' }
  }

  // Verify course ownership
  const { data: course } = await supabase
    .from('courses')
    .select('teacher_id')
    .eq('id', courseId)
    .single()

  if (!course || course.teacher_id !== profile.id) {
    return { error: 'Unauthorized' }
  }

  if (questionIds.length === 0) {
    return { error: 'At least one question is required' }
  }

  // Create activity
  const activity: ActivityInsert = {
    course_id: courseId,
    title,
    description: description || null,
    status: 'draft',
    current_question_index: 0,
  }

  const { data: activityData, error: activityError } = await supabase
    .from('activities')
    .insert(activity)
    .select()
    .single()

  if (activityError) {
    return { error: activityError.message }
  }

  // Link questions to activity
  const activityQuestions: ActivityQuestionInsert[] = questionIds.map(
    (questionId, index) => ({
      activity_id: activityData.id,
      question_id: questionId,
      order_index: index,
    })
  )

  const { error: questionsError } = await supabase
    .from('activity_questions')
    .insert(activityQuestions)

  if (questionsError) {
    // Rollback - delete activity
    await supabase.from('activities').delete().eq('id', activityData.id)
    return { error: questionsError.message }
  }

  // Auto-group students
  const { error: groupError } = await supabase.rpc('auto_group_students', {
    p_activity_id: activityData.id,
  })

  if (groupError) {
    console.error('Auto-grouping error:', groupError)
    // Don't fail the whole operation, grouping can be done later
  }

  revalidatePath(`/teacher/courses/${courseId}`)
  return { success: true, data: activityData }
}

export async function getActivitiesByCourse(courseId: string) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      activity_questions (
        question_id
      ),
      groups (
        id
      )
    `)
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })

  if (error) {
    return { error: error.message }
  }

  // Add counts
  const activitiesWithCounts = data.map((activity) => ({
    ...activity,
    question_count: activity.activity_questions?.length || 0,
    group_count: activity.groups?.length || 0,
  }))

  return { data: activitiesWithCounts }
}

export async function getActivityById(activityId: string) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      courses (
        id,
        title,
        teacher_id
      ),
      activity_questions (
        order_index,
        questions (
          id,
          title,
          prompt
        )
      ),
      groups (
        id,
        name,
        leader_user_id,
        group_members (
          user_id,
          seat_no,
          profiles (
            id,
            display_name,
            student_number
          )
        )
      )
    `)
    .eq('id', activityId)
    .single()

  if (error) {
    return { error: error.message }
  }

  // Check access
  const isTeacher = data.courses?.teacher_id === profile.id

  if (!isTeacher && profile.role === 'student') {
    // Check if student is in a group for this activity
    const isInGroup = data.groups?.some((group: any) =>
      group.group_members?.some((member: any) => member.user_id === profile.id)
    )

    if (!isInGroup) {
      return { error: 'Unauthorized' }
    }
  }

  return { data }
}

export async function startActivity(activityId: string) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: 'Not authenticated' }
  }

  // Verify ownership
  const { data: activity } = await supabase
    .from('activities')
    .select(`
      *,
      courses (
        teacher_id
      )
    `)
    .eq('id', activityId)
    .single()

  if (!activity || activity.courses?.teacher_id !== profile.id) {
    return { error: 'Unauthorized' }
  }

  if (activity.status === 'running') {
    return { error: 'Activity is already running' }
  }

  // Update status
  const { error } = await supabase
    .from('activities')
    .update({ status: 'running' })
    .eq('id', activityId)

  if (error) {
    return { error: error.message }
  }

  // Create first round for first question
  const { data: firstQuestion } = await supabase
    .from('activity_questions')
    .select('question_id')
    .eq('activity_id', activityId)
    .eq('order_index', 0)
    .single()

  if (firstQuestion) {
    await supabase.from('rounds').insert({
      activity_id: activityId,
      question_id: firstQuestion.question_id,
      round_no: 1,
      status: 'open',
      rules: { min_len: 20, required_elements: [] },
    })
  }

  revalidatePath(`/teacher/activities/${activityId}`)
  return { success: true }
}

export async function endActivity(activityId: string) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: 'Not authenticated' }
  }

  // Verify ownership
  const { data: activity } = await supabase
    .from('activities')
    .select(`
      courses (
        teacher_id
      )
    `)
    .eq('id', activityId)
    .single()

  if (!activity || activity.courses?.teacher_id !== profile.id) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('activities')
    .update({ status: 'ended' })
    .eq('id', activityId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/teacher/activities/${activityId}`)
  return { success: true }
}

export async function deleteActivity(activityId: string) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: 'Not authenticated' }
  }

  // Verify ownership
  const { data: activity } = await supabase
    .from('activities')
    .select(`
      course_id,
      courses (
        teacher_id
      )
    `)
    .eq('id', activityId)
    .single()

  if (!activity || activity.courses?.teacher_id !== profile.id) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', activityId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/teacher/courses/${activity.course_id}`)
  return { success: true }
}
