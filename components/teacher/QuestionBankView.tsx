'use client'

import { useState } from 'react'
import Link from 'next/link'
import CreateQuestionDialog from './CreateQuestionDialog'
import { Question } from '@/types'

type Course = {
  id: string
  title: string
}

export default function QuestionBankView({
  course,
  questions,
}: {
  course: Course
  questions: Question[]
}) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/teacher/courses/${course.id}`}
          className="text-blue-600 hover:text-blue-700 mb-4 inline-block"
        >
          ← Back to Course
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Question Bank</h1>
            <p className="text-gray-600 mt-2">{course.title}</p>
          </div>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + Create Question
          </button>
        </div>
      </div>

      {/* Questions List */}
      {questions.length === 0 ? (
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
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No questions yet
          </h3>
          <p className="text-gray-500 mb-6">
            Create your first question to start building activities
          </p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Your First Question
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => (
            <div
              key={question.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 cursor-pointer"
              onClick={() => setSelectedQuestion(question)}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {question.title}
                </h3>
                {question.concept_tags && question.concept_tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {question.concept_tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                {question.prompt}
              </p>
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>
                  Created {new Date(question.created_at).toLocaleDateString()}
                </span>
                <span className="text-blue-600 hover:text-blue-700">
                  View Details →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      {showCreateDialog && (
        <CreateQuestionDialog
          courseId={course.id}
          onClose={() => setShowCreateDialog(false)}
        />
      )}

      {/* Question Detail Modal */}
      {selectedQuestion && (
        <QuestionDetailModal
          question={selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
        />
      )}
    </div>
  )
}

function QuestionDetailModal({
  question,
  onClose,
}: {
  question: Question
  onClose: () => void
}) {
  const choices = ['A', 'B', 'C', 'D'] as const

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full my-8">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{question.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Context */}
        {question.context && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Context</h4>
            <p className="text-blue-800 text-sm">{question.context}</p>
          </div>
        )}

        {/* Prompt */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Question</h4>
          <p className="text-gray-700">{question.prompt}</p>
        </div>

        {/* Choices */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Answer Choices</h4>
          <div className="space-y-3">
            {question.choices && choices.map((key) => {
              const choice = (question.choices as any)[key]
              return (
                <div
                  key={key}
                  className={`p-4 rounded-lg border-2 ${
                    choice.correct
                      ? 'bg-green-50 border-green-500'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="font-semibold text-gray-700 mt-0.5">{key}.</span>
                    <div className="flex-1">
                      <p className="text-gray-800">{choice.text}</p>
                      {choice.correct && (
                        <span className="inline-block mt-2 text-xs bg-green-600 text-white px-2 py-1 rounded">
                          ✓ Correct Answer
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tags */}
        {question.concept_tags && question.concept_tags.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Concept Tags</h4>
            <div className="flex gap-2 flex-wrap">
              {question.concept_tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Close
          </button>
          <button className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">
            Edit Question
          </button>
        </div>
      </div>
    </div>
  )
}
