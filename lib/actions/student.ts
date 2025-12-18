'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from './auth'

export async function getEnrolledCourses() {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  if (!profile || profile.role !== 'student') {
    return { error: 'Unauthorized' }
  }

  const { data, error } = await supabase
    .from('course_members')
    .select(`
      course_id,
      joined_at,
      courses (
        id,
        title,
        description,
        invitation_code,
        created_at,
        profiles!courses_teacher_id_fkey (
          display_name
        )
      )
    `)
    .eq('user_id', profile.id)
    .order('joined_at', { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { data }
}
