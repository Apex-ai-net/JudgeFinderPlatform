'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import Link from 'next/link'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

interface ErrorPayload {
  message: string
  stack?: string
  componentStack?: string | null
  url?: string
  userAgent?: string
  timestamp: string
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    })

    // Log error to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo)
    }
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    // In production, avoid sending stack traces to external services to prevent leaking sensitive info
    const errorData: ErrorPayload = {
      message: error.message,
      timestamp: new Date().toISOString(),
    }
    if (process.env.NODE_ENV !== 'production') {
      // Non-production environments can include stack traces for debugging
      errorData.stack = error.stack
      errorData.componentStack = errorInfo.componentStack
    }

    // Only access browser APIs if available (client-side only)
    if (typeof window !== 'undefined') {
      errorData.url = window.location.href
    }

    if (typeof navigator !== 'undefined') {
      errorData.userAgent = navigator.userAgent
    }

    // For now, send to console in a structured format
    if (process.env.NODE_ENV !== 'production') {
      console.error('🚨 Application Error:', errorData)
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-muted flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
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

            <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>

            <p className="text-muted-foreground mb-6">
              We're sorry, but an unexpected error occurred. Please try refreshing the page or
              contact support if the problem persists.
            </p>

            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full bg-muted text-foreground px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
              >
                Refresh Page
              </button>

              <Link
                href="/"
                className="block w-full bg-muted text-foreground px-4 py-2 rounded-md hover:bg-muted transition-colors"
              >
                Return Home
              </Link>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  Error Details (Development)
                </summary>
                <div className="mt-2 p-3 bg-muted rounded text-xs font-mono overflow-auto max-h-40">
                  <div className="text-red-600 font-semibold">{this.state.error.message}</div>
                  <pre className="mt-2 text-foreground whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
