import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/actions/auth'
import { getActivityById } from '@/lib/actions/activities'
import ActivityDetailView from '@/components/teacher/ActivityDetailView'

export default async function ActivityDetailPage({
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

  return (
    <div className="min-h-screen bg-gray-50">
      <ActivityDetailView activity={activity} />
    </div>
  )
}
