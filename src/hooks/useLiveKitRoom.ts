import { useEffect, useRef, useState } from 'react'
import { Room, RoomEvent, RemoteTrack, Track } from 'livekit-client'

interface UseLiveKitRoomProps {
  url: string
  token: string
}

export function useLiveKitRoom({ url, token }: UseLiveKitRoomProps) {
  const [room, setRoom] = useState<Room | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remoteTracks, setRemoteTracks] = useState<RemoteTrack[]>([])
  const localVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!url || !token) return

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    })

    setRoom(room)

    room
      .connect(url, token)
      .then(async () => {
        setConnected(true)
        await room.localParticipant.enableCameraAndMicrophone()
        // Attach local video
        const localTrack = room.localParticipant.getTrackPublication(
          Track.Source.Camera
        )?.videoTrack
        if (localTrack && localVideoRef.current) {
          localTrack.attach(localVideoRef.current)
        }
      })
      .catch((err) => {
        setError(err.message)
      })

    // Handle remote tracks
    const handleTrackSubscribed = (track: RemoteTrack) => {
      setRemoteTracks((prev) => [...prev, track])
    }
    const handleTrackUnsubscribed = (track: RemoteTrack) => {
      setRemoteTracks((prev) => prev.filter((t) => t !== track))
    }

    room
      .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      .on(RoomEvent.Disconnected, () => setConnected(false))

    return () => {
      room.disconnect()
      setConnected(false)
    }
  }, [url, token])

  return { room, connected, error, remoteTracks, localVideoRef }
}
