'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Log the error for debugging
    console.error('Settings page error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  const handleSignIn = () => {
    router.push('/sign-in?redirect_url=/settings')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 p-8">
        <div className="text-center">
          {/* Error Icon */}
          <div className="w-16 h-16 mx-auto mb-6 bg-red-500/10 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          {/* Error Message */}
          <h2 className="text-2xl font-semibold text-white mb-3">Settings Unavailable</h2>

          <p className="text-muted-foreground mb-6">
            {error.message || 'An error occurred while loading your settings. Please try again.'}
          </p>

          {/* Development Error Details */}
          {process.env.NODE_ENV === 'development' && error.stack && (
            <details className="mb-6 text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-white mb-2">
                Error Details (Development Only)
              </summary>
              <pre className="text-xs bg-black/50 p-4 rounded overflow-auto max-h-48 text-red-400">
                {error.stack}
              </pre>
            </details>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={reset}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium px-6 py-3 rounded-lg transition-all shadow-lg"
            >
              Try Again
            </button>

            <button
              onClick={handleSignIn}
              className="w-full bg-card/50 border border-border hover:bg-card text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Sign In Again
            </button>

            <Link
              href="/"
              className="block w-full bg-muted-foreground/20 hover:bg-muted-foreground/30 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Return Home
            </Link>
          </div>

          {/* Help Text */}
          <p className="text-xs text-muted-foreground mt-6">
            If this problem persists, please contact support or try signing out and back in.
          </p>
        </div>
      </div>
    </div>
  )
}
