'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw, Mail } from 'lucide-react'
import { logger } from '@/lib/utils/logger'
import { Button } from '@/components/ui/button'
import GlassCard from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

interface AnalyticsErrorBoundaryProps {
  children: ReactNode
  judgeName?: string
  judgeId?: string
  fallback?: ReactNode
  onReset?: () => void
}

interface AnalyticsErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error Boundary specifically designed for analytics display components.
 * Catches rendering errors in analytics visualizations and provides
 * a user-friendly fallback UI with retry options.
 */
export class AnalyticsErrorBoundary extends Component<
  AnalyticsErrorBoundaryProps,
  AnalyticsErrorBoundaryState
> {
  constructor(props: AnalyticsErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): AnalyticsErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Update state with error details
    this.setState({
      error,
      errorInfo,
    })

    // Log error to logging system
    logger.error(
      'Analytics display error',
      {
        component: 'AnalyticsErrorBoundary',
        judgeName: this.props.judgeName,
        judgeId: this.props.judgeId,
        errorMessage: error.message,
        errorStack: error.stack,
        componentStack: errorInfo.componentStack,
      },
      error
    )

    // In production, could send to external error tracking service
    if (process.env.NODE_ENV === 'production') {
      this.reportErrorToService(error, errorInfo)
    }
  }

  private reportErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Placeholder for external error reporting (e.g., Sentry, LogRocket)
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      judgeId: this.props.judgeId,
      judgeName: this.props.judgeName,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    }

    // Future: Send to error tracking service
    console.error('Analytics Error Report:', errorData)
  }

  private handleReset = () => {
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })

    // Call optional reset callback
    this.props.onReset?.()
  }

  private handleRefresh = () => {
    window.location.reload()
  }

  private handleContactSupport = () => {
    const subject = encodeURIComponent('Analytics Display Error')
    const body = encodeURIComponent(
      `I encountered an error while viewing analytics for Judge ${this.props.judgeName || 'Unknown'}.\n\n` +
        `Error: ${this.state.error?.message || 'Unknown error'}\n\n` +
        `Please help me resolve this issue.`
    )
    window.location.href = `mailto:support@judgefinder.io?subject=${subject}&body=${body}`
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <GlassCard className="p-6" hover={false}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-6"
          >
            {/* Error Icon */}
            <div className="flex justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="bg-red-100 dark:bg-red-900/20 rounded-full p-4"
              >
                <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
              </motion.div>
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Analytics Display Error</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {this.props.judgeName
                  ? `We encountered an issue loading the analytics for Judge ${this.props.judgeName}. This is usually temporary.`
                  : 'We encountered an issue loading the analytics. This is usually temporary.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Button
                onClick={this.handleReset}
                variant="default"
                size="sm"
                className="w-full sm:w-auto"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>

              <Button
                onClick={this.handleRefresh}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
              >
                Refresh Page
              </Button>

              <Button
                onClick={this.handleContactSupport}
                variant="ghost"
                size="sm"
                className="w-full sm:w-auto"
              >
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </div>

            {/* Developer Error Details */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors font-medium">
                  Error Details (Development Only)
                </summary>
                <div className="mt-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-red-900 dark:text-red-300 mb-1">
                      Error Message:
                    </div>
                    <div className="text-xs text-red-700 dark:text-red-400 font-mono">
                      {this.state.error.message}
                    </div>
                  </div>

                  {this.state.error.stack && (
                    <div>
                      <div className="text-xs font-semibold text-red-900 dark:text-red-300 mb-1">
                        Stack Trace:
                      </div>
                      <pre className="text-xs text-red-700 dark:text-red-400 font-mono overflow-auto max-h-40 whitespace-pre-wrap">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}

                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <div className="text-xs font-semibold text-red-900 dark:text-red-300 mb-1">
                        Component Stack:
                      </div>
                      <pre className="text-xs text-red-700 dark:text-red-400 font-mono overflow-auto max-h-40 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Help Text */}
            <p className="text-xs text-muted-foreground">
              If this problem persists, please contact our support team at{' '}
              <a href="mailto:support@judgefinder.io" className="text-primary hover:underline">
                support@judgefinder.io
              </a>
            </p>
          </motion.div>
        </GlassCard>
      )
    }

    return this.props.children
  }
}

/**
 * Hook for programmatic error handling in functional components
 */
export function useAnalyticsErrorHandler() {
  const handleError = React.useCallback((error: Error, context?: Record<string, any>) => {
    logger.error(
      'Analytics error handled programmatically',
      {
        component: 'useAnalyticsErrorHandler',
        errorMessage: error.message,
        ...context,
      },
      error
    )
  }, [])

  return { handleError }
}
