'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LoadingState } from '@/components/loading-state'
import { EmptyState } from '@/components/empty-state'
import Image from 'next/image'

const OPENWEATHER_API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || ''

interface WeatherData {
  name: string
  sys: { country: string; sunrise: number; sunset: number }
  weather: { icon: string; description: string }[]
  main: { temp: number; humidity: number; pressure: number }
  wind: { speed: number; deg: number }
  dt: number
}

interface ForecastItem {
  dt: number
  main: { temp_min: number; temp_max: number }
  weather: { icon: string; description: string }[]
  dt_txt: string
}

interface ForecastData {
  list: ForecastItem[]
}

function fetchWeather(city: string, units: string) {
  return fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      city
    )}&units=${units}&appid=${OPENWEATHER_API_KEY}`
  ).then((res) => {
    if (!res.ok) {
      throw new Error('City not found')
    }
    return res.json()
  })
}

function fetchWeatherByCoords(lat: number, lon: number, units: string) {
  return fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${units}&appid=${OPENWEATHER_API_KEY}`
  ).then((res) => {
    if (!res.ok) {
      throw new Error('Location not found')
    }
    return res.json()
  })
}

function fetchForecast(city: string, units: string) {
  return fetch(
    `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
      city
    )}&units=${units}&appid=${OPENWEATHER_API_KEY}`
  ).then((res) => {
    if (!res.ok) {
      throw new Error('Forecast not found')
    }
    return res.json()
  })
}

function fetchForecastByCoords(lat: number, lon: number, units: string) {
  return fetch(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${units}&appid=${OPENWEATHER_API_KEY}`
  ).then((res) => {
    if (!res.ok) {
      throw new Error('Forecast not found')
    }
    return res.json()
  })
}

function degToCompass(num: number) {
  const val = Math.floor(num / 22.5 + 0.5)
  const arr = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ]
  return arr[val % 16]
}

function formatTime(ts: number, tzOffset = 0) {
  return new Date((ts + tzOffset) * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function WeatherPage() {
  const [city, setCity] = useState('')
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric')
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    null
  )
  const [recent, setRecent] = useState<string[]>([])

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('kyn-weather-recent')
      if (stored) setRecent(JSON.parse(stored))
    }
  }, [])

  // Save recent searches
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kyn-weather-recent', JSON.stringify(recent))
    }
  }, [recent])

  // Weather query
  const {
    data: weather,
    isLoading,
    error,
    refetch,
  } = useQuery<WeatherData, Error>({
    queryKey: ['weather', city, units, coords],
    queryFn: () =>
      coords
        ? fetchWeatherByCoords(coords.lat, coords.lon, units)
        : fetchWeather(city, units),
    enabled: !!city || !!coords,
    retry: false,
  })

  // Forecast query
  const {
    data: forecast,
    isLoading: forecastLoading,
    error: forecastError,
    refetch: refetchForecast,
  } = useQuery<ForecastData, Error>({
    queryKey: ['forecast', city, units, coords],
    queryFn: () =>
      coords
        ? fetchForecastByCoords(coords.lat, coords.lon, units)
        : fetchForecast(city, units),
    enabled: (!!city || !!coords) && !!weather,
    retry: false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setCoords(null)
    setCity(input.trim())
    setSubmitted(true)
    if (input.trim() && !recent.includes(input.trim())) {
      setRecent((prev) => [input.trim(), ...prev.slice(0, 4)])
    }
    refetch()
    refetchForecast()
  }

  const handleUnitToggle = () => {
    setUnits((prev) => (prev === 'metric' ? 'imperial' : 'metric'))
  }

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setCity('')
        setInput('')
        setSubmitted(true)
        refetch()
        refetchForecast()
      },
      () => {
        alert('Unable to get your location')
      }
    )
  }

  const handleRecentClick = (c: string) => {
    setCoords(null)
    setCity(c)
    setInput(c)
    setSubmitted(true)
    refetch()
    refetchForecast()
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Weather Widget</h1>
      <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          placeholder="Enter city (e.g. London)"
          aria-label="City"
        />
        <button
          type="submit"
          className="bg-sky-500 text-white px-4 py-2 rounded hover:bg-sky-600 disabled:opacity-50"
          disabled={!input.trim() && !coords}
        >
          Get Weather
        </button>
        <button
          type="button"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          onClick={handleUseMyLocation}
        >
          Use My Location
        </button>
      </form>
      <div className="flex items-center gap-4 mb-4">
        <button
          type="button"
          className="text-xs px-2 py-1 rounded border border-blue-200 hover:bg-blue-50"
          onClick={handleUnitToggle}
        >
          {units === 'metric' ? 'Show °F' : 'Show °C'}
        </button>
        {recent.length > 0 && (
          <div className="flex gap-2 items-center text-xs">
            Recent:
            {recent.map((c) => (
              <button
                key={c}
                className="underline text-blue-600 hover:text-blue-800"
                onClick={() => handleRecentClick(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
      {isLoading ? (
        <LoadingState message="Fetching weather..." />
      ) : error ? (
        <div className="text-red-500 mb-2">{error.message}</div>
      ) : weather ? (
        <div className="border rounded p-6 bg-white dark:bg-brand-dark/80 flex flex-col items-center gap-2 w-full">
          <div className="text-2xl font-semibold mb-1">
            {weather.name}, {weather.sys.country}
          </div>
          <div className="flex items-center gap-3 mb-2">
            {weather.weather[0]?.icon && (
              <Image
                src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`}
                alt={weather.weather[0].description}
                width={64}
                height={64}
                priority={false}
              />
            )}
            <span className="text-4xl font-bold">
              {Math.round(weather.main.temp)}°{units === 'metric' ? 'C' : 'F'}
            </span>
          </div>
          <div className="capitalize text-lg mb-1">
            {weather.weather[0]?.description}
          </div>
          <div className="text-sm text-gray-500 mb-1">
            Humidity: {weather.main.humidity}% | Pressure:{' '}
            {weather.main.pressure} hPa
          </div>
          <div className="text-sm text-gray-500 mb-1">
            Wind: {weather.wind.speed} {units === 'metric' ? 'm/s' : 'mph'}{' '}
            {degToCompass(weather.wind.deg)}
          </div>
          <div className="text-sm text-gray-500 mb-1">
            Sunrise: {formatTime(weather.sys.sunrise)} | Sunset:{' '}
            {formatTime(weather.sys.sunset)}
          </div>
          <div className="text-xs text-gray-400 mb-2">
            Last updated: {formatTime(weather.dt)}
          </div>
          {/* Forecast */}
          {forecastLoading ? (
            <LoadingState message="Loading forecast..." />
          ) : forecastError ? (
            <div className="text-red-500 mb-2">{forecastError.message}</div>
          ) : forecast ? (
            <div className="w-full mt-4">
              <h3 className="font-semibold mb-2 text-center">5-Day Forecast</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {forecast.list
                  .filter((item) =>
                    // Show one forecast per day (at noon)
                    item.dt_txt.includes('12:00:00')
                  )
                  .slice(0, 5)
                  .map((item) => (
                    <div
                      key={item.dt}
                      className="flex flex-col items-center bg-blue-50 dark:bg-brand-dark/40 rounded p-2"
                    >
                      <div className="text-xs mb-1">
                        {new Date(item.dt * 1000).toLocaleDateString(
                          undefined,
                          {
                            weekday: 'short',
                          }
                        )}
                      </div>
                      {item.weather[0]?.icon && (
                        <Image
                          src={`https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`}
                          alt={item.weather[0].description}
                          width={40}
                          height={40}
                        />
                      )}
                      <div className="text-xs mt-1">
                        {Math.round(item.main.temp_min)}° /{' '}
                        {Math.round(item.main.temp_max)}°
                      </div>
                      <div className="text-xs capitalize">
                        {item.weather[0]?.description}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : submitted ? (
        <EmptyState message="No weather data found. Try another city." />
      ) : (
        <EmptyState message="Enter a city to see the weather." />
      )}
    </div>
  )
}
