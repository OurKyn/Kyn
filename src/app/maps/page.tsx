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
      if (err instanceof Error) setError(err.message)
      else setError('Failed to add pin')
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
      if (err instanceof Error) setError(err.message)
      else setError('Failed to update location')
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

  // Show markers for family pins
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
      })
      const info = new window.google.maps.InfoWindow({
        content: `<div><strong>${pin.title}</strong><br/>${pin.description || ''}</div>`,
      })
      marker.addListener('click', () => info.open(map, marker))
      return marker
    })
    return () => {
      pinMarkers.forEach((m) => m.setMap(null))
    }
  }, [map, pins])

  // Show markers for family members' locations
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

        // <img> is required here for Google Maps InfoWindow HTML, cannot use <Image />
        const info = new window.google.maps.InfoWindow({
          content: `<div style='min-width:120px;display:flex;align-items:center;gap:8px;'><img src='${m.profiles?.avatar_url || ''}' alt='' style='width:32px;height:32px;border-radius:50%;'/>${m.profiles?.full_name || 'Family Member'}</div>`,
        })
        marker.addListener('click', () => info.open(map, marker))
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
    <div className="max-w-2xl mx-auto py-8 w-full">
      <h1 className="text-2xl font-bold mb-4">Maps & Location</h1>
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
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
        >
          Search
        </button>
        <button
          type="button"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          onClick={handleMyLocation}
          disabled={searching}
        >
          My Location
        </button>
        <button
          type="button"
          className="bg-emerald-700 text-white px-4 py-2 rounded hover:bg-emerald-800 disabled:opacity-50"
          onClick={handleShareMyLocation}
          disabled={myLocationLoading}
        >
          Share My Location
        </button>
      </form>
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
      {/* Pin form modal */}
      {showPinForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
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
      <div className="mt-4">
        <h2 className="text-lg font-semibold mb-2">Family Pins</h2>
        {pinsLoading ? (
          <LoadingState message="Loading pins..." />
        ) : !pins || pins.length === 0 ? (
          <EmptyState message="No pins yet. Click the map to add one!" />
        ) : (
          <ul className="space-y-2">
            {pins.map((pin: FamilyPin) => (
              <li
                key={pin.id}
                className="border rounded p-3 bg-white dark:bg-brand-dark/70"
              >
                <div className="font-semibold">{pin.title}</div>
                <div className="text-sm text-gray-500">{pin.description}</div>
                <div className="text-xs text-gray-400">
                  Lat: {pin.lat}, Lng: {pin.lng}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
