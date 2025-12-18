import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/actions/auth'
import { getCourseById } from '@/lib/actions/courses'
import { getActivitiesByCourse } from '@/lib/actions/activities'
import Link from 'next/link'

export default async function StudentCoursePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/login')
  }

  if (profile.role !== 'student') {
    redirect('/')
  }

  const { data: course } = await getCourseById(id)
  const { data: activities } = await getActivitiesByCourse(id)

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Course Not Found
          </h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href="/student"
            className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
          {course.description && (
            <p className="text-gray-600 mt-2">{course.description}</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Activities</h2>
          </div>

          {!activities || activities.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No activities yet. Your teacher will create activities soon.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {activities.map((activity) => (
                <div key={activity.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {activity.title}
                      </h3>
                      <div className="flex gap-4 text-sm text-gray-500">
                        <span>{activity.question_count} questions</span>
                        <span>Created {new Date(activity.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          activity.status === 'draft'
                            ? 'bg-gray-100 text-gray-700'
                            : activity.status === 'running'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {activity.status === 'draft'
                          ? 'Not Started'
                          : activity.status === 'running'
                          ? 'Active'
                          : 'Ended'}
                      </span>
                      {activity.status === 'running' && (
                        <Link
                          href={`/student/activities/${activity.id}`}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Join Discussion
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
