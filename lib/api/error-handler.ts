/**
 * API Error Handler
 *
 * Centralized error handling and response formatting for Next.js API routes.
 * Provides consistent error responses and logging across the application.
 *
 * @module lib/api/error-handler
 */

import { NextResponse } from 'next/server'
import { AppError } from '@/lib/errors/app-errors'
import { logger } from '@/lib/utils/logger'

/**
 * Handles errors in API routes and returns properly formatted NextResponse
 *
 * This function provides centralized error handling for all API routes:
 * - Converts AppError instances to structured JSON responses
 * - Logs errors based on their loggable flag
 * - Handles special cases like MFA_REQUIRED
 * - Provides safe error messages in production
 *
 * @param error - The error to handle (AppError, Error, or unknown)
 * @returns NextResponse with appropriate status code and error body
 *
 * @example
 * ```typescript
 * import { handleApiError } from '@/lib/api/error-handler'
 * import { NotFoundError } from '@/lib/errors/app-errors'
 *
 * export async function GET(request: Request) {
 *   try {
 *     const judge = await getJudge(id)
 *     if (!judge) {
 *       throw new NotFoundError('Judge not found')
 *     }
 *     return ApiResponse.success(judge)
 *   } catch (error) {
 *     return handleApiError(error)
 *   }
 * }
 * ```
 */
export function handleApiError(error: unknown): NextResponse {
  // Handle known AppError instances
  if (error instanceof AppError) {
    if (error.loggable) {
      logger.error(error.message, {
        errorType: error.name,
        statusCode: error.statusCode
      }, error.cause)
    }

    return NextResponse.json(
      error.toJSON(),
      { status: error.statusCode }
    )
  }

  // Handle MFA special case (legacy authentication flow)
  if (error instanceof Error && error.message === 'MFA_REQUIRED') {
    return NextResponse.json(
      { error: 'Multi-factor authentication required' },
      { status: 403 }
    )
  }

  // Handle unknown errors (fallback for unexpected errors)
  logger.error('Unexpected API error', undefined, error as Error)

  return NextResponse.json(
    {
      error: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR'
    },
    { status: 500 }
  )
}

/**
 * API Response Builders
 *
 * Provides convenience methods for building standardized API responses.
 * All methods return NextResponse instances with consistent structure.
 *
 * @example
 * ```typescript
 * // Success response (200)
 * return ApiResponse.success({ judge: data })
 *
 * // Created response (201)
 * return ApiResponse.created({ id: newJudge.id })
 *
 * // No content response (204)
 * return ApiResponse.noContent()
 * ```
 */
export class ApiResponse {
  /**
   * Creates a successful response with data
   *
   * @param data - Response payload
   * @param status - HTTP status code (default: 200)
   * @returns NextResponse with JSON body
   *
   * @example
   * ```typescript
   * const judges = await getJudges()
   * return ApiResponse.success(judges)
   * ```
   */
  static success<T>(data: T, status = 200) {
    return NextResponse.json({ data }, { status })
  }

  /**
   * Creates a resource creation response
   *
   * @param data - Created resource data
   * @returns NextResponse with 201 status
   *
   * @example
   * ```typescript
   * const newJudge = await createJudge(input)
   * return ApiResponse.created({ id: newJudge.id })
   * ```
   */
  static created<T>(data: T) {
    return NextResponse.json({ data }, { status: 201 })
  }

  /**
   * Creates a no-content response for successful operations without return data
   *
   * @returns NextResponse with 204 status and no body
   *
   * @example
   * ```typescript
   * await deleteJudge(id)
   * return ApiResponse.noContent()
   * ```
   */
  static noContent() {
    return new NextResponse(null, { status: 204 })
  }
}
