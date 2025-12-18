'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { joinCourseByCode } from '@/lib/actions/courses'

type Enrollment = {
  course_id: string
  joined_at: string
  courses: {
    id: string
    title: string
    description: string | null
    invitation_code: string
    created_at: string
    profiles: {
      display_name: string
    }
  }
}

export default function StudentCourseList({
  enrollments,
}: {
  enrollments: Enrollment[]
}) {
  const router = useRouter()
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [invitationCode, setInvitationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleJoinCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await joinCourseByCode(invitationCode)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.refresh()
      setShowJoinDialog(false)
      setInvitationCode('')
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">My Courses</h2>
        <button
          onClick={() => setShowJoinDialog(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          + Join Course
        </button>
      </div>

      {enrollments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No courses yet
          </h3>
          <p className="text-gray-500 mb-6">
            Get an invitation code from your teacher to join a course
          </p>
          <button
            onClick={() => setShowJoinDialog(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Join Your First Course
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {enrollments.map((enrollment) => (
            <div
              key={enrollment.course_id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {enrollment.courses.title}
              </h3>
              {enrollment.courses.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {enrollment.courses.description}
                </p>
              )}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Teacher:</span>
                  <span className="text-gray-900">
                    {enrollment.courses.profiles.display_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Joined:</span>
                  <span className="text-gray-900">
                    {new Date(enrollment.joined_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Link
                  href={`/student/courses/${enrollment.course_id}`}
                  className="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-md hover:bg-blue-700 transition-colors"
                >
                  View Activities
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Join Course Dialog */}
      {showJoinDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Join a Course
            </h2>

            <form onSubmit={handleJoinCourse} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="code"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Invitation Code
                </label>
                <input
                  id="code"
                  type="text"
                  required
                  value={invitationCode}
                  onChange={(e) =>
                    setInvitationCode(e.target.value.toUpperCase())
                  }
                  maxLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-lg text-center uppercase"
                  placeholder="ABC12345"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Enter the 8-character code provided by your teacher
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinDialog(false)
                    setInvitationCode('')
                    setError('')
                  }}
                  disabled={loading}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || invitationCode.length !== 8}
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Joining...' : 'Join Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
