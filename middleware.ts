import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
// IMPORTANT: Edge runtime cannot use Node-only libraries (Supabase service role, etc.)
// We must not import code that references Node APIs from middleware.
import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'
import { handleJudgeRedirects } from '@/lib/middleware/judge-redirects'
import { createSecurityConfig, getSecurityHeaders, getCacheHeaders } from '@/lib/security/headers'

// Edge-safe logging (Edge runtime doesn't support all Node.js APIs)
const edgeLogger = {
  error: (msg: string, data?: any, err?: Error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[middleware] ${msg}`, data, err)
    }
  },
  warn: (msg: string, data?: any, err?: Error) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[middleware] ${msg}`, data, err)
    }
  },
}

const isProtectedRoute = createRouteMatcher([
  '/profile(.*)',
  '/settings(.*)',
  '/dashboard(.*)',
  '/welcome(.*)',
  '/ads/buy', // NEW: require sign-in to view purchase page
  '/api/checkout(.*)', // NEW: protect all checkout API routes
  '/api/billing(.*)', // NEW: protect billing routes
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
  edgeLogger.error('CRITICAL: Clerk authentication keys are required in production')
  throw new Error(
    'CRITICAL SECURITY ERROR: Clerk authentication keys are missing or invalid in production. ' +
      'Protected routes cannot be secured without valid authentication credentials. ' +
      'Please configure NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY.'
  )
}

// In development, allow running without auth but log a clear warning
if (!hasValidClerkKeys && isDevelopment) {
  edgeLogger.warn('Running in INSECURE MODE: Clerk keys not configured', {
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
          // Do NOT attempt Supabase/service role user mapping here (Edge runtime)
        }

        if (isAdminRoute(request)) {
          await auth.protect()
          // Edge runtime: skip Supabase/service role user mapping and MFA checks here.
          // MFA enforcement is handled in server-side admin routes.
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
          edgeLogger.error(
            'CRITICAL: Clerk middleware failed in production',
            undefined,
            error as Error
          )
          throw error
        }

        // In development, log warning and allow fallback
        edgeLogger.warn(
          'Clerk middleware failed in development; falling back to base handler',
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
