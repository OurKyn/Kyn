'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useFamilyContext } from '@/context/family-context'
import { createClient } from '@/utils/supabase/client'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { LoadingState } from '@/components/loading-state'
import { EmptyState } from '@/components/empty-state'

const eventSchema = z.object({
  title: z.string().min(2, 'Event title required'),
  description: z.string().optional(),
  location: z.string().optional(),
  eventDate: z.string().min(1, 'Event date required'),
})

type EventForm = z.infer<typeof eventSchema>

interface Event {
  id: string
  family_id: string
  title: string
  description: string | null
  location: string | null
  event_date: string
  created_at: string
}

interface RSVP {
  id: string
  event_id: string
  profile_id: string
  status: 'yes' | 'no' | 'maybe'
  created_at: string
}

export default function EventsPage() {
  const { selectedFamilyId } = useFamilyContext()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [rsvpStatus, setRsvpStatus] = useState<Record<string, RSVP['status']>>(
    {}
  )

  // Fetch events for the selected family
  const { data: events, isLoading } = useQuery({
    queryKey: ['events', selectedFamilyId],
    queryFn: async () => {
      if (!selectedFamilyId) return []
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('family_id', selectedFamilyId)
        .order('event_date', { ascending: true })
      if (error) throw new Error('Failed to fetch events')
      return data
    },
    enabled: !!selectedFamilyId,
  })

  // Fetch RSVPs for the current user
  const { data: myRsvps } = useQuery({
    queryKey: ['event_rsvps', selectedFamilyId],
    queryFn: async () => {
      if (!selectedFamilyId) return {}
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) return {}
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .single()
      if (!profile) return {}
      const { data, error } = await supabase
        .from('event_rsvps')
        .select('*')
        .in(
          'event_id',
          (events || []).map((e: Event) => e.id)
        )
        .eq('profile_id', profile.id)
      if (error) return {}
      const map: Record<string, RSVP['status']> = {}
      for (const rsvp of data || []) {
        map[rsvp.event_id] = rsvp.status
      }
      return map
    },
    enabled: !!selectedFamilyId && !!events && events.length > 0,
  })

  // Create event form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: { title: '', description: '', location: '', eventDate: '' },
  })

  const onCreate = async (values: EventForm) => {
    setError(null)
    if (!selectedFamilyId) {
      setError('No family selected')
      return
    }
    const { error: insertError } = await supabase.from('events').insert({
      family_id: selectedFamilyId,
      title: values.title,
      description: values.description || null,
      location: values.location || null,
      event_date: values.eventDate,
    })
    if (insertError) {
      setError('Failed to create event')
      return
    }
    reset()
    queryClient.invalidateQueries({ queryKey: ['events', selectedFamilyId] })
  }

  // RSVP mutation
  const rsvpMutation = useMutation({
    mutationFn: async ({
      eventId,
      status,
    }: {
      eventId: string
      status: RSVP['status']
    }) => {
      setError(null)
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) throw new Error('Not authenticated')
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .single()
      if (!profile) throw new Error('Profile not found')
      const { error: upsertError } = await supabase.from('event_rsvps').upsert(
        {
          event_id: eventId,
          profile_id: profile.id,
          status,
        },
        { onConflict: ['event_id', 'profile_id'] }
      )
      if (upsertError) throw new Error('Failed to RSVP')
      return status
    },
    onSuccess: (_data, variables) => {
      setRsvpStatus((prev) => ({
        ...prev,
        [variables.eventId]: variables.status,
      }))
      queryClient.invalidateQueries({
        queryKey: ['event_rsvps', selectedFamilyId],
      })
    },
    onError: (err: unknown) => {
      setError(
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Failed to RSVP'
      )
    },
  })

  const handleRsvp = (eventId: string, status: RSVP['status']) => {
    rsvpMutation.mutate({ eventId, status })
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Family Events</h1>
      <form onSubmit={handleSubmit(onCreate)} className="mb-6 space-y-2">
        <input
          {...register('title')}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          placeholder="Event title"
          disabled={isSubmitting}
        />
        {errors.title && (
          <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>
        )}
        <input
          {...register('description')}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          placeholder="Description (optional)"
          disabled={isSubmitting}
        />
        <input
          {...register('location')}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          placeholder="Location (optional)"
          disabled={isSubmitting}
        />
        <input
          {...register('eventDate')}
          type="datetime-local"
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          placeholder="Event date and time"
          disabled={isSubmitting}
        />
        {errors.eventDate && (
          <p className="text-red-500 text-xs mt-1">
            {errors.eventDate.message}
          </p>
        )}
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={isSubmitting}
        >
          Create Event
        </button>
        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
      </form>
      {isLoading ? (
        <LoadingState message="Loading events..." />
      ) : !events || events.length === 0 ? (
        <EmptyState message="No events yet. Create your first event!" />
      ) : (
        <div className="space-y-6">
          {(events || []).map((event: Event) => (
            <div
              key={event.id}
              className="border rounded p-4 bg-white dark:bg-brand-dark/80"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                <div>
                  <div className="font-semibold text-lg">{event.title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {event.location && <span>📍 {event.location} &nbsp;</span>}
                    {new Date(event.event_date).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2 mt-2 sm:mt-0">
                  {(['yes', 'maybe', 'no'] as RSVP['status'][]).map(
                    (status) => (
                      <button
                        key={status}
                        className={`px-3 py-1 rounded text-xs font-semibold border transition-colors ${((myRsvps && myRsvps[event.id]) || rsvpStatus[event.id]) === status ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-700'}`}
                        onClick={() => handleRsvp(event.id, status)}
                        disabled={rsvpMutation.isLoading}
                      >
                        {status === 'yes'
                          ? 'RSVP Yes'
                          : status === 'maybe'
                            ? 'Maybe'
                            : 'No'}
                      </button>
                    )
                  )}
                </div>
              </div>
              {event.description && (
                <div className="mb-2 text-sm">{event.description}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
