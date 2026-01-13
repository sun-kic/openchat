'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTeacherAccount } from '@/lib/actions/admin'
import Link from 'next/link'

type TeacherCreationResult = {
  email: string
  temporaryPassword: string
}

export default function CreateTeacherPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<TeacherCreationResult | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await createTeacherAccount(
      formData.email,
      formData.displayName
    )

    if (result.error || !result.teacher) {
      setError(result.error || 'Failed to create teacher account')
      setLoading(false)
      return
    }

    setSuccess(result.teacher)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-green-900 mb-4">
              Teacher Account Created Successfully
            </h2>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Email:</strong> {success.email}
              </p>
              <p>
                <strong>Temporary Password:</strong>{' '}
                <code className="bg-gray-100 px-2 py-1 rounded text-red-600 font-mono">
                  {success.temporaryPassword}
                </code>
              </p>
              <p className="text-orange-700 mt-4 bg-orange-50 p-3 rounded">
                ⚠ Please save this password securely and send it to the
                teacher. They should change it upon first login.
              </p>
            </div>
            <div className="mt-6 space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(success.temporaryPassword)
                  alert('Password copied to clipboard!')
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Copy Password
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/admin"
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold mb-6">Create Teacher Account</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="teacher@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Display Name
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
                placeholder="Dr. John Smith"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">
                A secure temporary password will be automatically generated and
                displayed after account creation.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {loading ? 'Creating...' : 'Create Teacher Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
