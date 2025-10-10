import { NextResponse } from 'next/server'

/**
 * Standard API response structure for successful responses.
 */
export interface ApiResponse<T = unknown> {
  /** Response data */
  data?: T
  /** Success message */
  message?: string
  /** Pagination metadata */
  pagination?: {
    page: number
    per_page: number
    total_count: number
    has_more: boolean
  }
  /** Additional metadata */
  meta?: Record<string, unknown>
}

/**
 * Standard API error response structure.
 */
export interface ApiErrorResponse {
  /** Error message */
  error: string
  /** Error code for programmatic handling */
  code?: string
  /** Additional error details */
  details?: unknown
  /** Field-level validation errors */
  fields?: Record<string, string[]>
}

/**
 * Pagination parameters extracted from request.
 */
export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

/**
 * Helper to create a successful JSON response with standard structure.
 *
 * @example
 * ```typescript
 * return success({ judges: [...] }, { message: 'Judges retrieved' })
 * ```
 */
export function success<T>(
  data: T,
  options?: {
    message?: string
    status?: number
    headers?: Record<string, string>
    meta?: Record<string, unknown>
  }
): NextResponse {
  const response: ApiResponse<T> = {
    data,
    ...(options?.message && { message: options.message }),
    ...(options?.meta && { meta: options.meta }),
  }

  const nextResponse = NextResponse.json(response, {
    status: options?.status ?? 200,
  })

  if (options?.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      nextResponse.headers.set(key, value)
    })
  }

  return nextResponse
}

/**
 * Helper to create a successful paginated response.
 *
 * @example
 * ```typescript
 * return paginated(judges, {
 *   page: 1,
 *   per_page: 20,
 *   total_count: 100,
 *   has_more: true
 * })
 * ```
 */
export function paginated<T>(
  data: T,
  pagination: {
    page: number
    per_page: number
    total_count: number
    has_more: boolean
  },
  options?: {
    message?: string
    status?: number
    headers?: Record<string, string>
    meta?: Record<string, unknown>
  }
): NextResponse {
  const response: ApiResponse<T> = {
    data,
    pagination,
    ...(options?.message && { message: options.message }),
    ...(options?.meta && { meta: options.meta }),
  }

  const nextResponse = NextResponse.json(response, {
    status: options?.status ?? 200,
  })

  if (options?.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      nextResponse.headers.set(key, value)
    })
  }

  return nextResponse
}

/**
 * Helper to create an error response.
 *
 * @example
 * ```typescript
 * return error('Not found', 404, 'NOT_FOUND')
 * ```
 */
export function error(
  message: string,
  status: number = 500,
  code?: string,
  details?: unknown
): NextResponse {
  const response: ApiErrorResponse = {
    error: message,
  }

  if (code) {
    response.code = code
  }
  if (details) {
    response.details = details
  }

  return NextResponse.json(response, { status })
}

/**
 * Helper to create a validation error response with field-level errors.
 *
 * @example
 * ```typescript
 * return validationError('Validation failed', {
 *   email: ['Email is required', 'Email must be valid'],
 *   password: ['Password must be at least 8 characters']
 * })
 * ```
 */
export function validationError(
  message: string = 'Validation failed',
  fields?: Record<string, string[]>,
  details?: unknown
): NextResponse {
  const response: ApiErrorResponse = {
    error: message,
    code: 'VALIDATION_ERROR',
  }

  if (fields) {
    response.fields = fields
  }
  if (details) {
    response.details = details
  }

  return NextResponse.json(response, { status: 400 })
}

/**
 * Helper to create a 404 Not Found response.
 *
 * @example
 * ```typescript
 * return notFound('Judge not found')
 * ```
 */
export function notFound(message: string = 'Resource not found'): NextResponse {
  return error(message, 404, 'NOT_FOUND')
}

/**
 * Helper to create a 401 Unauthorized response.
 *
 * @example
 * ```typescript
 * return unauthorized('Invalid credentials')
 * ```
 */
export function unauthorized(message: string = 'Authentication required'): NextResponse {
  return error(message, 401, 'UNAUTHORIZED')
}

/**
 * Helper to create a 403 Forbidden response.
 *
 * @example
 * ```typescript
 * return forbidden('Insufficient permissions')
 * ```
 */
export function forbidden(message: string = 'Forbidden'): NextResponse {
  return error(message, 403, 'FORBIDDEN')
}

/**
 * Helper to create a 409 Conflict response.
 *
 * @example
 * ```typescript
 * return conflict('Resource already exists')
 * ```
 */
export function conflict(message: string, details?: unknown): NextResponse {
  return error(message, 409, 'CONFLICT', details)
}

/**
 * Helper to create a 429 Rate Limit Exceeded response.
 *
 * @example
 * ```typescript
 * return rateLimitExceeded(60) // Retry after 60 seconds
 * ```
 */
export function rateLimitExceeded(retryAfter?: number): NextResponse {
  const response = NextResponse.json(
    {
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      ...(retryAfter && { retry_after: retryAfter }),
    },
    { status: 429 }
  )

  if (retryAfter) {
    response.headers.set('Retry-After', retryAfter.toString())
  }

  return response
}

/**
 * Helper to create a 201 Created response.
 *
 * @example
 * ```typescript
 * return created({ id: '123', name: 'Judge Smith' }, '/judges/123')
 * ```
 */
export function created<T>(data: T, location?: string): NextResponse {
  const response = NextResponse.json(
    { data, message: 'Resource created successfully' },
    { status: 201 }
  )

  if (location) {
    response.headers.set('Location', location)
  }

  return response
}

/**
 * Helper to create a 204 No Content response.
 *
 * @example
 * ```typescript
 * return noContent()
 * ```
 */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

/**
 * Extract pagination parameters from request query params.
 * Validates and clamps values to safe ranges.
 *
 * @example
 * ```typescript
 * const { page, limit, offset } = getPaginationParams(request, {
 *   defaultLimit: 20,
 *   maxLimit: 100
 * })
 * ```
 */
export function getPaginationParams(
  request: Request,
  options?: {
    defaultLimit?: number
    maxLimit?: number
    defaultPage?: number
  }
): PaginationParams {
  const { searchParams } = new URL(request.url)

  const defaultLimit = options?.defaultLimit ?? 20
  const maxLimit = options?.maxLimit ?? 100
  const defaultPage = options?.defaultPage ?? 1

  const page = Math.max(parseInt(searchParams.get('page') || String(defaultPage)), 1)

  const limit = Math.min(
    Math.max(parseInt(searchParams.get('limit') || String(defaultLimit)), 1),
    maxLimit
  )

  const offset = (page - 1) * limit

  return { page, limit, offset }
}

/**
 * Extract and validate query parameter.
 *
 * @example
 * ```typescript
 * const status = getQueryParam(request, 'status', { required: true })
 * const limit = getQueryParam(request, 'limit', { default: '20' })
 * ```
 */
export function getQueryParam(
  request: Request,
  name: string,
  options?: {
    required?: boolean
    default?: string
  }
): string | null {
  const { searchParams } = new URL(request.url)
  const value = searchParams.get(name)

  if (!value) {
    if (options?.required) {
      throw new Error(`Query parameter '${name}' is required`)
    }
    return options?.default ?? null
  }

  return value
}

/**
 * Parse JSON body from request with validation.
 *
 * @example
 * ```typescript
 * const body = await parseJsonBody(request, {
 *   required: ['email', 'name']
 * })
 * ```
 */
export async function parseJsonBody<T = unknown>(
  request: Request,
  options?: {
    required?: string[]
  }
): Promise<T> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    throw new Error('Invalid JSON in request body')
  }

  // Validate required fields
  if (options?.required) {
    const missing: string[] = []
    for (const field of options.required) {
      if (
        typeof body !== 'object' ||
        body === null ||
        !(field in (body as Record<string, unknown>)) ||
        (body as Record<string, unknown>)[field] === null ||
        (body as Record<string, unknown>)[field] === undefined
      ) {
        missing.push(field)
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`)
    }
  }

  return body as T
}

/**
 * Add standard response headers for better caching and performance.
 *
 * @example
 * ```typescript
 * const response = success({ data: '...' })
 * return withStandardHeaders(response, {
 *   cacheControl: 'public, max-age=300',
 *   vary: 'Accept-Encoding'
 * })
 * ```
 */
export function withStandardHeaders(
  response: NextResponse,
  options?: {
    cacheControl?: string
    vary?: string
    etag?: string
    cors?: boolean
  }
): NextResponse {
  if (options?.cacheControl) {
    response.headers.set('Cache-Control', options.cacheControl)
  }

  if (options?.vary) {
    response.headers.set('Vary', options.vary)
  }

  if (options?.etag) {
    response.headers.set('ETag', options.etag)
  }

  if (options?.cors) {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }

  return response
}

/**
 * Create a redirect response.
 *
 * @example
 * ```typescript
 * return redirect('/judges/new-slug', 301) // Permanent redirect
 * return redirect('/login', 302) // Temporary redirect
 * ```
 */
export function redirect(url: string, status: 301 | 302 | 303 | 307 | 308 = 302): NextResponse {
  return NextResponse.redirect(url, status)
}
