'use client'

import { ReactNode } from 'react'

interface LoadingStateProps {
  message?: string
  children?: ReactNode
}

export function LoadingState({
  message = 'Loading...',
  children,
}: LoadingStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 w-full"
      role="status"
      aria-live="polite"
    >
      <svg
        className="animate-spin h-10 w-10 text-blue-600 mb-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      <span className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
        {message}
      </span>
      {children}
    </div>
  )
}
