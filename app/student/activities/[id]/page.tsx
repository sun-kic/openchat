import { redirect } from 'next/navigation'
import { getCurrentIdentity } from '@/lib/actions/auth'
import { getActivityById, getActivityForTemporaryStudent } from '@/lib/actions/activities'
import { getStudentSessionForActivity } from '@/lib/actions/student-auth'
import StudentActivityView from '@/components/student/StudentActivityView'

export default async function StudentActivityPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // First check for temporary student session for this activity
  const sessionResult = await getStudentSessionForActivity(id)

  if (sessionResult.data) {
    // Temporary student with valid session for this activity
    const session = sessionResult.data as {
      id: string
      activity_id: string
      group_id: string | null
      display_name: string
      student_number: string
    }

    // Get activity data using service client (temporary students bypass RLS)
    const { data: activity, error } = await getActivityForTemporaryStudent(id, session.id)

    if (error || !activity) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Activity Not Found
            </h1>
            <p className="text-gray-600">{error || 'Activity does not exist'}</p>
          </div>
        </div>
      )
    }

    // For temporary students, find their group (they might not be assigned yet)
    const userGroup = session.group_id
      ? activity.groups?.find((group: any) => group.id === session.group_id)
      : null

    return (
      <div className="min-h-screen bg-gray-50">
        <StudentActivityView
          activity={activity}
          userGroup={userGroup}
          currentUserId={session.id}
          isTemporaryStudent={true}
          studentSession={session}
        />
      </div>
    )
  }

  // Fall back to permanent auth for enrolled students
  const identity = await getCurrentIdentity()

  if (!identity) {
    redirect('/login')
  }

  if (identity.role !== 'student') {
    redirect('/')
  }

  const { data: activity, error } = await getActivityById(id)

  if (error || !activity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Activity Not Found
          </h1>
          <p className="text-gray-600">{error || 'Activity does not exist'}</p>
        </div>
      </div>
    )
  }

  // Find user's group
  const userGroup = activity.groups?.find((group: any) =>
    group.group_members?.some((member: any) => member.user_id === identity.id)
  )

  if (!userGroup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Not Enrolled
          </h1>
          <p className="text-gray-600">
            You are not assigned to a group for this activity
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentActivityView
        activity={activity}
        userGroup={userGroup}
        currentUserId={identity.id}
      />
    </div>
  )
}
