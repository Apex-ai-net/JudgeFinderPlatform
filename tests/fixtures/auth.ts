/**
 * Test fixtures for authentication and bot protection
 */

import { mockUsers } from './users'

// Cloudflare's official test Turnstile tokens
export const TURNSTILE_TEST_TOKENS = {
  ALWAYS_PASSES: '1x00000000000000000000AA',
  ALWAYS_BLOCKS: '2x00000000000000000000AB',
  FORCE_CHALLENGE: '3x00000000000000000000FF',
  VALID_TOKEN: 'valid-test-token-123',
  EXPIRED_TOKEN: 'expired-test-token',
  INVALID_TOKEN: 'invalid-test-token',
}

export const TURNSTILE_API_RESPONSES = {
  success: {
    success: true,
    challenge_ts: '2024-01-20T12:00:00.000Z',
    hostname: 'localhost',
    action: 'submit',
  },
  failure: {
    success: false,
    'error-codes': ['invalid-input-response'],
  },
  expired: {
    success: false,
    'error-codes': ['timeout-or-duplicate'],
  },
  missingSecret: {
    success: false,
    'error-codes': ['missing-input-secret'],
  },
}

// Mock authenticated users
export const mockAuthenticatedUser = {
  userId: 'user_2abc123def456',
  sessionId: 'sess_123456789',
  email: 'test@example.com',
}

export const mockAdvertiserUser = {
  userId: 'user_advertiser_789',
  sessionId: 'sess_advertiser_123',
  email: 'advertiser@lawfirm.com',
  barNumber: 'CA123456',
  barState: 'CA',
  user_role: 'advertiser' as const,
}

export const mockAnonymousUser = {
  userId: null,
  sessionId: null,
}

// Mock bar numbers for testing
export const VALID_BAR_NUMBERS = {
  california: 'CA123456',
  california2: 'CA654321',
  newYork: 'NY789012',
  texas: 'TX345678',
}

export const INVALID_BAR_NUMBERS = {
  tooShort: 'CA', // Only 2 characters
  tooLong: 'CA123456789012345678901234567890',
  invalidChars: 'CA!@#$%',
  empty: '',
  specialChars: 'CA<script>alert("xss")</script>',
}

// Mock rate limit scenarios
export const RATE_LIMIT_SCENARIOS = {
  withinLimit: {
    success: true,
    remaining: 15,
    reset: Date.now() + 3600000, // 1 hour from now
  },
  atLimit: {
    success: true,
    remaining: 0,
    reset: Date.now() + 3600000,
  },
  exceeded: {
    success: false,
    remaining: 0,
    reset: Date.now() + 3600000,
  },
  unlimited: {
    success: true,
    remaining: Number.POSITIVE_INFINITY,
    reset: Date.now() + 1000,
  },
}

// Mock chat messages for testing
export const MOCK_CHAT_MESSAGES = [
  {
    role: 'user' as const,
    content: 'Tell me about Judge Smith',
  },
  {
    role: 'assistant' as const,
    content: 'Judge Smith is a Superior Court judge...',
  },
  {
    role: 'user' as const,
    content: 'What are their bias scores?',
  },
]

// Mock judge search queries
export const SEARCH_QUERIES = {
  valid: 'judge smith',
  tooShort: 'j',
  specialChars: '<script>alert("xss")</script>',
  sqlInjection: "'; DROP TABLE judges; --",
  unicode: 'judge 判官 smith',
  empty: '',
}

// Client IP addresses for rate limiting tests
export const TEST_CLIENT_IPS = {
  home: '192.168.1.1',
  office: '10.0.0.1',
  mobile: '172.16.0.1',
  cloudflare: '103.21.244.0',
  unknown: 'unknown',
}

/**
 * Create a mock Clerk auth response
 */
export function createMockAuth(overrides: Partial<typeof mockAuthenticatedUser> = {}) {
  return {
    ...mockAuthenticatedUser,
    ...overrides,
    getToken: async () => 'mock-token',
  }
}

/**
 * Create a mock Turnstile verification response
 */
export function createMockTurnstileResponse(success: boolean) {
  return success ? TURNSTILE_API_RESPONSES.success : TURNSTILE_API_RESPONSES.failure
}

/**
 * Create a mock rate limit result
 */
export function createMockRateLimit(scenario: keyof typeof RATE_LIMIT_SCENARIOS) {
  return RATE_LIMIT_SCENARIOS[scenario]
}
