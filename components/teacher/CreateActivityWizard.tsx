'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createActivity } from '@/lib/actions/activities'
import { Question } from '@/types'

type Course = {
  id: string
  title: string
}

export default function CreateActivityWizard({
  course,
  questions,
}: {
  course: Course
  questions: Question[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
  })

  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])

  const toggleQuestion = (questionId: string) => {
    if (selectedQuestions.includes(questionId)) {
      setSelectedQuestions(selectedQuestions.filter((id) => id !== questionId))
    } else {
      setSelectedQuestions([...selectedQuestions, questionId])
    }
  }

  const moveQuestionUp = (index: number) => {
    if (index === 0) return
    const newOrder = [...selectedQuestions]
    ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
    setSelectedQuestions(newOrder)
  }

  const moveQuestionDown = (index: number) => {
    if (index === selectedQuestions.length - 1) return
    const newOrder = [...selectedQuestions]
    ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
    setSelectedQuestions(newOrder)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (selectedQuestions.length === 0) {
      setError('Please select at least one question')
      return
    }

    setLoading(true)

    const result = await createActivity(
      course.id,
      formData.title,
      formData.description || null,
      selectedQuestions
    )

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push(`/teacher/courses/${course.id}`)
      router.refresh()
    }
  }

  const selectedQuestionObjects = selectedQuestions
    .map((id) => questions.find((q) => q.id === id))
    .filter((q): q is Question => q !== undefined)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          href={`/teacher/courses/${course.id}`}
          className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to Course
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create New Activity</h1>
        <p className="text-gray-600 mt-2">{course.title}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Activity Details
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activity Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., PHP Basics Discussion - Week 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of the activity..."
              />
            </div>
          </div>
        </div>

        {/* Question Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Select Questions
          </h2>

          {questions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                No questions available. Create questions first.
              </p>
              <Link
                href={`/teacher/courses/${course.id}/questions`}
                className="text-blue-600 hover:text-blue-700"
              >
                Go to Question Bank →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((question) => {
                const isSelected = selectedQuestions.includes(question.id)
                return (
                  <div
                    key={question.id}
                    onClick={() => toggleQuestion(question.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300'
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {question.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {question.prompt}
                        </p>
                        {question.concept_tags &&
                          question.concept_tags.length > 0 && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {question.concept_tags.slice(0, 3).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected Questions Order */}
        {selectedQuestionObjects.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Question Order ({selectedQuestionObjects.length} selected)
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Students will discuss these questions in order. Drag to reorder.
            </p>

            <div className="space-y-2">
              {selectedQuestionObjects.map((question, index) => (
                <div
                  key={question.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => moveQuestionUp(index)}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestionDown(index)}
                      disabled={index === selectedQuestionObjects.length - 1}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{question.title}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleQuestion(question.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4">
          <Link
            href={`/teacher/courses/${course.id}`}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || selectedQuestions.length === 0}
            className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Activity'}
          </button>
        </div>
      </form>
    </div>
  )
}
