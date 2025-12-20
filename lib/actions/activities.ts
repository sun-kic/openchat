'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
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

  if (!course || (course as { teacher_id: string }).teacher_id !== profile.id) {
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
    console.log('[getActivitiesByCourse] No profile found')
    return { error: 'Not authenticated' }
  }

  console.log('[getActivitiesByCourse] Profile:', profile.id, profile.role)
  console.log('[getActivitiesByCourse] Fetching activities for course:', courseId)

  // Query activities without groups to avoid RLS recursion issue
  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      activity_questions (
        question_id
      )
    `)
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })

  console.log('[getActivitiesByCourse] Result:', { data, error })

  if (error) {
    console.log('[getActivitiesByCourse] Error:', error)
    return { error: error.message }
  }

  // Add counts (group_count fetched separately to avoid RLS recursion)
  const activitiesWithCounts = await Promise.all(
    data.map(async (activity) => {
      // Get group count separately
      const { count } = await supabase
        .from('groups')
        .select('*', { count: 'exact', head: true })
        .eq('activity_id', activity.id)

      return {
        ...activity,
        question_count: activity.activity_questions?.length || 0,
        group_count: count || 0,
      }
    })
  )

  return { data: activitiesWithCounts }
}

export async function getActivityById(activityId: string) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: 'Not authenticated' }
  }

  // First, get activity without groups to avoid RLS recursion
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
          prompt,
          choices,
          context,
          concept_tags
        )
      )
    `)
    .eq('id', activityId)
    .single()

  if (error) {
    return { error: error.message }
  }

  // Check access first
  const isTeacher = data.courses?.teacher_id === profile.id

  // Fetch groups separately to avoid RLS recursion
  let groups: any[] = []
  if (isTeacher || profile.role === 'admin' || profile.role === 'ta') {
    // Teachers can see all groups - use service client to bypass RLS
    const serviceSupabase = createServiceClient()
    const { data: groupsData } = await serviceSupabase
      .from('groups')
      .select('id, name, leader_user_id')
      .eq('activity_id', activityId)

    if (groupsData) {
      // Fetch group members separately for each group
      groups = await Promise.all(
        groupsData.map(async (group) => {
          // Fetch permanent members from group_members
          const { data: members } = await serviceSupabase
            .from('group_members')
            .select(`
              user_id,
              seat_no,
              profiles (
                id,
                display_name,
                student_number
              )
            `)
            .eq('group_id', group.id)

          // Fetch temporary students from student_sessions
          const { data: tempMembers } = await serviceSupabase
            .from('student_sessions')
            .select('id, display_name, student_number')
            .eq('group_id', group.id)
            .gt('expires_at', new Date().toISOString())

          return {
            ...group,
            group_members: members || [],
            temp_members: tempMembers || []
          }
        })
      )
    }
  }

  // Attach groups to data
  const activityWithGroups = {
    ...data,
    groups
  }

  if (!isTeacher && profile.role === 'student') {
    // Check if student is in a group for this activity
    const isInGroup = groups?.some((group: any) =>
      group.group_members?.some((member: any) => member.user_id === profile.id)
    )

    if (!isInGroup) {
      return { error: 'Unauthorized' }
    }
  }

  return { data: activityWithGroups }
}

/**
 * Get activity by ID for temporary students (using service client to bypass RLS)
 * This is used when a student joins via invitation link without a permanent account
 */
export async function getActivityForTemporaryStudent(activityId: string, sessionId: string) {
  const supabase = createServiceClient()

  // Verify the session exists and is valid for this activity
  const { data: session, error: sessionError } = await supabase
    .from('student_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('activity_id', activityId)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (sessionError || !session) {
    return { error: 'Invalid session' }
  }

  // Get activity data
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
          prompt,
          choices,
          context,
          concept_tags
        )
      )
    `)
    .eq('id', activityId)
    .single()

  if (error) {
    return { error: error.message }
  }

  // Get the student's group if assigned
  let groups: any[] = []
  if (session.group_id) {
    const { data: groupData } = await supabase
      .from('groups')
      .select('id, name, leader_user_id')
      .eq('id', session.group_id)
      .single()

    if (groupData) {
      // Fetch group members
      const { data: members } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupData.id)

      // For temporary students, also fetch other temporary student sessions in the same group
      const { data: tempMembers } = await supabase
        .from('student_sessions')
        .select('id, display_name, student_number, group_id')
        .eq('group_id', groupData.id)
        .gt('expires_at', new Date().toISOString())

      groups = [{
        ...groupData,
        group_members: members || [],
        temp_members: tempMembers || []
      }]
    }
  }

  return {
    data: {
      ...data,
      groups
    }
  }
}

export async function startActivity(activityId: string) {
  const supabase = await createClient()
  const serviceSupabase = createServiceClient()
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

  // Auto-assign temporary students to groups before starting
  await autoAssignTemporaryStudentsToGroups(activityId)

  // Update status
  const { error } = await serviceSupabase
    .from('activities')
    .update({ status: 'running' })
    .eq('id', activityId)

  if (error) {
    return { error: error.message }
  }

  // Create first round for first question
  const { data: firstQuestion } = await serviceSupabase
    .from('activity_questions')
    .select('question_id')
    .eq('activity_id', activityId)
    .eq('order_index', 0)
    .single()

  if (firstQuestion) {
    await serviceSupabase.from('rounds').insert({
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

/**
 * Auto-assign temporary students to groups randomly (4 per group)
 */
async function autoAssignTemporaryStudentsToGroups(activityId: string) {
  const supabase = createServiceClient()

  // Get all unassigned temporary students for this activity
  const { data: unassignedStudents, error: fetchError } = await supabase
    .from('student_sessions')
    .select('id, display_name, student_number')
    .eq('activity_id', activityId)
    .is('group_id', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true })

  if (fetchError || !unassignedStudents || unassignedStudents.length === 0) {
    console.log('[autoAssignTemporaryStudentsToGroups] No unassigned students found')
    return
  }

  console.log(`[autoAssignTemporaryStudentsToGroups] Found ${unassignedStudents.length} unassigned students`)

  // Shuffle students randomly
  const shuffledStudents = [...unassignedStudents].sort(() => Math.random() - 0.5)

  // Get existing groups count to name new groups properly
  const { count: existingGroupCount } = await supabase
    .from('groups')
    .select('*', { count: 'exact', head: true })
    .eq('activity_id', activityId)

  const groupSize = 4
  const numGroups = Math.ceil(shuffledStudents.length / groupSize)
  let groupStartIndex = (existingGroupCount || 0) + 1

  for (let i = 0; i < numGroups; i++) {
    const groupStudents = shuffledStudents.slice(i * groupSize, (i + 1) * groupSize)

    // Create a new group
    const { data: newGroup, error: groupError } = await supabase
      .from('groups')
      .insert({
        activity_id: activityId,
        name: `Group ${groupStartIndex + i}`,
        leader_user_id: null, // Will be set to first student's session ID
      })
      .select()
      .single()

    if (groupError || !newGroup) {
      console.error('[autoAssignTemporaryStudentsToGroups] Failed to create group:', groupError)
      continue
    }

    // Update group leader to first student in group
    await supabase
      .from('groups')
      .update({ leader_user_id: groupStudents[0].id })
      .eq('id', newGroup.id)

    // Assign students to this group
    for (const student of groupStudents) {
      await supabase
        .from('student_sessions')
        .update({ group_id: newGroup.id })
        .eq('id', student.id)
    }

    console.log(`[autoAssignTemporaryStudentsToGroups] Created ${newGroup.name} with ${groupStudents.length} students`)
  }
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
