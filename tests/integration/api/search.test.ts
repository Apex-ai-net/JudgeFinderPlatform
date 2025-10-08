/**
 * Integration tests for Search API endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/search/route'
import { mockJudges, mockJudgesList } from '@/tests/fixtures/judges'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            data: mockJudgesList,
            error: null,
          })),
        })),
        ilike: vi.fn(() => ({
          range: vi.fn(() => ({
            order: vi.fn(() => ({
              data: [mockJudges.activeJudge],
              error: null,
            })),
          })),
        })),
      })),
    })),
  })),
}))

vi.mock('@/lib/security/rate-limit', () => ({
  buildRateLimiter: vi.fn(() => ({
    limit: vi.fn(async () => ({ success: true, remaining: 59 })),
  })),
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

vi.mock('@/lib/search/sponsored', () => ({
  fetchSponsoredTiles: vi.fn(async () => []),
}))

describe('Search API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/search', () => {
    it('should return popular judges when no query provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/search')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results).toBeDefined()
      expect(data.total_count).toBeGreaterThan(0)
      expect(data.results_by_type.judges).toBeDefined()
      expect(data.counts_by_type).toBeDefined()
    })

    it('should search judges by name', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?q=John+Smith')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results).toBeDefined()
      expect(data.query).toBe('John Smith')
      expect(data.took_ms).toBeGreaterThanOrEqual(0)
    })

    it('should filter by judge type', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?q=Smith&type=judge')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results_by_type.judges).toBeDefined()
      expect(data.counts_by_type.judges).toBeGreaterThanOrEqual(0)
    })

    it('should respect limit parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?q=judge&limit=5')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results.length).toBeLessThanOrEqual(5)
    })

    it('should handle rate limiting', async () => {
      const { buildRateLimiter } = await import('@/lib/security/rate-limit')
      vi.mocked(buildRateLimiter).mockReturnValue({
        limit: vi.fn(async () => ({ success: false, remaining: 0 })),
      } as any)

      const request = new NextRequest('http://localhost:3000/api/search?q=test')
      const response = await GET(request)

      expect(response.status).toBe(429)
      const data = await response.json()
      expect(data.error).toContain('Rate limit')
    })

    it('should sanitize search query', async () => {
      const maliciousQuery = '<script>alert("xss")</script>Judge'
      const request = new NextRequest(
        `http://localhost:3000/api/search?q=${encodeURIComponent(maliciousQuery)}`
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      // Should process without executing script
      const data = await response.json()
      expect(JSON.stringify(data)).not.toContain('<script>')
    })

    it('should return cache headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?q=test')
      const response = await GET(request)

      expect(response.headers.has('Cache-Control')).toBe(true)
      expect(response.headers.get('Cache-Control')).toContain('max-age')
    })

    it('should include rate limit remaining in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?q=test')
      const response = await GET(request)
      const data = await response.json()

      expect(data.rate_limit_remaining).toBeDefined()
      expect(typeof data.rate_limit_remaining).toBe('number')
    })

    it('should handle database errors gracefully', async () => {
      const { createServerClient } = await import('@/lib/supabase/server')
      vi.mocked(createServerClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                data: null,
                error: { message: 'Database error', code: 'DB001' },
              })),
            })),
          })),
        })),
      } as any)

      const request = new NextRequest('http://localhost:3000/api/search')
      const response = await GET(request)
      const data = await response.json()

      // Should still return 200 with empty results
      expect(response.status).toBe(200)
      expect(data.results).toBeDefined()
    })

    it('should return suggestions when requested', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?q=judge&suggestions=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.suggestions).toBeDefined()
    })

    it('should search across multiple entity types', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?q=california&type=all')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.results_by_type).toHaveProperty('judges')
      expect(data.results_by_type).toHaveProperty('courts')
      expect(data.results_by_type).toHaveProperty('jurisdictions')
    })

    it('should prioritize exact matches', async () => {
      const { createServerClient } = await import('@/lib/supabase/server')
      const exactMatch = { ...mockJudges.activeJudge, name: 'John Smith' }
      const partialMatch = { ...mockJudges.retiredJudge, name: 'John Smithson' }

      vi.mocked(createServerClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            ilike: vi.fn(() => ({
              range: vi.fn(() => ({
                order: vi.fn(() => ({
                  data: [exactMatch, partialMatch],
                  error: null,
                })),
              })),
            })),
          })),
        })),
      } as any)

      const request = new NextRequest('http://localhost:3000/api/search?q=John+Smith')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Exact match should be first
      expect(data.results[0].title).toBe('John Smith')
    })
  })
})
