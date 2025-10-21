/**
 * Test helpers for authentication and bot protection
 */

import { vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  TURNSTILE_TEST_TOKENS,
  TURNSTILE_API_RESPONSES,
  mockAuthenticatedUser,
  mockAnonymousUser,
} from '../fixtures/auth'

/**
 * Mock the Clerk auth module to return authenticated user
 */
export function mockAuthenticatedSession(userId: string = mockAuthenticatedUser.userId) {
  const { auth } = require('@clerk/nextjs/server')
  vi.mocked(auth).mockResolvedValue({
    userId,
    sessionId: mockAuthenticatedUser.sessionId,
    getToken: async () => 'mock-token',
  })
}

/**
 * Mock the Clerk auth module to return unauthenticated user
 */
export function mockUnauthenticatedSession() {
  const { auth } = require('@clerk/nextjs/server')
  vi.mocked(auth).mockResolvedValue({
    userId: null,
    sessionId: null,
    getToken: async () => null,
  })
}

/**
 * Mock global fetch for Turnstile API calls
 */
export function mockTurnstileAPI(shouldSucceed: boolean = true) {
  const response = shouldSucceed
    ? TURNSTILE_API_RESPONSES.success
    : TURNSTILE_API_RESPONSES.failure

  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => response,
  })
}

/**
 * Mock Turnstile API to return specific error
 */
export function mockTurnstileAPIError(errorCodes: string[]) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      success: false,
      'error-codes': errorCodes,
    }),
  })
}

/**
 * Mock Turnstile API to throw network error
 */
export function mockTurnstileAPINetworkError() {
  global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
}

/**
 * Mock rate limiter to allow requests
 */
export function mockRateLimiterAllow(remaining: number = 15) {
  return {
    limit: vi.fn().mockResolvedValue({
      success: true,
      remaining,
      reset: Date.now() + 3600000,
    }),
  }
}

/**
 * Mock rate limiter to block requests
 */
export function mockRateLimiterBlock(remaining: number = 0) {
  return {
    limit: vi.fn().mockResolvedValue({
      success: false,
      remaining,
      reset: Date.now() + 3600000,
    }),
  }
}

/**
 * Create a mock NextRequest with custom headers
 */
export function createMockRequest(
  url: string = 'http://localhost:3000/api/test',
  options: {
    method?: string
    body?: unknown
    headers?: Record<string, string>
  } = {}
): NextRequest {
  const { method = 'GET', body, headers = {} } = options

  const requestInit: RequestInit = {
    method,
    headers: new Headers(headers),
  }

  if (body) {
    requestInit.body = JSON.stringify(body)
    requestInit.headers = new Headers({
      ...headers,
      'Content-Type': 'application/json',
    })
  }

  return new NextRequest(url, requestInit)
}

/**
 * Create a mock NextRequest with IP address
 */
export function createMockRequestWithIP(
  url: string = 'http://localhost:3000/api/test',
  ip: string = '192.168.1.1',
  options: Parameters<typeof createMockRequest>[1] = {}
): NextRequest {
  return createMockRequest(url, {
    ...options,
    headers: {
      ...options.headers,
      'x-forwarded-for': ip,
    },
  })
}

/**
 * Extract JSON from NextResponse
 */
export async function extractJSON<T = unknown>(response: Response): Promise<T> {
  return (await response.json()) as T
}

/**
 * Extract headers from NextResponse as object
 */
export function extractHeaders(response: Response): Record<string, string> {
  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })
  return headers
}

/**
 * Mock Supabase client for user queries
 */
export function mockSupabaseUserQuery(userData: any | null) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: userData,
            error: userData ? null : { message: 'User not found' },
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: userData,
          error: null,
        }),
      }),
      insert: vi.fn().mockResolvedValue({
        data: userData,
        error: null,
      }),
    }),
  }
}

/**
 * Verify that rate limit headers are set correctly
 */
export function verifyRateLimitHeaders(
  headers: Record<string, string>,
  expectedLimit: string,
  expectedRemaining: string
) {
  if (headers['x-ratelimit-limit']) {
    expect(headers['x-ratelimit-limit']).toBe(expectedLimit)
  }
  if (headers['x-ratelimit-remaining']) {
    expect(headers['x-ratelimit-remaining']).toBe(expectedRemaining)
  }
  if (headers['x-ratelimit-reset']) {
    expect(parseInt(headers['x-ratelimit-reset'])).toBeGreaterThan(Date.now())
  }
}
