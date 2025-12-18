'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createQuestion } from '@/lib/actions/questions'
import { QuestionChoices } from '@/types'

export default function CreateQuestionDialog({
  courseId,
  onClose,
}: {
  courseId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    context: '',
    prompt: '',
    conceptTags: '',
  })

  const [choices, setChoices] = useState<QuestionChoices>({
    A: { text: '', correct: false },
    B: { text: '', correct: false },
    C: { text: '', correct: false },
    D: { text: '', correct: false },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate
    const correctCount = Object.values(choices).filter(c => c.correct).length
    if (correctCount !== 1) {
      setError('Please mark exactly one choice as correct')
      return
    }

    const emptyChoices = Object.values(choices).filter(c => !c.text.trim()).length
    if (emptyChoices > 0) {
      setError('All choices must have text')
      return
    }

    setLoading(true)

    const tags = formData.conceptTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)

    const result = await createQuestion(
      courseId,
      formData.title,
      formData.prompt,
      formData.context || null,
      tags,
      choices
    )

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.refresh()
      onClose()
    }
  }

  const toggleCorrect = (key: 'A' | 'B' | 'C' | 'D') => {
    setChoices({
      A: { ...choices.A, correct: key === 'A' },
      B: { ...choices.B, correct: key === 'B' },
      C: { ...choices.C, correct: key === 'C' },
      D: { ...choices.D, correct: key === 'D' },
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full my-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Create New Question
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Variable Assignment in PHP"
            />
          </div>

          {/* Context (PBL Scenario) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Context / Scenario (Optional)
            </label>
            <textarea
              value={formData.context}
              onChange={(e) => setFormData({ ...formData, context: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Provide a real-world scenario or context for the question..."
            />
            <p className="text-xs text-gray-500 mt-1">
              PBL context to make the question more relatable
            </p>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Question Prompt *
            </label>
            <textarea
              required
              value={formData.prompt}
              onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="What is the correct way to...?"
            />
          </div>

          {/* Concept Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Concept Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.conceptTags}
              onChange={(e) => setFormData({ ...formData, conceptTags: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="variables, assignment, operators"
            />
            <p className="text-xs text-gray-500 mt-1">
              Keywords for categorization and analysis
            </p>
          </div>

          {/* Four Choices */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Answer Choices * (Select the correct answer)
            </label>
            <div className="space-y-3">
              {(['A', 'B', 'C', 'D'] as const).map((key) => (
                <div key={key} className="flex gap-3 items-start">
                  <button
                    type="button"
                    onClick={() => toggleCorrect(key)}
                    className={`flex-shrink-0 mt-2 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      choices[key].correct
                        ? 'bg-green-600 border-green-600'
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                  >
                    {choices[key].correct && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-700">{key}.</span>
                      {choices[key].correct && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                          Correct Answer
                        </span>
                      )}
                    </div>
                    <textarea
                      required
                      value={choices[key].text}
                      onChange={(e) =>
                        setChoices({
                          ...choices,
                          [key]: { ...choices[key], text: e.target.value },
                        })
                      }
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder={getPlaceholder(key)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              <strong>Design Guide:</strong> A = Optimal answer | B = Right concept, wrong context |
              C = Common misconception | D = Overgeneralized
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function getPlaceholder(key: 'A' | 'B' | 'C' | 'D'): string {
  const placeholders = {
    A: 'Optimal answer (correct and explanatory)',
    B: 'Right concept but wrong situation',
    C: 'Common misconception',
    D: 'Overgeneralized or ambiguous',
  }
  return placeholders[key]
}
