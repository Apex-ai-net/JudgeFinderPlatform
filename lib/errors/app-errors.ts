/**
 * Application Error Hierarchy
 *
 * Provides standardized error classes for consistent error handling across the application.
 * All custom errors extend AppError which provides structured error responses and logging context.
 *
 * @module lib/errors/app-errors
 */

/**
 * Base class for all application errors.
 * Provides common structure for error handling, logging, and serialization.
 *
 * @abstract
 * @extends Error
 */
export abstract class AppError extends Error {
  /**
   * HTTP status code associated with this error type
   */
  abstract statusCode: number

  /**
   * Whether this error should be logged for monitoring/debugging
   */
  abstract loggable: boolean

  /**
   * Creates a new AppError instance
   *
   * @param message - Human-readable error message
   * @param cause - Optional underlying error that caused this error
   */
  constructor(message: string, public cause?: Error) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * Serializes error to JSON format for API responses
   *
   * @returns Object containing error details, includes stack trace in development
   */
  toJSON() {
    return {
      error: this.message,
      code: this.name,
      ...(process.env.NODE_ENV === 'development' && {
        stack: this.stack,
        cause: this.cause
      })
    }
  }
}

/**
 * Validation Error (400 Bad Request)
 *
 * Used for invalid input data, malformed requests, or failed validation rules.
 * Not logged as these are expected client errors.
 *
 * @example
 * ```typescript
 * if (!email.includes('@')) {
 *   throw new ValidationError('Invalid email format', 'email')
 * }
 * ```
 */
export class ValidationError extends AppError {
  statusCode = 400
  loggable = false

  /**
   * Creates a new ValidationError
   *
   * @param message - Description of the validation failure
   * @param field - Optional field name that failed validation
   */
  constructor(message: string, public field?: string) {
    super(message)
  }

  toJSON() {
    return {
      ...super.toJSON(),
      ...(this.field && { field: this.field })
    }
  }
}

/**
 * Authentication Error (401 Unauthorized)
 *
 * Used when user is not authenticated or credentials are invalid.
 * Logged for security monitoring.
 *
 * @example
 * ```typescript
 * if (!session) {
 *   throw new AuthenticationError('Authentication required')
 * }
 * ```
 */
export class AuthenticationError extends AppError {
  statusCode = 401
  loggable = true
}

/**
 * Authorization Error (403 Forbidden)
 *
 * Used when user is authenticated but lacks permission for the requested resource.
 * Logged for security monitoring and audit trails.
 *
 * @example
 * ```typescript
 * if (user.role !== 'admin') {
 *   throw new AuthorizationError('Admin access required')
 * }
 * ```
 */
export class AuthorizationError extends AppError {
  statusCode = 403
  loggable = true
}

/**
 * Not Found Error (404 Not Found)
 *
 * Used when requested resource does not exist.
 * Not logged as these are expected client errors.
 *
 * @example
 * ```typescript
 * const judge = await getJudge(id)
 * if (!judge) {
 *   throw new NotFoundError('Judge not found')
 * }
 * ```
 */
export class NotFoundError extends AppError {
  statusCode = 404
  loggable = false
}

/**
 * Rate Limit Error (429 Too Many Requests)
 *
 * Used when client has exceeded rate limits.
 * Not logged as these are expected throttling events.
 *
 * @example
 * ```typescript
 * if (requestCount > limit) {
 *   throw new RateLimitError('Rate limit exceeded. Try again later.')
 * }
 * ```
 */
export class RateLimitError extends AppError {
  statusCode = 429
  loggable = false
}

/**
 * Database Error (500 Internal Server Error)
 *
 * Used for database operation failures, query errors, or connection issues.
 * Always logged for debugging and monitoring.
 *
 * @example
 * ```typescript
 * try {
 *   await supabase.from('judges').insert(data)
 * } catch (error) {
 *   throw new DatabaseError('Failed to insert judge record', error)
 * }
 * ```
 */
export class DatabaseError extends AppError {
  statusCode = 500
  loggable = true
}

/**
 * External API Error (502 Bad Gateway)
 *
 * Used when external service calls fail (AI providers, third-party APIs, etc).
 * Always logged for service monitoring and incident response.
 *
 * @example
 * ```typescript
 * try {
 *   const response = await openai.chat.completions.create(...)
 * } catch (error) {
 *   throw new ExternalAPIError('AI provider request failed', 'OpenAI', error)
 * }
 * ```
 */
export class ExternalAPIError extends AppError {
  statusCode = 502
  loggable = true

  /**
   * Creates a new ExternalAPIError
   *
   * @param message - Description of the failure
   * @param service - Name of the external service that failed
   * @param cause - Original error from the external service
   */
  constructor(message: string, public service: string, cause?: Error) {
    super(message, cause)
  }

  toJSON() {
    return {
      ...super.toJSON(),
      service: this.service
    }
  }
}
