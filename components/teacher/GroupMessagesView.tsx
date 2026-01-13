'use client'

import { useState, useEffect } from 'react'
import { getGroupMessages } from '@/lib/actions/messages'

type Message = {
  id: string
  content: string
  user_id: string
  created_at: string
  meta: {
    keyword_hits?: string[]
    has_causality?: boolean
    has_example?: boolean
  } | null
  profiles: {
    display_name: string
  }
}

type Group = {
  id: string
  name: string
}

export default function GroupMessagesView({
  group,
  roundId,
}: {
  group: Group
  roundId: string
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    async function fetchMessages() {
      if (!roundId) return

      setLoading(true)
      const result = await getGroupMessages(group.id, roundId)
      if (result.data) {
        setMessages(result.data as Message[])
      }
      setLoading(false)
    }

    if (expanded) {
      fetchMessages()
    }
  }, [group.id, roundId, expanded])

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex justify-between items-center hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{group.name}</span>
          <span className="text-sm text-gray-500">
            ({messages.length} messages)
          </span>
        </div>
        <span className="text-gray-400">
          {expanded ? '▼' : '▶'}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-200 p-4 max-h-96 overflow-y-auto">
          {loading ? (
            <p className="text-gray-500 text-center py-4">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No messages yet</p>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 text-sm">
                      {msg.profiles?.display_name || 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{msg.content}</p>
                  {msg.meta && (
                    <div className="flex gap-2 flex-wrap">
                      {(msg.meta.keyword_hits?.length ?? 0) > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                          🔑 {msg.meta.keyword_hits?.length} keywords
                        </span>
                      )}
                      {msg.meta.has_causality && (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                          💡 Causality
                        </span>
                      )}
                      {msg.meta.has_example && (
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                          📝 Example
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
