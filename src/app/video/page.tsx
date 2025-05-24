'use client'

import {
  ControlBar,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  RoomContext,
  Chat,
  useChat,
} from '@livekit/components-react'
import { Room, Track } from 'livekit-client'
import '@livekit/components-styles'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || ''

function useCurrentUserProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData?.user) {
        throw new Error('Not authenticated')
      }
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userData.user.id)
        .single()
      if (profileError || !profile) {
        throw new Error('Profile not found')
      }
      return { ...profile, email: userData.user.email }
    },
  })
}

export default function VideoPage() {
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useCurrentUserProfile()
  const [roomName, setRoomName] = useState('kyn-room')
  const [token, setToken] = useState('')
  const [room] = useState(
    () =>
      new Room({
        adaptiveStream: true,
        dynacast: true,
      })
  )
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-fill username from profile
  const username = profile?.full_name || profile?.email || 'kyn-user'
  const avatarUrl = profile?.avatar_url || '/icons/user-avatar.svg'

  useEffect(() => {
    let mounted = true
    if (!roomName || !username) {
      return
    }
    setConnecting(true)
    setError(null)
    fetch(
      `/api/token?room=${encodeURIComponent(roomName)}&username=${encodeURIComponent(username)}`
    )
      .then((res) => res.json())
      .then(async (data) => {
        if (!mounted) {
          return
        }
        if (data.token) {
          await room.connect(LIVEKIT_URL, data.token)
          setToken(data.token)
        } else {
          setError(data.error || 'Failed to get token')
        }
        setConnecting(false)
      })
      .catch((e) => {
        setError(e.message)
        setConnecting(false)
      })
    return () => {
      mounted = false
      room.disconnect()
    }
  }, [roomName, username, room])

  if (profileLoading) {
    return <div className="max-w-2xl mx-auto py-8">Loading profile...</div>
  }
  if (profileError) {
    return (
      <div className="max-w-2xl mx-auto py-8 text-red-500">
        {String(profileError)}
      </div>
    )
  }
  if (connecting) {
    return (
      <div className="max-w-2xl mx-auto py-8">Connecting to LiveKit...</div>
    )
  }
  if (error) {
    return <div className="max-w-2xl mx-auto py-8 text-red-500">{error}</div>
  }
  if (!token) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
          <Image src="/kyn-logo.svg" alt="Kyn" width={40} height={40} />
          Kyn Video Call
        </h1>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            const target = e.target as typeof e.target & {
              room: { value: string }
            }
            setRoomName(target.room.value)
          }}
        >
          <input
            name="room"
            className="w-full border rounded px-3 py-2"
            placeholder="Room name"
            defaultValue={roomName}
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Join Room
          </button>
        </form>
      </div>
    )
  }

  return (
    <RoomContext.Provider value={room}>
      <VideoRoomUI
        roomName={roomName}
        username={username}
        avatarUrl={avatarUrl}
      />
    </RoomContext.Provider>
  )
}

function VideoRoomUI({
  roomName,
  username,
  avatarUrl,
}: {
  roomName: string
  username: string
  avatarUrl: string
}) {
  // Hand raise state
  const [handRaised, setHandRaised] = useState(false)
  const { send, chatMessages } = useChat()
  const handleRaiseHand = () => {
    send(`HANDRAISE:${username}`)
    setHandRaised(true)
    setTimeout(() => setHandRaised(false), 3000)
  }
  const handRaiseNotices = chatMessages.filter(
    (msg) =>
      typeof msg.message === 'string' && msg.message.startsWith('HANDRAISE:')
  )

  return (
    <div
      data-lk-theme="default"
      className="h-[80vh] w-full max-w-5xl mx-auto rounded-lg overflow-hidden shadow-lg bg-white dark:bg-brand-dark/80 relative"
    >
      {/* Kyn custom header */}
      <div className="absolute top-0 left-0 w-full flex items-center gap-3 bg-gradient-to-r from-brand via-brand-accent to-brand-dark text-white px-6 py-3 z-10">
        <Image src="/kyn-logo.png" alt="Kyn" width={32} height={32} />
        <span className="font-bold text-lg">Kyn Video Room: {roomName}</span>
        <span className="ml-auto flex items-center gap-2">
          <Image
            src={avatarUrl}
            alt="avatar"
            width={28}
            height={28}
            className="rounded-full border"
          />
          <span className="font-semibold">{username}</span>
        </span>
      </div>
      {/* Hand raise notification */}
      {handRaiseNotices.length > 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-yellow-200 text-yellow-900 px-4 py-2 rounded shadow z-20 animate-bounce">
          {handRaiseNotices[handRaiseNotices.length - 1].message.replace(
            'HANDRAISE:',
            ''
          )}{' '}
          raised their hand ✋
        </div>
      )}
      <div className="pt-16 h-full flex flex-col">
        <MyVideoConference />
        <RoomAudioRenderer />
        <div className="flex flex-row w-full">
          <ControlBar className="flex-1" />
          <button
            onClick={handleRaiseHand}
            className={`ml-2 px-4 py-2 rounded bg-yellow-400 text-yellow-900 font-bold shadow hover:bg-yellow-300 transition ${handRaised ? 'animate-bounce' : ''}`}
            aria-label="Raise hand"
            disabled={handRaised}
          >
            ✋ Raise Hand
          </button>
        </div>
        <div className="flex-1 w-full bg-gray-50 dark:bg-brand-dark/60 p-2 overflow-y-auto">
          <Chat />
        </div>
      </div>
    </div>
  )
}

function MyVideoConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )
  return (
    <GridLayout
      tracks={tracks}
      style={{ height: 'calc(50vh - var(--lk-control-bar-height))' }}
    >
      <ParticipantTile />
    </GridLayout>
  )
}
