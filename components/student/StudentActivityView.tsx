'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getCurrentRound, getGroupMessages } from '@/lib/actions/messages'
import DiscussionRoom from './DiscussionRoom'

type Activity = {
  id: string
  title: string
  status: string
  current_question_index: number
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
      context: string | null
      choices: any
      concept_tags: string[]
    }
  }>
}

type Group = {
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
}

export default function StudentActivityView({
  activity,
  userGroup,
  currentUserId,
}: {
  activity: Activity
  userGroup: Group
  currentUserId: string
}) {
  const [currentRound, setCurrentRound] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const sortedQuestions = [...activity.activity_questions].sort(
    (a, b) => a.order_index - b.order_index
  )
  const currentQuestion =
    sortedQuestions[activity.current_question_index]?.questions

  const isLeader = userGroup.leader_user_id === currentUserId

  useEffect(() => {
    if (currentQuestion && activity.status === 'running') {
      loadCurrentRound()
    } else {
      setLoading(false)
    }
  }, [currentQuestion, activity.status])

  const loadCurrentRound = async () => {
    if (!currentQuestion) return

    const { data } = await getCurrentRound(activity.id, currentQuestion.id)
    setCurrentRound(data)
    setLoading(false)
  }

  if (activity.status === 'draft') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Activity Not Started
        </h1>
        <p className="text-gray-600 mb-6">
          This activity hasn't started yet. Please wait for your teacher to begin.
        </p>
        <Link
          href="/student"
          className="text-blue-600 hover:text-blue-700"
        >
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  if (activity.status === 'ended') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Activity Ended
        </h1>
        <p className="text-gray-600 mb-6">
          This activity has been completed.
        </p>
        <Link
          href="/student"
          className="text-blue-600 hover:text-blue-700"
        >
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-600">No questions available</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/student"
              className="text-gray-400 hover:text-gray-600"
            >
              ←
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {activity.title}
              </h1>
              <p className="text-sm text-gray-500">
                {userGroup.name}
                {isLeader && (
                  <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                    You are the leader
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Question {activity.current_question_index + 1} of {sortedQuestions.length}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <DiscussionRoom
          activity={activity}
          question={currentQuestion}
          group={userGroup}
          currentRound={currentRound}
          currentUserId={currentUserId}
          isLeader={isLeader}
        />
      </div>
    </div>
  )
}
