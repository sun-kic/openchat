import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/actions/auth'
import { getCoursesByTeacher } from '@/lib/actions/courses'
import CourseList from '@/components/teacher/CourseList'

export default async function TeacherDashboard() {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/login')
  }

  if (profile.role !== 'teacher' && profile.role !== 'ta') {
    redirect('/')
  }

  const { data: courses, error } = await getCoursesByTeacher()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Teacher Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {profile.display_name}!
          </p>
        </div>

        <CourseList courses={courses || []} />
      </div>
    </div>
  )
}
