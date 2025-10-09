import { NextResponse } from 'next/server'
import type { Middleware } from './middleware'
import { logger } from '@/lib/utils/logger'

/**
 * Configuration options for error handling middleware.
 */
interface ErrorHandlingConfig {
  /**
   * Whether to include error stack traces in responses.
   * Only applies in development mode for security.
   * @default false
   */
  includeStack?: boolean

  /**
   * Whether to log errors to the console/logging service.
   * @default true
   */
  logErrors?: boolean

  /**
   * Custom error handler function.
   * Allows you to customize error responses based on error type.
   * If not provided, uses default error handling logic.
   */
  onError?: (error: unknown, req: Request) => NextResponse | Promise<NextResponse>

  /**
   * Additional context to include in error logs.
   */
  logContext?: Record<string, any>
}

/**
 * Standard error types that the middleware recognizes and handles specially.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR')
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR')
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details)
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED')
    this.name = 'RateLimitError'
  }
}

/**
 * Error handling middleware that catches and standardizes all errors.
 *
 * Features:
 * - Catches all errors from downstream handlers
 * - Provides consistent error response format
 * - Logs errors with full context
 * - Handles known error types (ApiError subclasses)
 * - Sanitizes error messages in production
 * - Supports custom error handlers
 *
 * @example
 * ```typescript
 * // Basic usage
 * export const GET = compose(
 *   withRateLimit(),
 *   withErrorHandling()
 * )(async (req, ctx) => {
 *   // Any errors thrown here will be caught and handled
 *   throw new ValidationError('Invalid input')
 * })
 *
 * // With custom error handler
 * export const POST = compose(
 *   withErrorHandling({
 *     onError: async (error, req) => {
 *       if (error instanceof MyCustomError) {
 *         return NextResponse.json({ custom: true }, { status: 418 })
 *       }
 *       // Return null to use default handling
 *       return null
 *     }
 *   })
 * )(async (req, ctx) => {
 *   // Handler logic
 * })
 *
 * // Throw structured errors
 * export const PUT = compose(
 *   withErrorHandling()
 * )(async (req, ctx) => {
 *   const data = await req.json()
 *
 *   if (!data.email) {
 *     throw new ValidationError('Email is required', { field: 'email' })
 *   }
 *
 *   if (!ctx.user) {
 *     throw new AuthenticationError()
 *   }
 *
 *   if (!ctx.user.canEdit) {
 *     throw new AuthorizationError('Cannot edit this resource')
 *   }
 *
 *   // ... rest of handler
 * })
 * ```
 *
 * @param config - Error handling configuration options
 * @returns Middleware function that handles errors
 */
export function withErrorHandling(config?: ErrorHandlingConfig): Middleware {
  return (handler) => async (req, ctx) => {
    const isDevelopment = process.env.NODE_ENV === 'development'
    const shouldLog = config?.logErrors !== false

    try {
      // Execute the handler
      return await handler(req, ctx)
    } catch (error) {
      // Try custom error handler first
      if (config?.onError) {
        try {
          const customResponse = await config.onError(error, req)
          if (customResponse) {
            return customResponse
          }
        } catch (handlerError) {
          // If custom handler fails, fall through to default handling
          logger.error('Custom error handler failed', {
            scope: 'api_middleware',
            originalError: error,
            handlerError
          }, handlerError as Error)
        }
      }

      // Log the error
      if (shouldLog) {
        const { pathname } = new URL(req.url)
        logger.error('API route error', {
          scope: 'api_middleware',
          method: req.method,
          path: pathname,
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: isDevelopment ? error.stack : undefined
          } : error,
          ...config?.logContext
        }, error as Error)
      }

      // Handle known error types
      if (error instanceof ApiError) {
        return NextResponse.json(
          {
            error: error.message,
            code: error.code,
            ...(error.details && { details: error.details }),
            ...(isDevelopment && config?.includeStack && error.stack && { stack: error.stack })
          },
          { status: error.statusCode }
        )
      }

      // Handle Supabase errors
      if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
        const dbError = error as { code: string; message: string; details?: string; hint?: string }

        logger.error('Database error', {
          scope: 'api_middleware',
          code: dbError.code,
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint
        })

        // Don't expose database details in production
        return NextResponse.json(
          {
            error: isDevelopment ? dbError.message : 'Database error occurred',
            code: 'DATABASE_ERROR',
            ...(isDevelopment && {
              details: dbError.details,
              hint: dbError.hint
            })
          },
          { status: 500 }
        )
      }

      // Handle MFA required (special case from existing codebase)
      if (error instanceof Error && error.message === 'MFA_REQUIRED') {
        return NextResponse.json(
          { error: 'Multi-factor authentication required', code: 'MFA_REQUIRED' },
          { status: 403 }
        )
      }

      // Handle JSON parsing errors
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return NextResponse.json(
          { error: 'Invalid JSON in request body', code: 'INVALID_JSON' },
          { status: 400 }
        )
      }

      // Handle generic Error instances
      if (error instanceof Error) {
        return NextResponse.json(
          {
            error: isDevelopment ? error.message : 'Internal server error',
            code: 'INTERNAL_ERROR',
            ...(isDevelopment && config?.includeStack && error.stack && { stack: error.stack })
          },
          { status: 500 }
        )
      }

      // Handle unknown error types
      logger.error('Unknown error type', {
        scope: 'api_middleware',
        error,
        errorType: typeof error
      })

      return NextResponse.json(
        {
          error: 'Internal server error',
          code: 'UNKNOWN_ERROR'
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Convenience wrapper that enables stack traces in development.
 * Useful for debugging during development.
 */
export const withErrorHandlingVerbose = () =>
  withErrorHandling({ includeStack: true })

/**
 * Convenience wrapper that disables error logging.
 * Useful for routes where errors are expected and handled differently.
 */
export const withErrorHandlingSilent = () =>
  withErrorHandling({ logErrors: false })
