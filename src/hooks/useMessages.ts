import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

/**
 * useMessages hook for direct messaging between two users in a family.
 * @param familyId The current family ID (required)
 * @param initialRecipientId The recipient's profile ID (optional)
 */
export function useMessages(
  familyId: string | null,
  initialRecipientId?: string
) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [recipientId, setRecipientId] = useState<string | undefined>(
    initialRecipientId
  )
  const [messageInput, setMessageInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get user
  const userQuery = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data?.user) {
        throw new Error('Not authenticated')
      }
      return data.user
    },
  })
  const user = userQuery.data

  // Get profile for current user
  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) {
        throw new Error('Not authenticated')
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (error || !data) {
        throw new Error('Profile not found')
      }
      return data
    },
    enabled: !!user,
  })
  const profile = profileQuery.data

  // Fetch messages between current user and recipient in the current family
  const messagesQuery = useQuery({
    queryKey: ['messages', familyId, profile?.id, recipientId],
    queryFn: async () => {
      if (!profile?.id || !recipientId || !familyId) {
        return []
      }
      const { data, error } = await supabase
        .from('messages')
        .select(
          `*,
          senderProfile:profiles!messages_sender_id_fkey(full_name, avatar_url),
          recipientProfile:profiles!messages_recipient_id_fkey(full_name, avatar_url)
        `
        )
        .or(
          `and(sender_id.eq.${profile.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${profile.id})`
        )
        .eq('family_id', familyId)
        .order('created_at', { ascending: true })
      if (error) {
        throw new Error('Failed to fetch messages')
      }
      return data
    },
    enabled: !!profile?.id && !!recipientId && !!familyId,
  })
  const messages = messagesQuery.data

  // Send a message
  const sendMessage = async () => {
    setError(null)
    setSending(true)
    if (!profile?.id || !recipientId || !familyId) {
      setError('Missing sender, recipient, or family')
      setSending(false)
      return
    }
    const { error: sendError } = await supabase.from('messages').insert({
      sender_id: profile.id,
      recipient_id: recipientId,
      content: messageInput,
      family_id: familyId,
    })
    if (sendError) {
      setError('Failed to send message')
      setSending(false)
      return
    }
    setMessageInput('')
    setSending(false)
    queryClient.invalidateQueries({
      queryKey: ['messages', familyId, profile.id, recipientId],
    })
  }

  // Realtime subscription for new messages
  useEffect(() => {
    if (!profile?.id || !recipientId || !familyId) {
      return
    }
    const channel = supabase
      .channel(`messages_${familyId}_${profile.id}_${recipientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          // Only show toast if the new message is from another user
          if (
            payload.eventType === 'INSERT' &&
            payload.new.sender_id !== profile.id
          ) {
            toast('New message', {
              description: payload.new.content,
            })
          }
          queryClient.invalidateQueries({
            queryKey: ['messages', familyId, profile.id, recipientId],
          })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, familyId, profile?.id, recipientId, queryClient])

  return {
    loading:
      messagesQuery.isLoading || userQuery.isLoading || profileQuery.isLoading,
    error:
      error || messagesQuery.error || userQuery.error || profileQuery.error,
    messages,
    recipientId,
    setRecipientId,
    messageInput,
    setMessageInput,
    sendMessage,
    sending,
  }
}
