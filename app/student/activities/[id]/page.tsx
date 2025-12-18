import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/actions/auth'
import { getActivityById } from '@/lib/actions/activities'
import StudentActivityView from '@/components/student/StudentActivityView'

export default async function StudentActivityPage({
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
    group.group_members?.some((member: any) => member.user_id === profile.id)
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
        currentUserId={profile.id}
      />
    </div>
  )
}
