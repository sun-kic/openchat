import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/actions/auth'
import { getCourseById } from '@/lib/actions/courses'
import { getActivitiesByCourse } from '@/lib/actions/activities'
import CourseDetailView from '@/components/teacher/CourseDetailView'

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/login')
  }

  if (profile.role !== 'teacher' && profile.role !== 'ta') {
    redirect('/')
  }

  const { data: course, error } = await getCourseById(id)
  const { data: activities } = await getActivitiesByCourse(id)

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Course Not Found
          </h1>
          <p className="text-gray-600">{error || 'Course does not exist'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CourseDetailView course={course} activities={activities || []} />
    </div>
  )
}
