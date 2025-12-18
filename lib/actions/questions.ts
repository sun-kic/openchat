'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from './auth'
import { revalidatePath } from 'next/cache'
import { QuestionInsert, QuestionChoices } from '@/types'

export async function createQuestion(
  courseId: string,
  title: string,
  prompt: string,
  context: string | null,
  conceptTags: string[],
  choices: QuestionChoices
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

  // Validate that exactly one choice is correct
  const correctChoices = Object.values(choices).filter(c => c.correct).length
  if (correctChoices !== 1) {
    return { error: 'Exactly one choice must be marked as correct' }
  }

  const question: QuestionInsert = {
    course_id: courseId,
    title,
    prompt,
    context: context || null,
    concept_tags: conceptTags,
    choices,
  }

  const { data, error } = await supabase
    .from('questions')
    .insert(question)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/teacher/courses/${courseId}/questions`)
  return { success: true, data }
}

export async function getQuestionsByCourse(courseId: string) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: 'Not authenticated' }
  }

  // Verify access (teacher of course or enrolled student)
  const { data: course } = await supabase
    .from('courses')
    .select('teacher_id')
    .eq('id', courseId)
    .single()

  if (!course) {
    return { error: 'Course not found' }
  }

  const isTeacher = course.teacher_id === profile.id

  // Check if student is enrolled
  if (!isTeacher && profile.role === 'student') {
    const { data: enrollment } = await supabase
      .from('course_members')
      .select('*')
      .eq('course_id', courseId)
      .eq('user_id', profile.id)
      .single()

    if (!enrollment) {
      return { error: 'Unauthorized' }
    }
  }

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { data }
}

export async function getQuestionById(questionId: string) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('questions')
    .select(`
      *,
      courses (
        teacher_id
      )
    `)
    .eq('id', questionId)
    .single()

  if (error) {
    return { error: error.message }
  }

  // Verify access
  const isTeacher = data.courses?.teacher_id === profile.id

  if (!isTeacher && profile.role === 'student') {
    const { data: enrollment } = await supabase
      .from('course_members')
      .select('*')
      .eq('course_id', data.course_id)
      .eq('user_id', profile.id)
      .single()

    if (!enrollment) {
      return { error: 'Unauthorized' }
    }
  }

  return { data }
}

export async function updateQuestion(
  questionId: string,
  title: string,
  prompt: string,
  context: string | null,
  conceptTags: string[],
  choices: QuestionChoices
) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: 'Not authenticated' }
  }

  // Get question and verify ownership
  const { data: question } = await supabase
    .from('questions')
    .select(`
      *,
      courses (
        teacher_id
      )
    `)
    .eq('id', questionId)
    .single()

  if (!question || question.courses?.teacher_id !== profile.id) {
    return { error: 'Unauthorized' }
  }

  // Validate choices
  const correctChoices = Object.values(choices).filter(c => c.correct).length
  if (correctChoices !== 1) {
    return { error: 'Exactly one choice must be marked as correct' }
  }

  const { error } = await supabase
    .from('questions')
    .update({
      title,
      prompt,
      context: context || null,
      concept_tags: conceptTags,
      choices,
    })
    .eq('id', questionId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/teacher/courses/${question.course_id}/questions`)
  return { success: true }
}

export async function deleteQuestion(questionId: string) {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile) {
    return { error: 'Not authenticated' }
  }

  // Get question and verify ownership
  const { data: question } = await supabase
    .from('questions')
    .select(`
      course_id,
      courses (
        teacher_id
      )
    `)
    .eq('id', questionId)
    .single()

  if (!question || question.courses?.teacher_id !== profile.id) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase.from('questions').delete().eq('id', questionId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/teacher/courses/${question.course_id}/questions`)
  return { success: true }
}
