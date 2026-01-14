'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getGroupMessages } from '@/lib/actions/messages'
import { MessageMeta } from '@/types/database'

type MessageWithProfile = {
  id: string
  content: string
  user_id: string
  group_id: string
  round_id: string
  reply_to_message_id: string | null
  created_at: string
  meta: MessageMeta | null
  profiles: {
    id: string
    display_name: string
    student_number: string | null
  }
  parent_message?: {
    id: string
    content: string
    profiles: {
      display_name: string
    }
  } | null
}

export type { MessageWithProfile }

export function useRealtimeMessages(groupId: string, roundId: string) {
  const [messages, setMessages] = useState<MessageWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const fetchMessages = useCallback(async () => {
    setLoading(true)

    // Use server action to fetch messages (handles auth and RLS bypass for temp students)
    const result = await getGroupMessages(groupId, roundId)

    if (result.error) {
      console.error('[useRealtimeMessages] Error fetching messages:', result.error)
      setLoading(false)
      return
    }

    setMessages(result.data as MessageWithProfile[] || [])
    setLoading(false)
  }, [groupId, roundId])

  useEffect(() => {
    // Initial fetch
    fetchMessages()

    // Set up realtime subscription
    const channel = supabase
      .channel(`group:${groupId}:round:${roundId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const newMsg = payload.new as { id: string; user_id: string; round_id: string }

          // Only process if it's for the current round
          if (newMsg.round_id !== roundId) return

          // Refetch all messages via server action to get proper user info
          // This ensures consistency and handles both permanent and temp users
          await fetchMessages()
        }
      )
      .subscribe()

    // Polling fallback for message updates (every 3 seconds)
    // This ensures messages update even when realtime fails due to RLS policies
    const pollInterval = setInterval(() => {
      fetchMessages()
    }, 3000) // Poll every 3 seconds

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [groupId, roundId, supabase, fetchMessages])

  return { messages, loading, refetch: fetchMessages }
}
