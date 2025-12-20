'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  submitMessage,
  submitIndividualChoice,
  submitFinalChoice,
} from '@/lib/actions/messages'
import { validateMessageContent } from '@/lib/utils/validation'
import { useRealtimeMessages } from '@/lib/hooks/useRealtimeMessages'
import { useRealtimePresence } from '@/lib/hooks/useRealtimePresence'

type Question = {
  id: string
  title: string
  prompt: string
  context: string | null
  choices: any
  concept_tags: string[] | null
}

type Round = {
  id: string
  round_no: number
  status: string
  rules: any
}

export default function DiscussionRoom({
  activity,
  question,
  group,
  currentRound,
  currentUserId,
  isLeader,
}: {
  activity: any
  question: Question
  group: any
  currentRound: Round | null
  currentUserId: string
  isLeader: boolean
}) {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [validationInfo, setValidationInfo] = useState<any>(null)
  const [showChoiceForm, setShowChoiceForm] = useState(false)
  const [replyToMessage, setReplyToMessage] = useState<any>(null)
  const [finalChoice, setFinalChoice] = useState<'A' | 'B' | 'C' | 'D' | ''>('')
  const [finalRationale, setFinalRationale] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Use realtime hooks
  const { messages, loading } = useRealtimeMessages(
    group.id,
    currentRound?.id || ''
  )

  const currentUser = group.group_members.find(
    (m: any) => m.user_id === currentUserId
  )
  const { onlineUsers } = useRealtimePresence(
    group.id,
    currentUserId,
    currentUser?.profiles?.display_name || 'Student'
  )

  useEffect(() => {
    // Validate as user types
    if (content.trim()) {
      const minLen = currentRound?.rules?.min_len || 20
      const validation = validateMessageContent(
        content,
        minLen,
        question.concept_tags ?? undefined
      )
      setValidationInfo(validation)
    } else {
      setValidationInfo(null)
    }
  }, [content, currentRound, question.concept_tags])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!currentRound) {
      setError('No active round')
      return
    }

    if (!validationInfo?.valid) {
      setError(validationInfo?.error || 'Invalid message')
      return
    }

    setSubmitting(true)

    const result = await submitMessage(
      activity.id,
      question.id,
      group.id,
      currentRound.id,
      content,
      replyToMessage?.id
    )

    if (result.error) {
      setError(result.error)
      setSubmitting(false)
    } else {
      setContent('')
      setValidationInfo(null)
      setReplyToMessage(null)
      // Messages will update automatically via realtime
      router.refresh()
      setSubmitting(false)
    }
  }

  const handleFinalChoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!finalChoice) {
      setError('Please select a choice')
      return
    }

    if (finalRationale.trim().length < 50) {
      setError('Rationale must be at least 50 characters')
      return
    }

    setSubmitting(true)

    const result = await submitFinalChoice(
      activity.id,
      question.id,
      group.id,
      finalChoice,
      finalRationale
    )

    if (result.error) {
      setError(result.error)
      setSubmitting(false)
    } else {
      router.refresh()
      setSubmitting(false)
    }
  }

  const getRoundName = (roundNo: number) => {
    if (roundNo === 1) return 'Round 1: Personal Position'
    if (roundNo === 2) return 'Round 2: Evidence & Examples'
    if (roundNo === 3) return 'Round 3: Peer Review'
    return `Round ${roundNo}`
  }

  const minLen = currentRound?.rules?.min_len || 20
  const currentLen = content.trim().length
  const progress = Math.min((currentLen / minLen) * 100, 100)

  // Check if user has submitted in current round
  const userHasSubmitted = messages.some(
    (msg) => msg.user_id === currentUserId
  )

  return (
    <div className="h-full flex">
      {/* Sidebar - Question & Instructions */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
        {/* Question Context */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 mb-2">{question.title}</h2>
          {question.context && (
            <div className="mb-3 p-3 bg-blue-50 rounded text-sm text-blue-900">
              <p className="font-medium mb-1">Context:</p>
              <p>{question.context}</p>
            </div>
          )}
          <p className="text-sm text-gray-700">{question.prompt}</p>
        </div>

        {/* Current Round Info */}
        {currentRound && (
          <div className="p-4 border-b border-gray-200 bg-blue-50">
            <h3 className="font-semibold text-blue-900 mb-2">
              {getRoundName(currentRound.round_no)}
            </h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>✓ Minimum {minLen} characters</p>
              {question.concept_tags && question.concept_tags.length > 0 && (
                <p>✓ Use key concepts: {question.concept_tags.slice(0, 3).join(', ')}</p>
              )}
              {currentRound.round_no === 2 && <p>✓ Provide examples or edge cases</p>}
              {currentRound.round_no === 3 && <p>✓ Reply to a peer's message</p>}
            </div>
          </div>
        )}

        {/* Group Members */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Group Members</h3>
          <div className="space-y-2">
            {group.group_members
              .sort((a: any, b: any) => a.seat_no - b.seat_no)
              .map((member: any) => {
                const hasSubmitted = messages.some(
                  (msg) => msg.user_id === member.user_id
                )
                const isOnline = onlineUsers.includes(member.user_id)
                return (
                  <div key={member.user_id} className="flex items-center gap-2 text-sm">
                    <div className="relative">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          member.user_id === currentUserId
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {member.seat_no}
                      </div>
                      {isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <span className="flex-1">
                      {member.profiles.display_name}
                      {member.user_id === currentUserId && ' (You)'}
                    </span>
                    {hasSubmitted && (
                      <span className="text-green-600">✓</span>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <p>No messages yet. Be the first to share your thoughts!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.user_id === currentUserId
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-lg ${
                      isOwn ? 'bg-blue-600 text-white' : 'bg-white text-gray-900'
                    } rounded-lg p-3 shadow`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">
                        {message.profiles.display_name}
                      </span>
                      <span
                        className={`text-xs ${
                          isOwn ? 'text-blue-200' : 'text-gray-500'
                        }`}
                      >
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Reply-to indicator */}
                    {message.reply_to && message.parent_message && (
                      <div className={`mb-2 text-xs italic border-l-2 pl-2 ${
                        isOwn ? 'border-blue-400 text-blue-100' : 'border-gray-300 text-gray-600'
                      }`}>
                        <span className="font-medium">
                          {message.parent_message.profiles.display_name}:
                        </span>{' '}
                        {message.parent_message.content.substring(0, 50)}
                        {message.parent_message.content.length > 50 && '...'}
                      </div>
                    )}

                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.meta && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {message.meta.keyword_hits?.length > 0 && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              isOwn
                                ? 'bg-blue-500 text-blue-100'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            🔑 Keywords
                          </span>
                        )}
                        {message.meta.has_causality && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              isOwn
                                ? 'bg-green-500 text-green-100'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            💡 Causality
                          </span>
                        )}
                        {message.meta.has_example && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              isOwn
                                ? 'bg-purple-500 text-purple-100'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            📝 Example
                          </span>
                        )}
                      </div>
                    )}

                    {/* Reply button for Round 3 */}
                    {currentRound?.round_no === 3 && !isOwn && !userHasSubmitted && (
                      <button
                        onClick={() => setReplyToMessage(message)}
                        className={`mt-2 text-xs underline ${
                          isOwn ? 'text-blue-200 hover:text-blue-100' : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        Reply to this message
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {currentRound ? (
          <div className="border-t border-gray-200 bg-white p-4">
            {userHasSubmitted ? (
              <div className="text-center py-6">
                <div className="text-green-600 mb-2 flex items-center justify-center gap-2">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium">You've submitted for this round!</span>
                </div>
                <p className="text-sm text-gray-600">
                  Waiting for others to complete...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                    {error}
                  </div>
                )}

                {/* Reply-to indicator */}
                {replyToMessage && (
                  <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium text-blue-900">
                          Replying to {replyToMessage.profiles.display_name}:
                        </span>
                        <p className="text-blue-700 mt-1">
                          {replyToMessage.content.substring(0, 100)}
                          {replyToMessage.content.length > 100 && '...'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyToMessage(null)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    replyToMessage
                      ? `Reply to ${replyToMessage.profiles.display_name}...`
                      : `Share your thoughts (min ${minLen} chars)...`
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />

                {/* Progress Indicator */}
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex-1 mr-4">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          progress >= 100
                            ? 'bg-green-500'
                            : progress >= 50
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>
                        {currentLen} / {minLen} chars
                      </span>
                      {validationInfo && (
                        <span className="text-green-600">
                          {validationInfo.meta.keyword_hits?.length || 0} keywords •
                          {validationInfo.meta.has_causality ? ' ✓ causality' : ''}
                          {validationInfo.meta.has_example ? ' ✓ example' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || !validationInfo?.valid}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : !currentRound && isLeader && !group.final_choice ? (
          <div className="border-t border-gray-200 bg-white p-4">
            <h3 className="font-semibold text-gray-900 mb-4">
              Submit Final Group Answer
            </h3>

            <form onSubmit={handleFinalChoiceSubmit}>
              {error && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                  {error}
                </div>
              )}

              {/* Choices */}
              <div className="mb-4 space-y-2">
                {['A', 'B', 'C', 'D'].map((choice) => (
                  <label
                    key={choice}
                    className="flex items-start gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="finalChoice"
                      value={choice}
                      checked={finalChoice === choice}
                      onChange={(e) => setFinalChoice(e.target.value as 'A' | 'B' | 'C' | 'D')}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        {choice}. {question.choices[choice]}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Rationale */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Rationale (min 50 characters)
                </label>
                <textarea
                  value={finalRationale}
                  onChange={(e) => setFinalRationale(e.target.value)}
                  placeholder="Explain why your group chose this answer..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {finalRationale.trim().length} / 50 characters
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !finalChoice || finalRationale.trim().length < 50}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {submitting ? 'Submitting...' : 'Submit Final Answer'}
              </button>
            </form>
          </div>
        ) : !currentRound && group.final_choice ? (
          <div className="border-t border-gray-200 bg-white p-4 text-center py-6">
            <div className="text-green-600 mb-2 flex items-center justify-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">Final answer submitted!</span>
            </div>
            <p className="text-sm text-gray-600">
              Your group chose: <strong>{group.final_choice}</strong>
            </p>
          </div>
        ) : (
          <div className="border-t border-gray-200 bg-white p-4 text-center text-gray-500">
            Waiting for round to start...
          </div>
        )}
      </div>
    </div>
  )
}
