'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LoadingState } from '@/components/loading-state'
import { EmptyState } from '@/components/empty-state'
import Image from 'next/image'

const OPENWEATHER_API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || ''

function fetchWeather(city: string) {
  return fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      city
    )}&units=metric&appid=${OPENWEATHER_API_KEY}`
  ).then((res) => {
    if (!res.ok) {
      throw new Error('City not found')
    }
    return res.json()
  })
}

export default function WeatherPage() {
  const [city, setCity] = useState('')
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const {
    data: weather,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['weather', city],
    queryFn: () => fetchWeather(city),
    enabled: !!city,
    retry: false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setCity(input.trim())
    setSubmitted(true)
    refetch()
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Weather Widget</h1>
      <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
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
          disabled={!input.trim()}
        >
          Get Weather
        </button>
      </form>
      {isLoading ? (
        <LoadingState message="Fetching weather..." />
      ) : error ? (
        <div className="text-red-500 mb-2">{(error as Error).message}</div>
      ) : weather ? (
        <div className="border rounded p-6 bg-white dark:bg-brand-dark/80 flex flex-col items-center gap-2">
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
              {Math.round(weather.main.temp)}°C
            </span>
          </div>
          <div className="capitalize text-lg mb-1">
            {weather.weather[0]?.description}
          </div>
          <div className="text-sm text-gray-500">
            Humidity: {weather.main.humidity}% | Wind: {weather.wind.speed} m/s
          </div>
        </div>
      ) : submitted ? (
        <EmptyState message="No weather data found. Try another city." />
      ) : (
        <EmptyState message="Enter a city to see the weather." />
      )}
    </div>
  )
}
