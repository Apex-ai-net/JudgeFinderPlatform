/**
 * Integration tests for /api/judges/search route
 * Tests tiered rate limiting (anonymous vs authenticated)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '@/app/api/judges/search/route'
import {
  mockAuthenticatedSession,
  mockUnauthenticatedSession,
  createMockRequest,
  createMockRequestWithIP,
  extractJSON,
  extractHeaders,
  mockRateLimiterAllow,
  mockRateLimiterBlock,
} from '../../helpers/auth-helpers'
import { SEARCH_QUERIES } from '../../fixtures/auth'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'judge-1',
                  name: 'Judge Smith',
                  court_name: 'Superior Court',
                  jurisdiction: 'CA',
                  total_cases: 1000,
                  slug: 'judge-smith',
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    }),
    rpc: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'judge-1',
          name: 'Judge Smith',
          court_name: 'Superior Court',
          jurisdiction: 'CA',
          total_cases: 1000,
          slug: 'judge-smith',
        },
      ],
      error: null,
    }),
  }),
}))

vi.mock('@/lib/cache/redis', () => ({
  buildCacheKey: vi.fn((prefix, params) => `${prefix}:${JSON.stringify(params)}`),
  withRedisCache: vi.fn(async (key, ttl, fn) => {
    const result = await fn()
    return { data: result, fromCache: false }
  }),
}))

describe('GET /api/judges/search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Anonymous User Rate Limiting', () => {
    it('should enforce 10 searches per day for anonymous users', async () => {
      mockUnauthenticatedSession()

      const mockRateLimiter = mockRateLimiterBlock(0)
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequestWithIP(
        'http://localhost:3000/api/judges/search?q=judge+smith',
        '192.168.1.1'
      )

      const response = await GET(request)
      const json = await extractJSON<{ error: string; requiresAuth: boolean }>(response)

      expect(response.status).toBe(429)
      expect(json.error).toContain('Daily search limit reached')
      expect(json.error).toContain('10 searches')
      expect(json.requiresAuth).toBe(true)
    })

    it('should include rate limit headers for anonymous users', async () => {
      mockUnauthenticatedSession()

      const mockRateLimiter = mockRateLimiterBlock(0)
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequestWithIP(
        'http://localhost:3000/api/judges/search?q=judge+smith',
        '192.168.1.1'
      )

      const response = await GET(request)
      const headers = extractHeaders(response)

      expect(headers['x-ratelimit-limit']).toBe('10')
      expect(headers['x-ratelimit-remaining']).toBe('0')
      expect(headers['x-ratelimit-reset']).toBeDefined()
    })

    it('should allow searches within anonymous limit', async () => {
      mockUnauthenticatedSession()

      const mockRateLimiter = mockRateLimiterAllow(5)
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequestWithIP(
        'http://localhost:3000/api/judges/search?q=judge+smith',
        '192.168.1.1'
      )

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should use client IP as rate limit key for anonymous users', async () => {
      mockUnauthenticatedSession()

      const clientIp = '203.0.113.45'
      const mockRateLimiter = mockRateLimiterAllow(5)
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => clientIp,
      }))

      const request = createMockRequestWithIP(
        'http://localhost:3000/api/judges/search?q=judge+smith',
        clientIp
      )

      await GET(request)

      expect(mockRateLimiter.limit).toHaveBeenCalledWith(clientIp)
    })
  })

  describe('Authenticated User Rate Limiting', () => {
    it('should enforce 100 searches per hour for authenticated users', async () => {
      mockAuthenticatedSession('user-123')

      const mockRateLimiter = mockRateLimiterBlock(0)
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest('http://localhost:3000/api/judges/search?q=judge+smith')

      const response = await GET(request)
      const json = await extractJSON<{ error: string; requiresAuth: boolean }>(response)

      expect(response.status).toBe(429)
      expect(json.error).toContain('Rate limit exceeded')
      expect(json.error).toContain('100 times per hour')
      expect(json.requiresAuth).toBe(false)
    })

    it('should include rate limit headers for authenticated users', async () => {
      mockAuthenticatedSession('user-123')

      const mockRateLimiter = mockRateLimiterBlock(0)
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest('http://localhost:3000/api/judges/search?q=judge+smith')

      const response = await GET(request)
      const headers = extractHeaders(response)

      expect(headers['x-ratelimit-limit']).toBe('100')
      expect(headers['x-ratelimit-remaining']).toBe('0')
      expect(headers['x-ratelimit-reset']).toBeDefined()
    })

    it('should allow searches within authenticated limit', async () => {
      mockAuthenticatedSession('user-123')

      const mockRateLimiter = mockRateLimiterAllow(50)
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest('http://localhost:3000/api/judges/search?q=judge+smith')

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should use user ID as rate limit key for authenticated users', async () => {
      const userId = 'user-authenticated-456'
      mockAuthenticatedSession(userId)

      const mockRateLimiter = mockRateLimiterAllow(50)
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest('http://localhost:3000/api/judges/search?q=judge+smith')

      await GET(request)

      expect(mockRateLimiter.limit).toHaveBeenCalledWith(userId)
    })
  })

  describe('Search Functionality', () => {
    it('should return search results for valid query', async () => {
      mockAuthenticatedSession()

      const mockRateLimiter = mockRateLimiterAllow(50)
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest(
        'http://localhost:3000/api/judges/search?q=judge+smith'
      )

      const response = await GET(request)
      const json = await extractJSON<{
        results: any[]
        total_count: number
        page: number
        per_page: number
      }>(response)

      expect(response.status).toBe(200)
      expect(json.results).toBeDefined()
      expect(Array.isArray(json.results)).toBe(true)
      expect(json.total_count).toBeDefined()
      expect(json.page).toBe(1)
      expect(json.per_page).toBe(20)
    })

    it('should handle empty search query', async () => {
      mockAuthenticatedSession()

      const mockRateLimiter = mockRateLimiterAllow(50)
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest('http://localhost:3000/api/judges/search')

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should support pagination parameters', async () => {
      mockAuthenticatedSession()

      const mockRateLimiter = mockRateLimiterAllow(50)
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest(
        'http://localhost:3000/api/judges/search?q=judge&page=2&limit=10'
      )

      const response = await GET(request)
      const json = await extractJSON<{ page: number; per_page: number }>(response)

      expect(response.status).toBe(200)
      expect(json.page).toBe(2)
      expect(json.per_page).toBe(10)
    })

    it('should enforce maximum limit of 500', async () => {
      mockAuthenticatedSession()

      const mockRateLimiter = mockRateLimiterAllow(50)
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest(
        'http://localhost:3000/api/judges/search?q=judge&limit=1000'
      )

      const response = await GET(request)
      const json = await extractJSON<{ error: string }>(response)

      expect(response.status).toBe(400)
      expect(json.error).toContain('Limit cannot exceed 500')
    })

    it('should support jurisdiction filter', async () => {
      mockAuthenticatedSession()

      const mockRateLimiter = mockRateLimiterAllow(50)
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest(
        'http://localhost:3000/api/judges/search?q=judge&jurisdiction=CA'
      )

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should support court_type filter', async () => {
      mockAuthenticatedSession()

      const mockRateLimiter = mockRateLimiterAllow(50)
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest(
        'http://localhost:3000/api/judges/search?q=judge&court_type=Superior'
      )

      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Caching', () => {
    it('should set cache headers on response', async () => {
      mockAuthenticatedSession()

      const mockRateLimiter = mockRateLimiterAllow(50)
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest(
        'http://localhost:3000/api/judges/search?q=judge+smith'
      )

      const response = await GET(request)
      const headers = extractHeaders(response)

      expect(headers['cache-control']).toBeDefined()
      expect(headers['cache-control']).toContain('public')
    })

    it('should include rate_limit_remaining in response', async () => {
      mockAuthenticatedSession()

      const mockRateLimiter = mockRateLimiterAllow(42)
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      const request = createMockRequest(
        'http://localhost:3000/api/judges/search?q=judge+smith'
      )

      const response = await GET(request)
      const json = await extractJSON<{ rate_limit_remaining: number }>(response)

      expect(json.rate_limit_remaining).toBe(42)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockAuthenticatedSession()

      const mockRateLimiter = mockRateLimiterAllow(50)
      vi.doMock('@/lib/security/rate-limit', () => ({
        buildRateLimiter: () => mockRateLimiter,
        getClientIp: () => '192.168.1.1',
      }))

      // Mock database error
      vi.doMock('@/lib/supabase/server', () => ({
        createServerClient: vi.fn().mockResolvedValue({
          rpc: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      }))

      const request = createMockRequest(
        'http://localhost:3000/api/judges/search?q=judge+smith'
      )

      const response = await GET(request)

      expect(response.status).toBe(500)
    })
  })
})
