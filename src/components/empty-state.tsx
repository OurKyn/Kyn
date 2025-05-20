'use client'

import { ReactNode } from 'react'

interface EmptyStateProps {
  message?: string
  icon?: ReactNode
  children?: ReactNode
}

export function EmptyState({
  message = 'Nothing here yet',
  icon,
  children,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 w-full"
      role="status"
      aria-live="polite"
    >
      {icon ?? (
        <svg
          className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )}
      <span className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
        {message}
      </span>
      {children}
    </div>
  )
}
