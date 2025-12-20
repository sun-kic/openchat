'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
      concept_tags: string[] | null
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
  activity: initialActivity,
  userGroup: initialUserGroup,
  currentUserId,
  isTemporaryStudent = false,
  studentSession = null,
}: {
  activity: Activity
  userGroup: Group | null
  currentUserId: string
  isTemporaryStudent?: boolean
  studentSession?: any
}) {
  const router = useRouter()
  const [activity, setActivity] = useState(initialActivity)
  const [userGroup, setUserGroup] = useState(initialUserGroup)
  const [currentRound, setCurrentRound] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const sortedQuestions = [...activity.activity_questions].sort(
    (a, b) => a.order_index - b.order_index
  )
  const currentQuestion =
    sortedQuestions[activity.current_question_index]?.questions

  const isLeader = userGroup?.leader_user_id === currentUserId

  // Track if we need to refresh due to status change
  const [needsRefresh, setNeedsRefresh] = useState(false)

  // Handle page refresh in a separate effect to avoid React update conflicts
  useEffect(() => {
    if (needsRefresh) {
      setNeedsRefresh(false)
      router.refresh()
    }
  }, [needsRefresh, router])

  // Real-time subscription for activity status changes and group assignments
  useEffect(() => {
    const supabase = createClient()

    // Subscribe to activity changes
    const activityChannel = supabase
      .channel(`activity:${activity.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'activities',
          filter: `id=eq.${activity.id}`,
        },
        (payload) => {
          console.log('[Realtime] Activity updated:', payload.new)
          const newStatus = payload.new.status
          const prevStatus = activity.status

          // Update activity state
          setActivity((prev) => ({ ...prev, ...payload.new }))

          // Trigger refresh in separate effect if status changed
          if (newStatus !== prevStatus) {
            console.log('[Realtime] Status changed, scheduling refresh')
            setNeedsRefresh(true)
          }
        }
      )
      .subscribe()

    // Subscribe to student session changes (for group assignment) if temporary student
    let sessionChannel: any = null
    if (isTemporaryStudent && studentSession?.id) {
      sessionChannel = supabase
        .channel(`session:${studentSession.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'student_sessions',
            filter: `id=eq.${studentSession.id}`,
          },
          (payload) => {
            console.log('[Realtime] Session updated:', payload.new)
            // If group_id changed, refresh to get new group data
            if (payload.new.group_id && payload.new.group_id !== studentSession.group_id) {
              console.log('[Realtime] Group assigned, scheduling refresh')
              setNeedsRefresh(true)
            }
          }
        )
        .subscribe()
    }

    return () => {
      supabase.removeChannel(activityChannel)
      if (sessionChannel) {
        supabase.removeChannel(sessionChannel)
      }
    }
  }, [activity.id, activity.status, isTemporaryStudent, studentSession?.id, studentSession?.group_id])

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

  // Temporary students without a group assignment yet
  if (!userGroup && isTemporaryStudent) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Welcome, {studentSession?.display_name}!
        </h1>
        <p className="text-gray-600 mb-6">
          You've joined the activity. Please wait for your teacher to assign you to a group.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 inline-block">
          <p className="text-blue-800">Activity: {activity.title}</p>
          <p className="text-blue-600 text-sm">Status: Waiting for group assignment</p>
        </div>
      </div>
    )
  }

  // Regular students without a group (shouldn't happen normally)
  if (!userGroup) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Not Assigned
        </h1>
        <p className="text-gray-600 mb-6">
          You are not assigned to a group for this activity.
        </p>
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
                {isTemporaryStudent && studentSession && (
                  <span className="ml-2 text-gray-400">({studentSession.display_name})</span>
                )}
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
