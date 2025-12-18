'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from './auth'
import { revalidatePath } from 'next/cache'
import { CourseInsert, CourseMemberInsert } from '@/types'

function generateInvitationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function createCourse(title: string, description?: string) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile || (profile.role !== 'teacher' && profile.role !== 'ta')) {
    return { error: 'Unauthorized' }
  }

  // Generate unique invitation code
  let invitationCode = generateInvitationCode()
  let isUnique = false

  while (!isUnique) {
    const { data } = await supabase
      .from('courses')
      .select('id')
      .eq('invitation_code', invitationCode)
      .single()

    if (!data) {
      isUnique = true
    } else {
      invitationCode = generateInvitationCode()
    }
  }

  const course: CourseInsert = {
    teacher_id: profile.id,
    title,
    description: description || null,
    invitation_code: invitationCode,
  }

  const { data, error } = await supabase
    .from('courses')
    .insert(course)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/teacher')
  return { success: true, data }
}

export async function getCoursesByTeacher() {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      course_members (
        user_id
      )
    `)
    .eq('teacher_id', profile.id)
    .order('created_at', { ascending: false })

  if (error) {
    return { error: error.message }
  }

  // Add member count to each course
  const coursesWithCount = data.map(course => ({
    ...course,
    member_count: course.course_members?.length || 0,
  }))

  return { data: coursesWithCount }
}

export async function getCourseById(courseId: string) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      course_members (
        user_id,
        joined_at,
        profiles (
          id,
          display_name,
          role,
          student_number
        )
      )
    `)
    .eq('id', courseId)
    .single()

  if (error) {
    return { error: error.message }
  }

  // Check if user has access (teacher or enrolled student)
  const isTeacher = data.teacher_id === profile.id
  const isEnrolled = data.course_members?.some(
    (member: any) => member.user_id === profile.id
  )

  if (!isTeacher && !isEnrolled) {
    return { error: 'Unauthorized' }
  }

  return { data }
}

export async function updateCourse(
  courseId: string,
  title: string,
  description?: string
) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: 'Not authenticated' }
  }

  // Verify ownership
  const { data: course } = await supabase
    .from('courses')
    .select('teacher_id')
    .eq('id', courseId)
    .single()

  if (!course || course.teacher_id !== profile.id) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('courses')
    .update({
      title,
      description: description || null,
    })
    .eq('id', courseId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/teacher')
  revalidatePath(`/teacher/courses/${courseId}`)
  return { success: true }
}

export async function deleteCourse(courseId: string) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: 'Not authenticated' }
  }

  // Verify ownership
  const { data: course } = await supabase
    .from('courses')
    .select('teacher_id')
    .eq('id', courseId)
    .single()

  if (!course || course.teacher_id !== profile.id) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase.from('courses').delete().eq('id', courseId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/teacher')
  return { success: true }
}

export async function joinCourseByCode(invitationCode: string) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: 'Not authenticated' }
  }

  if (profile.role !== 'student') {
    return { error: 'Only students can join courses' }
  }

  // Find course by invitation code
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('invitation_code', invitationCode.toUpperCase())
    .single()

  if (courseError || !course) {
    return { error: 'Invalid invitation code' }
  }

  // Check if already enrolled
  const { data: existing } = await supabase
    .from('course_members')
    .select('*')
    .eq('course_id', course.id)
    .eq('user_id', profile.id)
    .single()

  if (existing) {
    return { error: 'Already enrolled in this course' }
  }

  // Enroll student
  const member: CourseMemberInsert = {
    course_id: course.id,
    user_id: profile.id,
  }

  const { error } = await supabase.from('course_members').insert(member)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/student')
  return { success: true, courseId: course.id }
}

export async function removeMemberFromCourse(
  courseId: string,
  userId: string
) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: 'Not authenticated' }
  }

  // Verify ownership
  const { data: course } = await supabase
    .from('courses')
    .select('teacher_id')
    .eq('id', courseId)
    .single()

  if (!course || course.teacher_id !== profile.id) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('course_members')
    .delete()
    .eq('course_id', courseId)
    .eq('user_id', userId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/teacher/courses/${courseId}`)
  return { success: true }
}
