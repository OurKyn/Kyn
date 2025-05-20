'use client'

import { useFamilyMembers } from '@/hooks/useFamily'
import { useFamilyContext } from '@/context/family-context'
import { useMessages } from '@/hooks/useMessages'
import { LoadingState } from '@/components/loading-state'
import { EmptyState } from '@/components/empty-state'
import Image from 'next/image'
import { useState } from 'react'

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
  const filteredMembers = members.filter(
    (m) =>
      (m.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.email || '').toLowerCase().includes(search.toLowerCase())
  )

  const canSend =
    !!selectedFamilyId && !!recipientId && !!messageInput.trim() && !sending

  return (
    <div className="max-w-2xl mx-auto py-8">
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
        <div className="border rounded-lg p-4 bg-white dark:bg-brand-dark/40 shadow">
          <h2 className="text-lg font-semibold mb-2">Conversation</h2>
          {loading ? (
            <LoadingState message="Loading messages..." />
          ) : error ? (
            <div className="text-red-500 mb-2">
              {error.message || error.toString()}
            </div>
          ) : messages?.length === 0 ? (
            <EmptyState message="No messages yet. Say hello!" />
          ) : (
            <ul className="space-y-3 max-h-64 overflow-y-auto mb-4">
              {messages.map(
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
                }) => (
                  <li key={msg.id} className="flex items-center gap-2">
                    {msg.senderProfile?.avatar_url && (
                      <Image
                        src={msg.senderProfile.avatar_url}
                        alt=""
                        width={28}
                        height={28}
                        className="w-7 h-7 rounded-full"
                      />
                    )}
                    <span className="font-semibold text-sm">
                      {msg.senderProfile?.full_name || 'Unknown'}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      {new Date(msg.created_at).toLocaleString()}
                    </span>
                    <span className="ml-2 text-sm">{msg.content}</span>
                  </li>
                )
              )}
            </ul>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (canSend) sendMessage()
            }}
            className="flex gap-2"
          >
            <label htmlFor="message-input" className="sr-only">
              Type a message
            </label>
            <input
              id="message-input"
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring focus:border-blue-300"
              placeholder="Type a message..."
              disabled={sending || !selectedFamilyId}
              autoComplete="off"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={!canSend}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
