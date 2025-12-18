'use client'

import { useState } from 'react'
import Link from 'next/link'
import CreateCourseDialog from './CreateCourseDialog'

type Course = {
  id: string
  title: string
  description: string | null
  invitation_code: string
  created_at: string
  member_count: number
}

export default function CourseList({ courses }: { courses: Course[] }) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">My Courses</h2>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          + Create Course
        </button>
      </div>

      {courses.length === 0 ? (
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
            Get started by creating your first course
          </p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Your First Course
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/teacher/courses/${course.id}`}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 block"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {course.title}
              </h3>
              {course.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {course.description}
                </p>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {course.member_count} student{course.member_count !== 1 ? 's' : ''}
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-mono text-xs">
                  {course.invitation_code}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreateDialog && (
        <CreateCourseDialog
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => setShowCreateDialog(false)}
        />
      )}
    </div>
  )
}
