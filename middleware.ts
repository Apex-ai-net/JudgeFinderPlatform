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

const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
])

const clerkKeys = {
  publishable: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  secret: process.env.CLERK_SECRET_KEY
}

const isProduction = process.env.NODE_ENV === 'production'
const hasConfiguredClerkKeys = Boolean(
  clerkKeys.publishable &&
  clerkKeys.secret &&
  clerkKeys.publishable.startsWith('pk_') &&
  !clerkKeys.publishable.includes('YOUR_') &&
  !clerkKeys.publishable.includes('CONFIGURE')
)

// Do not hard fail production if Clerk keys are missing; fall back to public mode
// Authentication for protected/admin routes will be disabled when keys are not configured

const hasValidClerkKeys = hasConfiguredClerkKeys
  ? clerkKeys.publishable &&
    clerkKeys.secret &&
    clerkKeys.publishable.startsWith('pk_') &&
    !clerkKeys.publishable.includes('YOUR_') &&
    !clerkKeys.publishable.includes('CONFIGURE')
  : null

if (!hasValidClerkKeys) {
  logger.warn('[middleware] Clerk keys missing or invalid; authentication disabled for public routes', {
    publishableConfigured: Boolean(clerkKeys.publishable),
    environment: process.env.NODE_ENV
  })
}

// Only use Clerk middleware if keys are configured
const clerkWrappedHandler = hasValidClerkKeys
  ? clerkMiddleware(async (auth, request: NextRequest) => {
      const judgeRedirect = handleJudgeRedirects(request)
      if (judgeRedirect) {
        return judgeRedirect
      }

      if (isProtectedRoute(request)) {
        await auth.protect()
        // Best-effort user mapping; don't block response on failure
        try { await ensureCurrentAppUser() } catch {}
      }

      if (isAdminRoute(request)) {
        await auth.protect()
        // Ensure mapping for admins too
        try { await ensureCurrentAppUser() } catch {}
      }

      return baseMiddleware(request)
    }, {
      debug: process.env.NODE_ENV === 'development',
      clockSkewInMs: 10000
    })
  : null

const middlewareHandler = clerkWrappedHandler
  ? async (request: NextRequest, event: NextFetchEvent) => {
      try {
        return await clerkWrappedHandler(request, event)
      } catch (error) {
        logger.warn('[middleware] Clerk middleware failed; falling back to base handler', undefined, error as Error)
        return baseMiddleware(request)
      }
    }
  : async (request: NextRequest) => {
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

  // Centralized security headers (CSP/HSTS/etc.)
  const securityHeaders = getSecurityHeaders(createSecurityConfig())
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value)
  }

  // Cache control based on path
  const cacheHeaders = getCacheHeaders(request.nextUrl.pathname)
  for (const [key, value] of Object.entries(cacheHeaders)) {
    response.headers.set(key, value)
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
