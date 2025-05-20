'use client'

import { ErrorBoundary } from 'react-error-boundary'
import type { ReactNode } from 'react'

interface ErrorBoundaryWrapperProps {
  children: ReactNode
}

function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error
  resetErrorBoundary: () => void
}) {
  return (
    <div
      role="alert"
      className="p-4 bg-red-100 rounded text-red-700 max-w-md mx-auto mt-8"
    >
      <h2 className="font-bold text-lg mb-2">Something went wrong</h2>
      <pre className="mb-2 text-xs whitespace-pre-wrap break-all">
        {error.message}
      </pre>
      <button
        onClick={resetErrorBoundary}
        className="bg-blue-600 text-white px-4 py-2 rounded focus:outline-none focus:ring focus:ring-blue-300"
        aria-label="Try again"
      >
        Try again
      </button>
    </div>
  )
}

export function ErrorBoundaryWrapper({ children }: ErrorBoundaryWrapperProps) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={() => {
        // TODO: Integrate with error reporting service (e.g., Sentry)
        // console.error(error, info)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
