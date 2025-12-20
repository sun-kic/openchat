'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  validateInvitationToken,
  joinActivityWithToken,
} from '@/lib/actions/student-auth'

export default function JoinActivityPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const router = useRouter()
  const [token, setToken] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activity, setActivity] = useState<any>(null)

  const [formData, setFormData] = useState({
    studentNumber: '',
    displayName: '',
  })

  useEffect(() => {
    params.then(({ token }) => {
      setToken(token)
      validateToken(token)
    })
  }, [])

  async function validateToken(token: string) {
    const result = await validateInvitationToken(token)

    if (!result.valid) {
      setError(result.error || 'Invalid invitation')
      setLoading(false)
      return
    }

    setActivity(result.activity)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!formData.studentNumber || !formData.displayName) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    const result = await joinActivityWithToken(
      token,
      formData.studentNumber,
      formData.displayName
    )

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    // Success - redirect to activity with full page reload
    // Using window.location ensures the new cookie is properly sent
    window.location.href = `/student/activities/${result.activityId}`
  }

  if (loading && !activity) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Validating invitation...</p>
        </div>
      </div>
    )
  }

  if (error && !activity) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
          <div className="text-center">
            <div className="text-red-600 text-5xl mb-4">⚠</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Invalid Invitation
            </h1>
            <p className="text-gray-600">{error}</p>
            <p className="text-sm text-gray-500 mt-4">
              Please check the link with your teacher.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Join Activity
          </h1>
          <p className="text-lg text-blue-600">{activity?.title}</p>
          {activity?.description && (
            <p className="text-sm text-gray-500 mt-2">
              {activity.description}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-4">
            Enter your details to participate
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="studentNumber"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Student Number
            </label>
            <input
              id="studentNumber"
              type="text"
              required
              value={formData.studentNumber}
              onChange={(e) =>
                setFormData({ ...formData, studentNumber: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., S12345678"
            />
          </div>

          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Your Name
            </label>
            <input
              id="displayName"
              type="text"
              required
              value={formData.displayName}
              onChange={(e) =>
                setFormData({ ...formData, displayName: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., John Doe"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Joining...' : 'Join Activity'}
          </button>

          <p className="text-xs text-gray-500 text-center">
            By joining, you agree to participate in this educational activity.
          </p>
        </form>
      </div>
    </div>
  )
}
