/**
 * JudgeFinder API Middleware System
 *
 * A composable middleware system for Next.js API routes that eliminates
 * boilerplate and provides consistent patterns for:
 * - Rate limiting
 * - Error handling
 * - Response caching
 * - Standardized responses
 *
 * @example Basic Usage
 * ```typescript
 * import { compose, withRateLimit, withErrorHandling } from '@/lib/api'
 *
 * export const GET = compose(
 *   withRateLimit({ tokens: 40 }),
 *   withErrorHandling()
 * )(async (req, ctx) => {
 *   // Your clean handler logic here
 *   return NextResponse.json({ data: 'success' })
 * })
 * ```
 *
 * @example Advanced Usage with Caching and Custom Responses
 * ```typescript
 * import {
 *   compose,
 *   withRateLimit,
 *   withCache,
 *   withErrorHandling,
 *   success,
 *   getPaginationParams
 * } from '@/lib/api'
 *
 * export const GET = compose(
 *   withRateLimit({ tokens: 100, prefix: 'api:judges' }),
 *   withCache({ ttl: 300 }),
 *   withErrorHandling()
 * )(async (req, ctx) => {
 *   const { page, limit, offset } = getPaginationParams(req)
 *   const judges = await fetchJudges({ limit, offset })
 *
 *   return success(judges, {
 *     meta: { cached: ctx.cachedData !== undefined }
 *   })
 * })
 * ```
 */

// Core middleware composition
export {
  compose,
  forMethods,
  withHeaders,
  withLogging,
  type RouteContext,
  type RouteHandler,
  type Middleware
} from './middleware'

// Rate limiting middleware
export {
  withRateLimit,
  withStrictRateLimit,
  withConservativeRateLimit,
  withGenerousRateLimit,
  RateLimitPresets
} from './with-rate-limit'

// Error handling middleware
export {
  withErrorHandling,
  withErrorHandlingVerbose,
  withErrorHandlingSilent,
  ApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError
} from './with-error-handling'

// Caching middleware
export {
  withCache,
  withShortCache,
  withMediumCache,
  withLongCache,
  withHourlyCache,
  CachePresets
} from './with-cache'

// Standardized response helpers
export {
  success,
  paginated,
  error,
  validationError,
  notFound,
  unauthorized,
  forbidden,
  conflict,
  rateLimitExceeded,
  created,
  noContent,
  redirect,
  getPaginationParams,
  getQueryParam,
  parseJsonBody,
  withStandardHeaders,
  type ApiResponse,
  type ApiErrorResponse,
  type PaginationParams
} from './responses'
