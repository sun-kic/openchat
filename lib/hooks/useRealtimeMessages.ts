'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Message } from '@/types'

export function useRealtimeMessages(groupId: string, roundId: string) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

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
              parent_message:reply_to (
                id,
                content,
                profiles!messages_user_id_fkey (
                  display_name
                )
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (data && data.round_id === roundId) {
            setMessages((current) => [...current, data])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId, roundId])

  const fetchMessages = async () => {
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
        parent_message:reply_to (
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
      setMessages(data)
    }
    setLoading(false)
  }

  return { messages, loading, refetch: fetchMessages }
}
