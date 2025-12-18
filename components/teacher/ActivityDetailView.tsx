'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startActivity, endActivity, deleteActivity } from '@/lib/actions/activities'
import { getRoundsByActivity } from '@/lib/actions/rounds'
import RoundControl from './RoundControl'

type Activity = {
  id: string
  title: string
  description: string | null
  status: string
  current_question_index: number
  created_at: string
  courses: {
    id: string
    title: string
  }
  activity_questions: Array<{
    order_index: number
    questions: {
      id: string
      title: string
      prompt: string
    }
  }>
  groups: Array<{
    id: string
    name: string
    leader_user_id: string | null
    group_members: Array<{
      user_id: string
      seat_no: number
      profiles: {
        id: string
        display_name: string
        student_number: string | null
      }
    }>
  }>
}

export default function ActivityDetailView({ activity }: { activity: Activity }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [rounds, setRounds] = useState<any[]>([])
  const [currentRound, setCurrentRound] = useState<any>(null)

  const sortedQuestions = [...activity.activity_questions].sort((a, b) => a.order_index - b.order_index)
  const currentQuestion = sortedQuestions[activity.current_question_index]?.questions

  useEffect(() => {
    if (activity.status === 'running' && currentQuestion) {
      loadRounds()
    }
  }, [activity.status, currentQuestion])

  const loadRounds = async () => {
    if (!currentQuestion) return

    const { data } = await getRoundsByActivity(activity.id, currentQuestion.id)
    if (data) {
      setRounds(data)
      const active = data.find((r: any) => r.status === 'open')
      setCurrentRound(active || null)
    }
  }

  const handleStart = async () => {
    if (!confirm('Start this activity? Students will be able to join and begin discussions.')) {
      return
    }

    setLoading(true)
    const result = await startActivity(activity.id)

    if (result.error) {
      alert(result.error)
      setLoading(false)
    } else {
      router.refresh()
      setLoading(false)
    }
  }

  const handleEnd = async () => {
    if (!confirm('End this activity? Students will no longer be able to participate.')) {
      return
    }

    setLoading(true)
    const result = await endActivity(activity.id)

    if (result.error) {
      alert(result.error)
      setLoading(false)
    } else {
      router.refresh()
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    const result = await deleteActivity(activity.id)

    if (result.error) {
      alert(result.error)
      setLoading(false)
    } else {
      router.push(`/teacher/courses/${activity.courses.id}`)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/teacher/courses/${activity.courses.id}`}
          className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to Course
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{activity.title}</h1>
            <p className="text-gray-600 mt-2">{activity.courses.title}</p>
            {activity.description && (
              <p className="text-gray-500 mt-1">{activity.description}</p>
            )}
          </div>
          <div className="flex gap-3">
            {activity.status === 'draft' && (
              <button
                onClick={handleStart}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Starting...' : 'Start Activity'}
              </button>
            )}
            {activity.status === 'running' && (
              <button
                onClick={handleEnd}
                disabled={loading}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
              >
                {loading ? 'Ending...' : 'End Activity'}
              </button>
            )}
            {activity.status === 'draft' && (
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="px-4 py-2 text-red-600 border border-red-600 rounded-md hover:bg-red-50"
              >
                Delete
              </button>
            )}
          </div>
        </div>
        <div className="mt-4">
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${
            activity.status === 'draft' ? 'bg-gray-100 text-gray-700' :
            activity.status === 'running' ? 'bg-green-100 text-green-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {activity.status === 'draft' ? 'Draft' :
             activity.status === 'running' ? 'Running' : 'Ended'}
          </span>
        </div>
      </div>

      {/* Questions and Round Control */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Questions */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Discussion Questions ({sortedQuestions.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {sortedQuestions.map((aq, index) => (
                <div key={aq.questions.id} className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      index === activity.current_question_index
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {aq.questions.title}
                        {index === activity.current_question_index && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            Current
                          </span>
                        )}
                      </h3>
                      <p className="text-gray-600 text-sm">{aq.questions.prompt}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Round Control */}
        {activity.status === 'running' && currentQuestion && (
          <div className="lg:col-span-1">
            <RoundControl
              activityId={activity.id}
              questionId={currentQuestion.id}
              currentRound={currentRound}
              allRounds={rounds}
            />
          </div>
        )}
      </div>

      {/* Groups */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Groups ({activity.groups.length}) - Auto-grouped (4 per group)
          </h2>
        </div>
        {activity.groups.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No groups yet. Groups will be created automatically when students enroll.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {activity.groups.map((group) => (
              <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">{group.name}</h3>
                <div className="space-y-2">
                  {group.group_members
                    .sort((a, b) => a.seat_no - b.seat_no)
                    .map((member) => (
                      <div key={member.user_id} className="flex items-center gap-2 text-sm">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          group.leader_user_id === member.user_id
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {member.seat_no}
                        </div>
                        <span className="text-gray-900">
                          {member.profiles.display_name}
                        </span>
                        {group.leader_user_id === member.user_id && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                            Leader
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Delete Activity?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete &quot;{activity.title}&quot;? This will delete all
              groups, discussions, and data. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                disabled={loading}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete Activity'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
