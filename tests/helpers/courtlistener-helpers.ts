/**
 * CourtListener test helpers
 */

import { vi } from 'vitest'
import {
  createSuccessFetchResponse,
  createErrorFetchResponse,
  createPaginatedResponse,
} from './test-utils'

/**
 * Setup CourtListener environment variables for tests
 */
export function setupCourtListenerEnv(): void {
  process.env.COURTLISTENER_API_KEY = 'test-api-key'
  process.env.COURTLISTENER_REQUEST_DELAY_MS = '100'
  process.env.COURTLISTENER_MAX_RETRIES = '3'
  process.env.COURTLISTENER_REQUEST_TIMEOUT_MS = '5000'
}

/**
 * Cleanup CourtListener environment variables after tests
 */
export function cleanupCourtListenerEnv(): void {
  delete process.env.COURTLISTENER_API_KEY
  delete process.env.COURTLISTENER_API_TOKEN
  delete process.env.COURTLISTENER_REQUEST_DELAY_MS
  delete process.env.COURTLISTENER_MAX_RETRIES
  delete process.env.COURTLISTENER_REQUEST_TIMEOUT_MS
}

/**
 * Create a mock fetch for successful judge list response
 */
export function mockSuccessfulJudgeListResponse(results: unknown[] = []): void {
  const fetchMock = vi.fn()
  fetchMock.mockResolvedValueOnce(
    createSuccessFetchResponse(createPaginatedResponse(results, results.length, null))
  )
  global.fetch = fetchMock
}

/**
 * Create a mock fetch for rate limit error (429)
 */
export function mockRateLimitResponse(retryAfter?: number | string): void {
  const headers = retryAfter ? { 'Retry-After': retryAfter.toString() } : undefined
  const fetchMock = vi.fn()
  fetchMock.mockResolvedValueOnce(createErrorFetchResponse(429, 'Rate limit exceeded', headers))
  global.fetch = fetchMock
}

/**
 * Create a mock fetch for server error (500)
 */
export function mockServerErrorResponse(): void {
  const fetchMock = vi.fn()
  fetchMock.mockResolvedValueOnce(createErrorFetchResponse(500, 'Internal Server Error'))
  global.fetch = fetchMock
}

/**
 * Create a mock fetch for not found error (404)
 */
export function mockNotFoundResponse(): void {
  const fetchMock = vi.fn()
  fetchMock.mockResolvedValueOnce(createErrorFetchResponse(404, 'Not Found'))
  global.fetch = fetchMock
}

/**
 * Get fetch mock call URL
 */
export function getFetchCallUrl(
  fetchMock: ReturnType<typeof vi.fn>,
  callIndex: number = 0
): string {
  const calls = fetchMock.mock.calls
  if (calls[callIndex]) {
    return calls[callIndex][0] as string
  }
  return ''
}

/**
 * Get fetch mock call headers
 */
export function getFetchCallHeaders(
  fetchMock: ReturnType<typeof vi.fn>,
  callIndex: number = 0
): Record<string, string> {
  const calls = fetchMock.mock.calls
  if (calls[callIndex] && calls[callIndex][1]) {
    const options = calls[callIndex][1] as RequestInit
    return (options.headers as Record<string, string>) || {}
  }
  return {}
}
