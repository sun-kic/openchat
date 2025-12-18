'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { startRound, endRound } from '@/lib/actions/rounds'

type Round = {
  id: string
  round_no: number
  status: string
  created_at: string
  completed_at: string | null
}

export default function RoundControl({
  activityId,
  questionId,
  currentRound,
  allRounds,
}: {
  activityId: string
  questionId: string
  currentRound: Round | null
  allRounds: Round[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleStartRound = async (roundNo: number) => {
    if (
      !confirm(
        `Start Round ${roundNo}? ${
          currentRound ? 'This will close the current round.' : ''
        }`
      )
    ) {
      return
    }

    setLoading(true)
    const result = await startRound(activityId, questionId, roundNo)

    if (result.error) {
      alert(result.error)
      setLoading(false)
    } else {
      router.refresh()
      setLoading(false)
    }
  }

  const handleEndRound = async () => {
    if (!currentRound) return

    if (!confirm('End the current round?')) {
      return
    }

    setLoading(true)
    const result = await endRound(currentRound.id)

    if (result.error) {
      alert(result.error)
      setLoading(false)
    } else {
      router.refresh()
      setLoading(false)
    }
  }

  const getRoundName = (roundNo: number) => {
    if (roundNo === 1) return 'Round 1: Personal Position'
    if (roundNo === 2) return 'Round 2: Evidence & Examples'
    if (roundNo === 3) return 'Round 3: Peer Review'
    return `Round ${roundNo}`
  }

  const getRoundStatus = (roundNo: number) => {
    const round = allRounds.find((r) => r.round_no === roundNo)
    if (!round) return 'not_started'
    if (round.status === 'open') return 'open'
    return 'closed'
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Round Control</h3>

      {/* Current Round Display */}
      {currentRound && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium text-green-900">
                {getRoundName(currentRound.round_no)}
              </h4>
              <p className="text-sm text-green-700 mt-1">
                Started at {new Date(currentRound.created_at).toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={handleEndRound}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
            >
              {loading ? 'Ending...' : 'End Round'}
            </button>
          </div>
        </div>
      )}

      {/* Round Buttons */}
      <div className="space-y-3">
        {[1, 2, 3].map((roundNo) => {
          const status = getRoundStatus(roundNo)
          const isCurrent = currentRound?.round_no === roundNo

          return (
            <div
              key={roundNo}
              className={`flex items-center justify-between p-3 border rounded ${
                isCurrent
                  ? 'bg-green-50 border-green-200'
                  : status === 'closed'
                  ? 'bg-gray-50 border-gray-200'
                  : 'bg-white border-gray-300'
              }`}
            >
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {getRoundName(roundNo)}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {status === 'open' && '✓ Currently active'}
                  {status === 'closed' && '✓ Completed'}
                  {status === 'not_started' && 'Not started'}
                </div>
              </div>

              {status === 'not_started' && !isCurrent && (
                <button
                  onClick={() => handleStartRound(roundNo)}
                  disabled={loading || !!currentRound}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {loading ? 'Starting...' : 'Start Round'}
                </button>
              )}

              {status === 'closed' && (
                <button
                  onClick={() => handleStartRound(roundNo)}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 text-sm"
                >
                  {loading ? 'Restarting...' : 'Restart Round'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
        <p className="font-medium mb-1">Instructions:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Start rounds sequentially for students to participate</li>
          <li>Each student must submit once per round before moving to the next</li>
          <li>Round 3 enables reply-to functionality for peer review</li>
          <li>After all rounds, leaders submit the final group answer</li>
        </ul>
      </div>
    </div>
  )
}
