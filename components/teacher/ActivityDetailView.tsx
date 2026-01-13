'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startActivity, endActivity, deleteActivity, assignPendingStudentsToGroups } from '@/lib/actions/activities'
import { getRoundsByActivity } from '@/lib/actions/rounds'
import { generateActivityInvitation, listActivityInvitations, revokeInvitation } from '@/lib/actions/invitations'
import RoundControl from './RoundControl'
import GroupMessagesView from './GroupMessagesView'

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
    temp_members?: Array<{
      id: string
      display_name: string
      student_number: string
    }>
  }>
}

export default function ActivityDetailView({ activity }: { activity: Activity }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [rounds, setRounds] = useState<any[]>([])
  const [currentRound, setCurrentRound] = useState<any>(null)
  const [invitations, setInvitations] = useState<any[]>([])
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [assigningGroups, setAssigningGroups] = useState(false)

  const sortedQuestions = [...activity.activity_questions].sort((a, b) => a.order_index - b.order_index)
  const currentQuestion = sortedQuestions[activity.current_question_index]?.questions

  const loadInvitations = useCallback(async () => {
    const { data } = await listActivityInvitations(activity.id)
    if (data) {
      setInvitations(data)
    }
  }, [activity.id])

  const loadRounds = useCallback(async () => {
    if (!currentQuestion) return

    const { data } = await getRoundsByActivity(activity.id, currentQuestion.id)
    if (data) {
      setRounds(data)
      const active = data.find((r: { status: string }) => r.status === 'open')
      setCurrentRound(active || null)
    }
  }, [activity.id, currentQuestion])

  useEffect(() => {
    if (activity.status === 'running' && currentQuestion) {
      loadRounds()
    }
    loadInvitations()
  }, [activity.status, currentQuestion, loadRounds, loadInvitations])

  const handleGenerateInvitation = async () => {
    setGeneratingInvite(true)
    const result = await generateActivityInvitation(activity.id)
    setGeneratingInvite(false)

    if (result.error) {
      alert(result.error)
    } else {
      loadInvitations()
    }
  }

  const handleCopyLink = (token: string) => {
    const baseUrl = window.location.origin
    const url = `${baseUrl}/join/${token}`
    navigator.clipboard.writeText(url)
    setCopiedLink(token)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm('Revoke this invitation link? Students will no longer be able to join using this link.')) {
      return
    }
    const result = await revokeInvitation(invitationId)
    if (result.error) {
      alert(result.error)
    } else {
      loadInvitations()
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

  const handleAssignGroups = async () => {
    setAssigningGroups(true)
    const result = await assignPendingStudentsToGroups(activity.id)

    if (result.error) {
      alert(result.error)
    } else {
      router.refresh()
    }
    setAssigningGroups(false)
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
            {(activity.status === 'draft' || activity.status === 'ended') && (
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

      {/* Student Invitation Links */}
      {activity.status !== 'ended' && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Student Invitation Links
            </h2>
            <button
              onClick={handleGenerateInvitation}
              disabled={generatingInvite}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {generatingInvite ? 'Generating...' : '+ Generate New Link'}
            </button>
          </div>
          <div className="p-6">
            {invitations.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No invitation links yet. Generate a link to share with students.
              </p>
            ) : (
              <div className="space-y-3">
                {invitations.filter(inv => inv.is_active).map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <code className="text-sm bg-blue-50 px-3 py-1 rounded text-blue-700">
                        {window.location.origin}/join/{invitation.token}
                      </code>
                      <div className="text-xs text-gray-500 mt-1">
                        Created: {new Date(invitation.created_at).toLocaleString()}
                        {invitation.use_count > 0 && ` • Used: ${invitation.use_count} times`}
                        {invitation.max_uses && ` • Max uses: ${invitation.max_uses}`}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopyLink(invitation.token)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        {copiedLink === invitation.token ? '✓ Copied!' : 'Copy'}
                      </button>
                      <button
                        onClick={() => handleRevokeInvitation(invitation.id)}
                        className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Groups ({activity.groups.length}) - Auto-grouped (4 per group)
          </h2>
          {activity.status === 'running' && (
            <button
              onClick={handleAssignGroups}
              disabled={assigningGroups}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {assigningGroups ? 'Assigning...' : 'Assign Pending Students'}
            </button>
          )}
        </div>
        {activity.groups.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No groups yet. Groups will be created automatically when students enroll.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {activity.groups.map((group) => {
              const totalMembers = (group.group_members?.length || 0) + (group.temp_members?.length || 0)
              return (
                <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    {group.name}
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({totalMembers} members)
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {/* Permanent members */}
                    {group.group_members
                      ?.sort((a, b) => a.seat_no - b.seat_no)
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
                    {/* Temporary students (via invitation link) */}
                    {group.temp_members?.map((member, index) => (
                      <div key={member.id} className="flex items-center gap-2 text-sm">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          group.leader_user_id === member.id
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          {(group.group_members?.length || 0) + index + 1}
                        </div>
                        <span className="text-gray-900">
                          {member.display_name}
                        </span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          Guest
                        </span>
                        {group.leader_user_id === member.id && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                            Leader
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Message Monitoring */}
      {activity.status === 'running' && currentRound && activity.groups.length > 0 && (
        <div className="bg-white rounded-lg shadow mt-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Student Discussions - Round {currentRound.round_no}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Click on a group to view their messages
            </p>
          </div>
          <div className="p-6 space-y-4">
            {activity.groups.map((group) => (
              <GroupMessagesView
                key={group.id}
                group={group}
                roundId={currentRound.id}
              />
            ))}
          </div>
        </div>
      )}

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
