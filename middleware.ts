import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { ensureCurrentAppUser } from '@/lib/auth/user-mapping'
import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'
import { handleJudgeRedirects } from '@/lib/middleware/judge-redirects'
import { createSecurityConfig, getSecurityHeaders, getCacheHeaders } from '@/lib/security/headers'
import { logger } from '@/lib/utils/logger'

const isProtectedRoute = createRouteMatcher([
  '/profile(.*)',
  '/settings(.*)',
  '/dashboard(.*)',
  '/welcome(.*)',
])

const isAdminRoute = createRouteMatcher(['/admin(.*)'])

const clerkKeys = {
  publishable: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  secret: process.env.CLERK_SECRET_KEY,
}

const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = process.env.NODE_ENV === 'development'

const hasValidClerkKeys = Boolean(
  clerkKeys.publishable &&
    clerkKeys.secret &&
    clerkKeys.publishable.startsWith('pk_') &&
    !clerkKeys.publishable.includes('YOUR_') &&
    !clerkKeys.publishable.includes('CONFIGURE')
)

// SECURITY: Fail fast in production if Clerk keys are missing
// This prevents protected routes from accidentally becoming public
if (!hasValidClerkKeys && isProduction) {
  logger.error('[middleware] CRITICAL: Clerk authentication keys are required in production')
  throw new Error(
    'CRITICAL SECURITY ERROR: Clerk authentication keys are missing or invalid in production. ' +
      'Protected routes cannot be secured without valid authentication credentials. ' +
      'Please configure NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY.'
  )
}

// In development, allow running without auth but log a clear warning
if (!hasValidClerkKeys && isDevelopment) {
  logger.warn('[middleware] Running in INSECURE MODE: Clerk keys not configured', {
    publishableConfigured: Boolean(clerkKeys.publishable),
    message:
      'Protected routes will not require authentication. This is only acceptable in local development.',
  })
}

// Only use Clerk middleware if keys are configured
const clerkWrappedHandler = hasValidClerkKeys
  ? clerkMiddleware(
      async (auth, request: NextRequest) => {
        const judgeRedirect = handleJudgeRedirects(request)
        if (judgeRedirect) {
          return judgeRedirect
        }

        if (isProtectedRoute(request)) {
          await auth.protect()
          // Best-effort user mapping; don't block response on failure
          try {
            await ensureCurrentAppUser()
          } catch (error) {
            logger.warn(
              '[middleware] User mapping failed (non-blocking)',
              undefined,
              error as Error
            )
          }
        }

        if (isAdminRoute(request)) {
          await auth.protect()
          // Ensure mapping for admins too
          try {
            await ensureCurrentAppUser()

            // Check MFA requirement for admin routes (production only)
            if (process.env.NODE_ENV === 'production') {
              const { resolveAdminStatus } = await import('@/lib/auth/is-admin')
              const status = await resolveAdminStatus()

              // Redirect to MFA setup if required but not enabled
              if (status.isAdmin && status.requiresMFA && !status.hasMFA) {
                const mfaRequiredPath = '/admin/mfa-required'
                // Don't redirect if already on MFA required page
                if (request.nextUrl.pathname !== mfaRequiredPath) {
                  return NextResponse.redirect(new URL(mfaRequiredPath, request.url))
                }
              }
            }
          } catch (error) {
            logger.warn(
              '[middleware] Admin user mapping failed (non-blocking)',
              undefined,
              error as Error
            )
          }
        }

        return baseMiddleware(request)
      },
      {
        debug: process.env.NODE_ENV === 'development',
        clockSkewInMs: 10000,
      }
    )
  : null

const middlewareHandler = clerkWrappedHandler
  ? async (request: NextRequest, event: NextFetchEvent) => {
      try {
        return await clerkWrappedHandler(request, event)
      } catch (error) {
        // In production, authentication failures are critical
        if (isProduction) {
          logger.error(
            '[middleware] CRITICAL: Clerk middleware failed in production',
            undefined,
            error as Error
          )
          throw error
        }

        // In development, log warning and allow fallback
        logger.warn(
          '[middleware] Clerk middleware failed in development; falling back to base handler',
          undefined,
          error as Error
        )
        return baseMiddleware(request)
      }
    }
  : async (request: NextRequest) => {
      // This path only executes in development when Clerk keys are not configured
      // Production will have already failed fast above
      const judgeRedirect = handleJudgeRedirects(request)
      if (judgeRedirect) {
        return judgeRedirect
      }

      return baseMiddleware(request)
    }

export default function handler(request: NextRequest, event: NextFetchEvent) {
  return middlewareHandler(request, event)
}

function baseMiddleware(request: NextRequest) {
  const response = NextResponse.next()
  const config = createSecurityConfig()

  // Centralized security headers (CSP/HSTS/etc.)
  const securityHeaders = getSecurityHeaders(config)
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value as string)
  }

  // CRITICAL FIX: Apply CORS headers to all requests to allow same-origin API calls
  // This fixes the "Failed to fetch" error on Netlify deployments
  const origin = request.headers.get('origin')
  const requestUrl = new URL(request.url)

  // Allow requests from same origin (e.g., netlify.app calling its own API)
  if (origin && origin === requestUrl.origin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS')
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    )
    response.headers.set('Access-Control-Max-Age', '86400')
  }

  // Cache control based on path
  const cacheHeaders = getCacheHeaders(request.nextUrl.pathname)
  for (const [key, value] of Object.entries(cacheHeaders)) {
    response.headers.set(key, value as string)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * But include protected API routes
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
