'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type PresenceState = {
  [userId: string]: {
    display_name: string
    online_at: string
  }[]
}

export function useRealtimePresence(
  groupId: string,
  currentUserId: string,
  displayName: string
) {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase.channel(`presence:group:${groupId}`, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state: PresenceState = channel.presenceState()
        const users = Object.keys(state)
        setOnlineUsers(users)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            display_name: displayName,
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [groupId, currentUserId, displayName])

  return { onlineUsers }
}
