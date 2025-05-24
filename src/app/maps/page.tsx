'use client'

import { useEffect, useRef, useState } from 'react'
import { LoadingState } from '@/components/loading-state'
import { EmptyState } from '@/components/empty-state'
import { useFamilyContext } from '@/context/family-context'
import { createClient } from '@/utils/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import Image from 'next/image'
import clsx from 'clsx'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

const pinSchema = z.object({
  title: z.string().min(2, 'Title required'),
  description: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
})
type PinForm = z.infer<typeof pinSchema>

// Utility to load Google Maps JS API with async/defer and callback
function loadGoogleMapsApi(apiKey: string, callback: () => void) {
  if (typeof window === 'undefined') {
    return
  }
  if (window.google && window.google.maps) {
    callback()
    return
  }
  const existingScript = document.getElementById('google-maps-script')
  if (existingScript) {
    existingScript.addEventListener('load', callback)
    return
  }
  const script = document.createElement('script')
  script.id = 'google-maps-script'
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
  script.async = true
  script.defer = true
  script.onload = callback
  script.onerror = () => {
    // Optionally handle error
  }
  document.body.appendChild(script)
}

// Add these interfaces above the component
interface FamilyPin {
  id: string
  family_id: string
  title: string
  description?: string | null
  lat: number
  lng: number
  created_at: string
}

interface FamilyMemberLocation {
  id: string
  profile_id: string
  last_lat?: number | null
  last_lng?: number | null
  last_location_updated_at?: string | null
  profiles?: {
    full_name?: string | null
    avatar_url?: string | null
  }
}

export default function MapsPage() {
  const { selectedFamilyId } = useFamilyContext()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  )
  const [showPinForm, setShowPinForm] = useState(false)
  const [myLocationLoading, setMyLocationLoading] = useState(false)
  const [selectedPin, setSelectedPin] = useState<FamilyPin | null>(null)
  const [selectedMember, setSelectedMember] =
    useState<FamilyMemberLocation | null>(null)

  // Pin form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<PinForm>({
    resolver: zodResolver(pinSchema),
    defaultValues: { title: '', description: '', lat: 0, lng: 0 },
  })

  // Fetch family pins
  const { data: pins, isLoading: pinsLoading } = useQuery({
    queryKey: ['family_locations', selectedFamilyId],
    queryFn: async () => {
      if (!selectedFamilyId) {
        return []
      }
      const { data, error } = await supabase
        .from('family_locations')
        .select('*')
        .eq('family_id', selectedFamilyId)
        .order('created_at', { ascending: false })
      if (error) {
        throw new Error('Failed to fetch pins')
      }
      return data as FamilyPin[]
    },
    enabled: !!selectedFamilyId,
  })

  // Fetch family members' locations
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['family_members_locations', selectedFamilyId],
    queryFn: async () => {
      if (!selectedFamilyId) {
        return []
      }
      const { data, error } = await supabase
        .from('family_members')
        .select(
          'id, profile_id, last_lat, last_lng, last_location_updated_at, profiles(full_name, avatar_url)'
        )
        .eq('family_id', selectedFamilyId)
      if (error) {
        throw new Error('Failed to fetch member locations')
      }
      return data as FamilyMemberLocation[]
    },
    enabled: !!selectedFamilyId,
  })

  // Add new pin mutation
  const addPin = useMutation({
    mutationFn: async (values: PinForm) => {
      setError(null)
      if (!selectedFamilyId) {
        throw new Error('No family selected')
      }
      const { error: insertError } = await supabase
        .from('family_locations')
        .insert({
          family_id: selectedFamilyId,
          ...values,
        })
      if (insertError) {
        throw new Error('Failed to add pin')
      }
    },
    onSuccess: () => {
      reset()
      setShowPinForm(false)
      queryClient.invalidateQueries({
        queryKey: ['family_locations', selectedFamilyId],
      })
    },
    onError: (err: unknown) => {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to add pin')
      }
    },
  })

  // Update my live location mutation
  const updateMyLocation = useMutation({
    mutationFn: async (loc: { lat: number; lng: number }) => {
      setError(null)
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData?.user) {
        throw new Error('Not authenticated')
      }
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .single()
      if (profileError || !profile) {
        throw new Error('Profile not found')
      }
      const { error: updateError } = await supabase
        .from('family_members')
        .update({
          last_lat: loc.lat,
          last_lng: loc.lng,
          last_location_updated_at: new Date().toISOString(),
        })
        .eq('profile_id', profile.id)
        .eq('family_id', selectedFamilyId)
      if (updateError) {
        throw new Error('Failed to update location')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['family_members_locations', selectedFamilyId],
      })
    },
    onError: (err: unknown) => {
      if (err instanceof Error) {
        setError(err.message)
      } else setError('Failed to update location')
    },
  })

  // Replace previous Google Maps script loading and map initialization
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      return
    }
    setLoading(true)
    loadGoogleMapsApi(GOOGLE_MAPS_API_KEY, () => {
      setLoading(false)
    })
    // No cleanup needed for script
  }, [])

  useEffect(() => {
    if (!window.google || !window.google.maps || !mapRef.current || map) {
      return
    }
    const defaultCenter = { lat: 37.7749, lng: -122.4194 }
    const m = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 10,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    })
    setMap(m)
    setLocation(defaultCenter)
  }, [map, loading])

  // Show marker for current location
  useEffect(() => {
    if (!map || !location) {
      return
    }
    const marker = new window.google.maps.Marker({
      position: location,
      map,
      title: 'Selected Location',
      icon: {
        url: 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2.png',
        scaledSize: new window.google.maps.Size(32, 32),
      },
    })
    map.setCenter(location)
    return () => {
      marker.setMap(null)
    }
  }, [map, location])

  // Focus/center map on pin/member when selected
  useEffect(() => {
    if (!map) return
    if (selectedPin) {
      map.setCenter({ lat: selectedPin.lat, lng: selectedPin.lng })
      map.setZoom(15)
    } else if (
      selectedMember &&
      selectedMember.last_lat &&
      selectedMember.last_lng
    ) {
      map.setCenter({
        lat: selectedMember.last_lat,
        lng: selectedMember.last_lng,
      })
      map.setZoom(15)
    }
  }, [selectedPin, selectedMember, map])

  // Show markers for family pins (add click handler)
  useEffect(() => {
    if (!map || !pins) {
      return
    }
    const pinMarkers = pins.map((pin: FamilyPin) => {
      const marker = new window.google.maps.Marker({
        position: { lat: pin.lat, lng: pin.lng },
        map,
        title: pin.title,
        icon: {
          url: 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi-dotless2.png',
          scaledSize: new window.google.maps.Size(28, 28),
        },
        animation: window.google.maps.Animation.DROP,
      })
      marker.addListener('click', () => setSelectedPin(pin))
      return marker
    })
    return () => {
      pinMarkers.forEach((m) => m.setMap(null))
    }
  }, [map, pins])

  // Show markers for family members' locations (add click handler)
  useEffect(() => {
    if (!map || !members) {
      return
    }
    const memberMarkers = members
      .filter((m: FamilyMemberLocation) => m.last_lat && m.last_lng)
      .map((m: FamilyMemberLocation) => {
        const marker = new window.google.maps.Marker({
          position: { lat: m.last_lat as number, lng: m.last_lng as number },
          map,
          title: m.profiles?.full_name || 'Family Member',
          icon: {
            url:
              m.profiles?.avatar_url ||
              'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi.png',
            scaledSize: new window.google.maps.Size(36, 36),
          },
        })
        marker.addListener('click', () => setSelectedMember(m))
        return marker
      })
    return () => {
      memberMarkers.forEach((m) => m.setMap(null))
    }
  }, [map, members])

  // Allow adding a pin by clicking the map
  useEffect(() => {
    if (!map) {
      return
    }
    const listener = map.addListener(
      'click',
      (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) {
          return
        }
        setShowPinForm(true)
        setValue('lat', e.latLng.lat())
        setValue('lng', e.latLng.lng())
      }
    )
    return () => {
      window.google.maps.event.removeListener(listener)
    }
  }, [map, setValue])

  // Geolocation: show user's current location
  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      return
    }
    setSearching(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setSearching(false)
      },
      () => {
        setError('Unable to get your location')
        setSearching(false)
      }
    )
  }

  // Update my live location in DB
  const handleShareMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      return
    }
    setMyLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateMyLocation.mutate({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
        setMyLocationLoading(false)
      },
      () => {
        setError('Unable to get your location')
        setMyLocationLoading(false)
      }
    )
  }

  // Search for a place/address
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!search.trim() || !window.google || !window.google.maps) {
      return
    }
    setSearching(true)
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ address: search }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const loc = results[0].geometry.location
        setLocation({ lat: loc.lat(), lng: loc.lng() })
      } else {
        setError('Location not found')
      }
      setSearching(false)
    })
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <EmptyState message="Google Maps API key not set. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env file." />
    )
  }

  return (
    <div className="relative max-w-2xl mx-auto py-8 w-full">
      <h1 className="text-2xl font-bold mb-4">Maps & Location</h1>
      {/* Floating overlay card for controls */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/90 dark:bg-brand-dark/90 rounded-xl shadow-lg border p-4 flex flex-col sm:flex-row gap-2 items-center w-[95%] max-w-xl">
        <form
          onSubmit={handleSearch}
          className="flex gap-2 w-full"
          aria-label="Search location form"
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
            placeholder="Search for a place or address..."
            aria-label="Search location"
            disabled={searching}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={searching}
            aria-label="Search"
          >
            Search
          </button>
        </form>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="button"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            onClick={handleMyLocation}
            disabled={searching}
            aria-label="My Location"
          >
            My Location
          </button>
          <button
            type="button"
            className="bg-emerald-700 text-white px-4 py-2 rounded hover:bg-emerald-800 disabled:opacity-50"
            onClick={handleShareMyLocation}
            disabled={myLocationLoading}
            aria-label="Share My Location"
          >
            Share My Location
          </button>
        </div>
      </div>
      {/* Map container with overlay padding */}
      <div className="pt-28 pb-4">
        {loading || searching || pinsLoading || membersLoading ? (
          <LoadingState message="Loading map..." />
        ) : error ? (
          <div className="text-red-500 mb-2">{error}</div>
        ) : (
          <div
            ref={mapRef}
            className="w-full h-96 rounded border shadow mb-4"
            aria-label="Google Map"
          />
        )}
      </div>
      {/* Pin/member details card (animated) */}
      {(selectedPin || selectedMember) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 animate-fade-in">
          <div className="bg-white dark:bg-brand-dark/90 rounded-xl shadow-xl border p-6 max-w-md w-full flex flex-col gap-2">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl"
              onClick={() => {
                setSelectedPin(null)
                setSelectedMember(null)
              }}
              aria-label="Close details"
            >
              ×
            </button>
            {selectedPin && (
              <>
                <div className="font-bold text-lg mb-1">
                  {selectedPin.title}
                </div>
                <div className="text-sm text-gray-500 mb-1">
                  {selectedPin.description}
                </div>
                <div className="text-xs text-gray-400 mb-1">
                  Lat: {selectedPin.lat}, Lng: {selectedPin.lng}
                </div>
                <div className="text-xs text-gray-400">
                  Added: {new Date(selectedPin.created_at).toLocaleString()}
                </div>
              </>
            )}
            {selectedMember && (
              <>
                <div className="flex items-center gap-3 mb-2">
                  {selectedMember.profiles?.avatar_url ? (
                    <Image
                      src={selectedMember.profiles.avatar_url}
                      alt={selectedMember.profiles.full_name || 'Family Member'}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                      <svg
                        width="24"
                        height="24"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="currentColor"
                          d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"
                        />
                      </svg>
                    </div>
                  )}
                  <div>
                    <div className="font-semibold">
                      {selectedMember.profiles?.full_name || 'Family Member'}
                    </div>
                    <div className="text-xs text-gray-400">
                      Last updated:{' '}
                      {selectedMember.last_location_updated_at
                        ? new Date(
                            selectedMember.last_location_updated_at
                          ).toLocaleString()
                        : 'Unknown'}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  Lat: {selectedMember.last_lat}, Lng: {selectedMember.last_lng}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Pin form modal (unchanged) */}
      {showPinForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
          <form
            onSubmit={handleSubmit((values) => addPin.mutate(values))}
            className="bg-white dark:bg-brand-dark/90 rounded-lg p-6 shadow-lg max-w-sm w-full space-y-4"
            aria-label="Add Pin Form"
          >
            <h2 className="text-lg font-semibold mb-2">Add a Pin</h2>
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1">
                Title
              </label>
              <input
                id="title"
                type="text"
                {...register('title')}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
                disabled={isSubmitting}
              />
              {errors.title?.message && (
                <p className="text-red-500 text-xs mt-1">
                  {String(errors.title.message)}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                {...register('description')}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
                disabled={isSubmitting}
              />
              {errors.description?.message && (
                <p className="text-red-500 text-xs mt-1">
                  {String(errors.description.message)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={isSubmitting}
              >
                Add Pin
              </button>
              <button
                type="button"
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
                onClick={() => {
                  setShowPinForm(false)
                  reset()
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Family pins list (modern cards) */}
      <div className="mt-4">
        <h2 className="text-lg font-semibold mb-2">Family Pins</h2>
        {pinsLoading ? (
          <LoadingState message="Loading pins..." />
        ) : !pins || pins.length === 0 ? (
          <EmptyState message="No pins yet. Click the map to add one!" />
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pins.map((pin: FamilyPin) => (
              <button
                key={pin.id}
                type="button"
                className={clsx(
                  'text-left border rounded-lg p-4 bg-white dark:bg-brand-dark/70 shadow transition hover:shadow-lg focus:ring-2 focus:ring-blue-400 cursor-pointer',
                  selectedPin?.id === pin.id && 'ring-2 ring-blue-400'
                )}
                onClick={() => setSelectedPin(pin)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedPin(pin)
                }}
                aria-label={`Pin: ${pin.title}`}
              >
                <div className="font-semibold text-lg mb-1">{pin.title}</div>
                <div className="text-sm text-gray-500 mb-1">
                  {pin.description}
                </div>
                <div className="text-xs text-gray-400 mb-1">
                  Lat: {pin.lat}, Lng: {pin.lng}
                </div>
                <div className="text-xs text-gray-400">
                  Added: {new Date(pin.created_at).toLocaleString()}
                </div>
              </button>
            ))}
          </ul>
        )}
      </div>
      {/* Family members legend/list */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">
          Family Members Live Locations
        </h2>
        {membersLoading ? (
          <LoadingState message="Loading members..." />
        ) : !members || members.length === 0 ? (
          <EmptyState message="No live locations yet." />
        ) : (
          <ul className="flex flex-wrap gap-4">
            {members
              .filter((m) => m.last_lat && m.last_lng)
              .map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={clsx(
                    'flex items-center gap-2 border rounded-lg px-3 py-2 bg-white dark:bg-brand-dark/70 shadow cursor-pointer transition hover:shadow-lg focus:ring-2 focus:ring-blue-400',
                    selectedMember?.id === m.id && 'ring-2 ring-blue-400'
                  )}
                  onClick={() => setSelectedMember(m)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedMember(m)
                  }}
                  aria-label={`Member: ${m.profiles?.full_name || 'Family Member'}`}
                >
                  {m.profiles?.avatar_url ? (
                    <Image
                      src={m.profiles.avatar_url}
                      alt={m.profiles.full_name || 'Family Member'}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full border"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                      <svg
                        width="20"
                        height="20"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="currentColor"
                          d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"
                        />
                      </svg>
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-sm">
                      {m.profiles?.full_name || 'Family Member'}
                    </div>
                    <div className="text-xs text-gray-400">
                      Last updated:{' '}
                      {m.last_location_updated_at
                        ? new Date(m.last_location_updated_at).toLocaleString()
                        : 'Unknown'}
                    </div>
                  </div>
                </button>
              ))}
          </ul>
        )}
      </div>
    </div>
  )
}
