import { NextRequest, NextResponse } from 'next/server'

/**
 * Context object passed through the middleware chain.
 * Middlewares can add properties to share data with handlers and other middlewares.
 */
export interface RouteContext {
  /** Route parameters (e.g., dynamic route segments) */
  params?: Record<string, string>
  /** Remaining rate limit tokens after rate limit check */
  rateLimitRemaining?: number
  /** Rate limit reset timestamp */
  rateLimitReset?: number
  /** Cached response data (for cache middleware) */
  cachedData?: unknown
  /** Request start time for performance tracking */
  startTime?: number
  /** Custom context properties that middlewares can add */
  [key: string]: unknown
}

/**
 * A route handler that receives a request and context, returning a response.
 * This is the signature of both middleware-wrapped handlers and final route handlers.
 */
export type RouteHandler = (
  req: NextRequest,
  ctx: RouteContext
) => Promise<NextResponse> | NextResponse

/**
 * Middleware function that wraps a route handler with additional functionality.
 * Middlewares can:
 * - Execute code before the handler (e.g., authentication, rate limiting)
 * - Modify the request or context
 * - Short-circuit execution by returning early
 * - Execute code after the handler (e.g., logging, adding headers)
 * - Handle errors from the wrapped handler
 */
export type Middleware = (handler: RouteHandler) => RouteHandler

/**
 * Compose multiple middlewares into a single middleware function.
 * Middlewares are applied right-to-left, similar to function composition.
 *
 * Example:
 * ```typescript
 * const handler = compose(
 *   withRateLimit({ tokens: 40 }),
 *   withErrorHandling(),
 *   withCache({ ttl: 300 })
 * )(async (req, ctx) => {
 *   // Your route logic here
 *   return NextResponse.json({ data: 'success' })
 * })
 * ```
 *
 * Execution order:
 * 1. withRateLimit runs first (outermost)
 * 2. withErrorHandling runs second
 * 3. withCache runs third
 * 4. Your handler runs last (innermost)
 *
 * @param middlewares - Middleware functions to compose
 * @returns A single middleware that applies all provided middlewares
 */
export function compose(...middlewares: Middleware[]) {
  return (handler: RouteHandler): RouteHandler => {
    return middlewares.reduceRight((next, middleware) => middleware(next), handler)
  }
}

/**
 * Helper to create a middleware that only runs for specific HTTP methods.
 *
 * Example:
 * ```typescript
 * const handler = compose(
 *   forMethods(['POST', 'PUT'], withAuth()),
 *   withErrorHandling()
 * )(async (req, ctx) => {
 *   // Auth only enforced for POST and PUT
 * })
 * ```
 */
export function forMethods(methods: string[], middleware: Middleware): Middleware {
  return (handler) => async (req, ctx) => {
    if (methods.includes(req.method)) {
      return middleware(handler)(req, ctx)
    }
    return handler(req, ctx)
  }
}

/**
 * Helper to create a middleware that adds custom headers to responses.
 *
 * Example:
 * ```typescript
 * const handler = compose(
 *   withHeaders({
 *     'X-Custom-Header': 'value',
 *     'Cache-Control': 'public, max-age=300'
 *   })
 * )(async (req, ctx) => {
 *   return NextResponse.json({ data: 'success' })
 * })
 * ```
 */
export function withHeaders(headers: Record<string, string>): Middleware {
  return (handler) => async (req, ctx) => {
    const response = await handler(req, ctx)

    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }
}

/**
 * Helper to create a middleware that logs request/response details.
 *
 * Example:
 * ```typescript
 * const handler = compose(
 *   withLogging({ includeBody: true }),
 *   withErrorHandling()
 * )(async (req, ctx) => {
 *   return NextResponse.json({ data: 'success' })
 * })
 * ```
 */
export function withLogging(options?: { includeBody?: boolean }): Middleware {
  return (handler) => async (req, ctx) => {
    const startTime = Date.now()
    const { pathname } = new URL(req.url)

    console.log(`→ ${req.method} ${pathname}`)

    if (options?.includeBody && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      try {
        const body = await req.json()
        console.log('  Body:', JSON.stringify(body).slice(0, 200))
      } catch {
        // Body not JSON or already consumed
      }
    }

    const response = await handler(req, ctx)
    const duration = Date.now() - startTime

    console.log(`← ${req.method} ${pathname} ${response.status} (${duration}ms)`)

    return response
  }
}
