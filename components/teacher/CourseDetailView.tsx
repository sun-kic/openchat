'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { removeMemberFromCourse, deleteCourse } from '@/lib/actions/courses'

type CourseMember = {
  user_id: string
  joined_at: string
  profiles: {
    id: string
    display_name: string
    role: string
    student_number: string | null
  }
}

type Course = {
  id: string
  title: string
  description: string | null
  invitation_code: string
  created_at: string
  course_members: CourseMember[]
}

type Activity = {
  id: string
  title: string
  status: string
  question_count: number
  group_count: number
  created_at: string
}

export default function CourseDetailView({ course, activities }: { course: Course; activities: Activity[] }) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [removingMember, setRemovingMember] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)

  const handleCopyCode = () => {
    navigator.clipboard.writeText(course.invitation_code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this student from the course?')) {
      return
    }

    setRemovingMember(userId)
    const result = await removeMemberFromCourse(course.id, userId)
    setRemovingMember(null)

    if (result.error) {
      alert(result.error)
    } else {
      router.refresh()
    }
  }

  const handleDeleteCourse = async () => {
    setDeleting(true)
    const result = await deleteCourse(course.id)

    if (result.error) {
      alert(result.error)
      setDeleting(false)
    } else {
      router.push('/teacher')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/teacher"
          className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to Dashboard
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
            {course.description && (
              <p className="text-gray-600 mt-2">{course.description}</p>
            )}
          </div>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="px-4 py-2 text-red-600 border border-red-600 rounded-md hover:bg-red-50"
          >
            Delete Course
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Link
          href={`/teacher/courses/${course.id}/questions`}
          className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Question Bank
          </h3>
          <p className="text-gray-600 text-sm">
            Create and manage questions for activities
          </p>
        </Link>
        <Link
          href={`/teacher/courses/${course.id}/activities/new`}
          className="bg-blue-600 text-white rounded-lg shadow p-6 hover:shadow-md hover:bg-blue-700 transition-all"
        >
          <h3 className="text-lg font-semibold mb-2">
            + Create Activity
          </h3>
          <p className="text-blue-100 text-sm">
            Set up a new discussion activity
          </p>
        </Link>
      </div>

      {/* Activities List */}
      {activities.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Activities</h2>
          </div>
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
                      <span>{activity.group_count} groups</span>
                      <span>Created {new Date(activity.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      activity.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                      activity.status === 'running' ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {activity.status === 'draft' ? 'Draft' :
                       activity.status === 'running' ? 'Running' : 'Ended'}
                    </span>
                    <Link
                      href={`/teacher/activities/${activity.id}`}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invitation Code */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Invitation Code
        </h2>
        <div className="flex items-center gap-4">
          <code className="text-2xl font-mono bg-blue-50 px-6 py-3 rounded-lg text-blue-700">
            {course.invitation_code}
          </code>
          <button
            onClick={handleCopyCode}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {copiedCode ? '✓ Copied!' : 'Copy Code'}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-3">
          Share this code with students to let them join the course
        </p>
      </div>

      {/* Student Roster */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Student Roster ({course.course_members?.length || 0})
          </h2>
        </div>

        {!course.course_members || course.course_members.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">
              No students enrolled yet. Share the invitation code to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {course.course_members.map((member) => (
                  <tr key={member.user_id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {member.profiles.display_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {member.profiles.student_number || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(member.joined_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        disabled={removingMember === member.user_id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {removingMember === member.user_id ? 'Removing...' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Delete Course?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete &quot;{course.title}&quot;? This will also
              delete all associated activities, discussions, and data. This action
              cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCourse}
                disabled={deleting}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
