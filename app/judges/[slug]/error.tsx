'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to error tracking service
    console.error('Judge profile error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Error Gradient */}
      <div className="bg-gradient-to-br from-destructive/20 via-destructive/10 to-background px-4 py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        <div className="mx-auto max-w-7xl relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-destructive/20 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-destructive"
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
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Failed to Load Judge Profile
            </h1>
          </div>
        </div>
      </div>

      {/* Error Content */}
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="max-w-2xl mx-auto bg-card rounded-xl border border-border p-8 shadow-lg">
          <div className="text-center space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Unable to display judge information
              </h2>
              <p className="text-muted-foreground">
                {error.message || 'An unexpected error occurred while loading the judge profile'}
              </p>
            </div>

            {error.digest && (
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  Error ID: <code className="font-mono text-foreground">{error.digest}</code>
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button onClick={reset} size="lg">
                Try Again
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/judges">Browse All Judges</Link>
              </Button>
              <Button variant="ghost" size="lg" onClick={() => window.history.back()}>
                Go Back
              </Button>
            </div>

            <div className="pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">
                If this problem persists, you can:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 text-left max-w-md mx-auto">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Search for the judge using our search tool</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Browse judges by court or jurisdiction</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>
                    Contact support at{' '}
                    <a href="mailto:support@judgefinder.io" className="text-primary hover:underline">
                      support@judgefinder.io
                    </a>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
