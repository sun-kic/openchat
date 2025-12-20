import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/actions/auth'
import Link from 'next/link'

export default async function Home() {
  const profile = await getCurrentProfile()

  // If authenticated, redirect based on role
  if (profile) {
    if (profile.role === 'admin') {
      redirect('/admin')
    } else if (profile.role === 'teacher') {
      redirect('/teacher')
    } else if (profile.role === 'student') {
      redirect('/student')
    } else if (profile.role === 'ta') {
      redirect('/teacher') // TAs use teacher interface
    }
  }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          OpenChat
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          PHP Concept Discussion Platform
        </p>
        <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
          Structured group discussions for diagnosing student understanding of programming concepts
          through turn-based, role-based collaborative learning.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link
            href="/login"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            Create Account
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="p-6 bg-white rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              For Teachers
            </h3>
            <p className="text-gray-600">
              Monitor discussions, assess student understanding, and track concept mastery in real-time
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              For Students
            </h3>
            <p className="text-gray-600">
              Engage in structured discussions with mandatory participation and peer evaluation
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Diagnostic Focus
            </h3>
            <p className="text-gray-600">
              System validates concept understanding through required elements and turn-based rounds
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
