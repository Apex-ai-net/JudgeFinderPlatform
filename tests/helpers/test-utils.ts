/**
 * Test utilities and helpers for reducing code duplication across test files
 */

import { vi } from 'vitest'

/**
 * Mock fetch response type for proper typing
 */
export interface MockFetchResponse {
  ok: boolean
  status: number
  json?: () => Promise<unknown>
  text?: () => Promise<string>
  headers: Headers
}

/**
 * Create a successful mock fetch response
 */
export function createSuccessFetchResponse<T>(data: T): MockFetchResponse {
  return {
    ok: true,
    status: 200,
    json: async () => data,
    headers: new Headers(),
  }
}

/**
 * Create an error mock fetch response
 */
export function createErrorFetchResponse(
  status: number,
  message: string,
  headers?: Record<string, string>
): MockFetchResponse {
  return {
    ok: false,
    status,
    text: async () => message,
    headers: new Headers(headers),
  }
}

/**
 * Create a paginated response for list endpoints
 */
export function createPaginatedResponse<T>(
  results: T[],
  count: number = results.length,
  next: string | null = null,
  previous: string | null = null
): { results: T[]; count: number; next: string | null; previous: string | null } {
  return {
    results,
    count,
    next,
    previous,
  }
}

/**
 * Wait for a specific amount of time (useful for rate limit tests)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Create a mock metrics reporter function
 */
export function createMockMetricsReporter(): ReturnType<typeof vi.fn> {
  return vi.fn((metricName: string, value: number, tags?: Record<string, string>) => {
    // Mock implementation - just track calls
  })
}

/**
 * Mock environment variables for a test
 */
export function mockEnv(vars: Record<string, string>): void {
  Object.entries(vars).forEach(([key, value]) => {
    process.env[key] = value
  })
}

/**
 * Restore environment variables after a test
 */
export function restoreEnv(vars: string[]): void {
  vars.forEach((key) => {
    delete process.env[key]
  })
}

/**
 * Type guard for error objects
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error
}

/**
 * Extract error message safely
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message
  }
  return String(error)
}

/**
 * Type-safe mock call extractor
 */
export interface MockCall<T extends unknown[] = unknown[]> {
  args: T
  returnValue?: unknown
}

export function getMockCalls<T extends unknown[]>(mockFn: ReturnType<typeof vi.fn>): MockCall<T>[] {
  return mockFn.mock.calls.map((args, index) => ({
    args: args as T,
    returnValue: mockFn.mock.results[index]?.value,
  }))
}

/**
 * Assert that a value is defined (type guard)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message ?? 'Expected value to be defined')
  }
}

/**
 * Create a date string in ISO format
 */
export function createISODate(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day).toISOString().split('T')[0]
}

/**
 * Create a timestamp in ISO format
 */
export function createISOTimestamp(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day).toISOString()
}

/**
 * Generate a random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Generate a random element from an array
 */
export function randomElement<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)]
}

/**
 * Type-safe JSON parse helper
 */
export function parseJSON<T>(json: string): T {
  return JSON.parse(json) as T
}
