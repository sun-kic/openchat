import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/actions/auth'
import { getEnrolledCourses } from '@/lib/actions/student'
import StudentCourseList from '@/components/student/StudentCourseList'

export default async function StudentDashboard() {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/login')
  }

  if (profile.role !== 'student') {
    redirect('/')
  }

  const { data: enrollments } = await getEnrolledCourses()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Student Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Welcome, {profile.display_name}! (ID: {profile.student_number})
          </p>
        </div>

        <StudentCourseList enrollments={enrollments || []} />
      </div>
    </div>
  )
}
