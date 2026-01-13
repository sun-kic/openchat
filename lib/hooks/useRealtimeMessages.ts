'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
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
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles!messages_user_id_fkey (
          id,
          display_name,
          student_number
        ),
        parent_message:messages!messages_reply_to_message_id_fkey (
          id,
          content,
          profiles!messages_user_id_fkey (
            display_name
          )
        )
      `)
      .eq('group_id', groupId)
      .eq('round_id', roundId)
      .order('created_at', { ascending: true })

    if (data && !error) {
      setMessages(data as unknown as MessageWithProfile[])
    }
    setLoading(false)
  }, [supabase, groupId, roundId])

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
          // Fetch the full message with profile data
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              profiles!messages_user_id_fkey (
                id,
                display_name,
                student_number
              ),
              parent_message:messages!messages_reply_to_message_id_fkey (
                id,
                content,
                profiles!messages_user_id_fkey (
                  display_name
                )
              )
            `)
            .eq('id', (payload.new as { id: string }).id)
            .single()

          if (data && (data as unknown as MessageWithProfile).round_id === roundId) {
            setMessages((current) => [...current, data as unknown as MessageWithProfile])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId, roundId, supabase, fetchMessages])

  return { messages, loading, refetch: fetchMessages }
}
