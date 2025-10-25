'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { ReactNode, useEffect } from 'react'
import { ThemeProvider } from './ThemeProvider'

// Skip authentication during build to prevent errors
const SKIP_AUTH_BUILD = process.env.SKIP_AUTH_BUILD === 'true'

// Lazy load Sentry to avoid build-time issues
let Sentry: typeof import('@sentry/nextjs') | null = null

// Check if Sentry is properly configured
const isSentryAvailable = () => {
  return (
    typeof window !== 'undefined' &&
    Sentry !== null &&
    typeof Sentry.captureMessage === 'function' &&
    process.env.NEXT_PUBLIC_SENTRY_DSN
  )
}

// Lazy load Sentry only on client side
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  import('@sentry/nextjs')
    .then((module) => {
      Sentry = module
    })
    .catch(() => {
      // Sentry failed to load, continue without it
    })
}

export function Providers({ children }: { children: ReactNode }): JSX.Element {
  // Get the publishable key - Netlify will provide this at runtime
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ''

  // Check if we have a valid, non-placeholder key
  const hasValidKey =
    clerkPublishableKey &&
    clerkPublishableKey.startsWith('pk_') &&
    !clerkPublishableKey.includes('YOUR') &&
    !clerkPublishableKey.includes('CONFIGURE') &&
    !clerkPublishableKey.includes('dummy')

  // Check if we're in a browser environment
  const isClient = typeof window !== 'undefined'

  // During build or when auth is disabled, skip ClerkProvider
  const shouldUseClerk = !SKIP_AUTH_BUILD && hasValidKey

  // Log warning in production if no valid key (only on client)
  if (isClient && !hasValidKey && process.env.NODE_ENV === 'production') {
    console.warn('Clerk authentication not configured - running without auth')
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const hydrationPatterns = [
      /hydration failed/i,
      /did not match/i,
      /an error occurred during hydration/i,
      /hydration mismatch/i,
    ]

    const serializeArg = (arg: unknown) => {
      if (typeof arg === 'string') return arg
      if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg)
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`
      try {
        return JSON.stringify(arg)
      } catch (serializationError) {
        return String(arg)
      }
    }

    const originalError = console.error
    const seenFingerprints = new Set<string>()

    console.error = (...args: Parameters<typeof console.error>) => {
      if (args.length > 0 && typeof args[0] === 'string') {
        const message = args[0]
        if (hydrationPatterns.some((pattern) => pattern.test(message))) {
          const fingerprint = `${message}-${args.slice(1).map(serializeArg).join('|')}`

          if (!seenFingerprints.has(fingerprint)) {
            seenFingerprints.add(fingerprint)

            // Only capture if Sentry is available
            if (isSentryAvailable() && Sentry) {
              Sentry.captureMessage('hydration-bailout', {
                level: 'warning',
                tags: {
                  feature: 'hydration-monitor',
                },
                extra: {
                  message,
                  args: args.slice(1).map(serializeArg),
                  url: window.location.href,
                },
              })
            }
          }
        }
      }

      originalError(...args)
    }

    return () => {
      console.error = originalError
      seenFingerprints.clear()
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleViolation = (event: SecurityPolicyViolationEvent) => {
      // Only capture if Sentry is available
      if (isSentryAvailable() && Sentry) {
        Sentry.captureMessage('csp-violation', {
          level: 'warning',
          tags: {
            feature: 'csp-monitor',
            directive: event.effectiveDirective,
          },
          extra: {
            blockedURI: event.blockedURI,
            disposition: event.disposition,
            lineNumber: event.lineNumber,
            columnNumber: event.columnNumber,
            statusCode: event.statusCode,
            sample: event.sample,
            url: window.location.href,
          },
        })
      }
    }

    window.addEventListener('securitypolicyviolation', handleViolation)

    return () => {
      window.removeEventListener('securitypolicyviolation', handleViolation)
    }
  }, [])

  const content = (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      forcedTheme="dark"
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )

  // Always render the same structure on server and client
  if (shouldUseClerk) {
    return (
      <ClerkProvider
        publishableKey={clerkPublishableKey}
        signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in'}
        signUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up'}
        // Use new redirect props (fallbackRedirectUrl/forceRedirectUrl are handled at SignIn/SignUp usage sites)
      >
        {content}
      </ClerkProvider>
    )
  }

  // Fallback without ClerkProvider
  return content
}
