/**
 * Integration tests for /api/chat route
 * Tests authentication, rate limiting, and Turnstile verification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/chat/route'
import {
  mockAuthenticatedSession,
  mockUnauthenticatedSession,
  mockTurnstileAPI,
  createMockRequest,
  extractJSON,
  extractHeaders,
  mockRateLimiterAllow,
  mockRateLimiterBlock,
} from '../../helpers/auth-helpers'
import { TURNSTILE_TEST_TOKENS, MOCK_CHAT_MESSAGES } from '../../fixtures/auth'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        limit: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
}))

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Test response' } }],
          usage: { total_tokens: 100 },
        }),
      },
    },
  })),
}))

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = 'test-openai-key'
    process.env.TURNSTILE_SECRET_KEY = '0xTEST_SECRET_KEY'
  })

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      mockUnauthenticatedSession()

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: { messages: MOCK_CHAT_MESSAGES, stream: false },
      })

      const response = await POST(request)
      const json = await extractJSON<{ error: string }>(response)

      expect(response.status).toBe(401)
      expect(json.error).toContain('Authentication required')
    })

    it('should accept authenticated requests', async () => {
      mockAuthenticatedSession()
      mockTurnstileAPI(true)

      // Mock rate limiter
      const mockRateLimiter = mockRateLimiterAllow()
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: MOCK_CHAT_MESSAGES,
          stream: false,
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce 20 messages per hour limit', async () => {
      mockAuthenticatedSession()

      // Mock rate limiter to block
      const mockRateLimiter = mockRateLimiterBlock(0)
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: { messages: MOCK_CHAT_MESSAGES, stream: false },
      })

      const response = await POST(request)
      const json = await extractJSON<{ error: string; remaining: number }>(response)

      expect(response.status).toBe(429)
      expect(json.error).toContain('Rate limit exceeded')
      expect(json.error).toContain('20 messages per hour')
    })

    it('should include rate limit headers when blocked', async () => {
      mockAuthenticatedSession()

      const mockRateLimiter = mockRateLimiterBlock(0)
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: { messages: MOCK_CHAT_MESSAGES, stream: false },
      })

      const response = await POST(request)
      const headers = extractHeaders(response)

      expect(headers['x-ratelimit-limit']).toBe('20')
      expect(headers['x-ratelimit-remaining']).toBe('0')
      expect(headers['x-ratelimit-reset']).toBeDefined()
    })

    it('should track remaining requests', async () => {
      mockAuthenticatedSession()
      mockTurnstileAPI(true)

      const mockRateLimiter = mockRateLimiterAllow(15)
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: MOCK_CHAT_MESSAGES,
          stream: false,
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockRateLimiter.limit).toHaveBeenCalled()
    })
  })

  describe('Turnstile Verification', () => {
    it('should verify Turnstile token when provided', async () => {
      mockAuthenticatedSession()
      mockTurnstileAPI(true)

      const mockRateLimiter = mockRateLimiterAllow()
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: MOCK_CHAT_MESSAGES,
          stream: false,
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.any(Object)
      )
    })

    it('should reject invalid Turnstile token', async () => {
      mockAuthenticatedSession()
      mockTurnstileAPI(false)

      const mockRateLimiter = mockRateLimiterAllow()
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: MOCK_CHAT_MESSAGES,
          stream: false,
          turnstileToken: TURNSTILE_TEST_TOKENS.INVALID_TOKEN,
        },
      })

      const response = await POST(request)
      const json = await extractJSON<{ error: string }>(response)

      expect(response.status).toBe(403)
      expect(json.error).toContain('CAPTCHA verification failed')
    })

    it('should allow request without Turnstile token (optional)', async () => {
      mockAuthenticatedSession()

      const mockRateLimiter = mockRateLimiterAllow()
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: { messages: MOCK_CHAT_MESSAGES, stream: false },
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Request Validation', () => {
    it('should require messages array', async () => {
      mockAuthenticatedSession()

      const mockRateLimiter = mockRateLimiterAllow()
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: { stream: false },
      })

      const response = await POST(request)
      const json = await extractJSON<{ error: string }>(response)

      expect(response.status).toBe(400)
      expect(json.error).toContain('Messages array is required')
    })

    it('should reject non-array messages', async () => {
      mockAuthenticatedSession()

      const mockRateLimiter = mockRateLimiterAllow()
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: { messages: 'not an array', stream: false },
      })

      const response = await POST(request)
      const json = await extractJSON<{ error: string }>(response)

      expect(response.status).toBe(400)
      expect(json.error).toContain('Messages array is required')
    })

    it('should handle missing OpenAI API key', async () => {
      mockAuthenticatedSession()
      delete process.env.OPENAI_API_KEY

      const mockRateLimiter = mockRateLimiterAllow()
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: { messages: MOCK_CHAT_MESSAGES, stream: false },
      })

      const response = await POST(request)
      const json = await extractJSON<{ error: string }>(response)

      expect(response.status).toBe(500)
      expect(json.error).toContain('OpenAI API key not configured')
    })
  })

  describe('Judge Context', () => {
    it('should accept judge_id parameter', async () => {
      mockAuthenticatedSession()
      mockTurnstileAPI(true)

      const mockRateLimiter = mockRateLimiterAllow()
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: MOCK_CHAT_MESSAGES,
          stream: false,
          judge_id: 'judge-123',
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should accept judge_slug parameter', async () => {
      mockAuthenticatedSession()
      mockTurnstileAPI(true)

      const mockRateLimiter = mockRateLimiterAllow()
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: MOCK_CHAT_MESSAGES,
          stream: false,
          judge_slug: 'judge-john-smith',
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Streaming vs Non-streaming', () => {
    it('should support non-streaming mode', async () => {
      mockAuthenticatedSession()
      mockTurnstileAPI(true)

      const mockRateLimiter = mockRateLimiterAllow()
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: MOCK_CHAT_MESSAGES,
          stream: false,
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      const response = await POST(request)
      const json = await extractJSON<{ message: string; usage: any }>(response)

      expect(response.status).toBe(200)
      expect(json.message).toBeDefined()
      expect(json.usage).toBeDefined()
    })

    it('should default to streaming mode', async () => {
      mockAuthenticatedSession()
      mockTurnstileAPI(true)

      const mockRateLimiter = mockRateLimiterAllow()
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: {
          messages: MOCK_CHAT_MESSAGES,
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      const response = await POST(request)

      expect(response.headers.get('content-type')).toContain('text/event-stream')
    })
  })
})
