'use client'

import { useFamilyMembers } from '@/hooks/useFamily'
import { useFamilyContext } from '@/context/family-context'
import { useMessages } from '@/hooks/useMessages'
import { LoadingState } from '@/components/loading-state'
import { EmptyState } from '@/components/empty-state'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'

export default function MessagesPage() {
  const { selectedFamilyId } = useFamilyContext()
  const {
    members,
    loading: membersLoading,
    error: membersError,
  } = useFamilyMembers(selectedFamilyId)
  const {
    messages,
    recipientId,
    setRecipientId,
    messageInput,
    setMessageInput,
    sendMessage,
    sending,
    loading,
    error,
  } = useMessages(selectedFamilyId)

  const [search, setSearch] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, recipientId])

  // Typing indicator (frontend only)
  useEffect(() => {
    if (!messageInput) return setIsTyping(false)
    setIsTyping(true)
    const timeout = setTimeout(() => setIsTyping(false), 1200)
    return () => clearTimeout(timeout)
  }, [messageInput])

  const filteredMembers = members.filter(
    (m) =>
      (m.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.email || '').toLowerCase().includes(search.toLowerCase())
  )

  const canSend =
    !!selectedFamilyId && !!recipientId && !!messageInput.trim() && !sending

  return (
    <div className="max-w-2xl mx-auto py-8 flex flex-col h-[80vh]">
      <h1 className="text-2xl font-bold mb-4">Direct Messages</h1>
      {membersLoading ? (
        <LoadingState message="Loading family members..." />
      ) : membersError ? (
        <div className="text-red-500 mb-2">{membersError}</div>
      ) : (
        <div className="mb-6">
          <label
            htmlFor="recipient-search"
            className="block text-sm font-medium mb-1"
          >
            Search family members
          </label>
          <input
            id="recipient-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded px-3 py-2 mb-2 text-sm focus:outline-none focus:ring focus:border-blue-300"
            placeholder="Type a name or email..."
            autoComplete="off"
            aria-label="Search family members"
          />
          <label htmlFor="recipient" className="block text-sm font-medium mb-1">
            Select a family member
          </label>
          <select
            id="recipient"
            value={recipientId || ''}
            onChange={(e) => setRecipientId(e.target.value)}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
            disabled={!selectedFamilyId || filteredMembers.length === 0}
            aria-label="Select family member"
          >
            <option value="" disabled>
              -- Choose a recipient --
            </option>
            {filteredMembers.length === 0 ? (
              <option value="" disabled>
                No members found
              </option>
            ) : (
              filteredMembers.map((m) => (
                <option key={m.profile_id} value={m.profile_id}>
                  {m.full_name || 'Unknown'}
                  {m.email ? ` (${m.email})` : ''}
                </option>
              ))
            )}
          </select>
        </div>
      )}
      {recipientId && (
        <div className="flex flex-col flex-1 border rounded-lg bg-white dark:bg-brand-dark/40 shadow overflow-hidden">
          <div
            className="flex-1 overflow-y-auto px-2 py-4"
            style={{ minHeight: 0 }}
          >
            {loading ? (
              <LoadingState message="Loading messages..." />
            ) : error ? (
              <div className="text-red-500 mb-2">
                {typeof error === 'object' &&
                error !== null &&
                'message' in error
                  ? error.message
                  : String(error)}
              </div>
            ) : messages?.length === 0 ? (
              <EmptyState message="No messages yet. Say hello!" />
            ) : (
              <ul className="space-y-2">
                {(messages || []).map(
                  (msg: {
                    id: string
                    senderProfile: {
                      full_name: string | null
                      avatar_url: string | null
                    }
                    recipientProfile: {
                      full_name: string | null
                      avatar_url: string | null
                    }
                    content: string
                    created_at: string
                  }) => {
                    const isMe =
                      msg.senderProfile?.avatar_url ===
                      members.find(
                        (m) => m.profile_id === msg.senderProfile?.avatar_url
                      )?.avatar_url
                    return (
                      <li
                        key={msg.id}
                        className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                        aria-label={isMe ? 'Sent message' : 'Received message'}
                      >
                        {!isMe && msg.senderProfile?.avatar_url && (
                          <Image
                            src={msg.senderProfile.avatar_url}
                            alt=""
                            width={28}
                            height={28}
                            className="w-7 h-7 rounded-full border"
                          />
                        )}
                        <div
                          className={`max-w-xs px-3 py-2 rounded-lg shadow text-sm ${
                            isMe
                              ? 'bg-blue-600 text-white rounded-br-none'
                              : 'bg-gray-100 dark:bg-brand-dark/60 text-gray-900 dark:text-gray-100 rounded-bl-none'
                          }`}
                        >
                          <div>{msg.content}</div>
                          <div className="text-xs text-gray-300 dark:text-gray-400 mt-1 text-right">
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                        {isMe && msg.senderProfile?.avatar_url && (
                          <Image
                            src={msg.senderProfile.avatar_url}
                            alt=""
                            width={28}
                            height={28}
                            className="w-7 h-7 rounded-full border"
                          />
                        )}
                      </li>
                    )
                  }
                )}
                <div ref={messagesEndRef} />
              </ul>
            )}
            {isTyping && (
              <div className="text-xs text-gray-400 mt-2">Typing...</div>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (canSend) sendMessage()
            }}
            className="flex gap-2 p-2 border-t bg-white dark:bg-brand-dark/60 sticky bottom-0"
            aria-label="Send message form"
          >
            <label htmlFor="message-input" className="sr-only">
              Type a message
            </label>
            <input
              id="message-input"
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              className="flex-1 border rounded px-2 py-2 text-sm focus:outline-none focus:ring focus:border-blue-300"
              placeholder="Type a message..."
              disabled={sending || !selectedFamilyId}
              autoComplete="off"
              aria-label="Message input"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (canSend) sendMessage()
                }
              }}
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={!canSend}
              aria-label="Send message"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
