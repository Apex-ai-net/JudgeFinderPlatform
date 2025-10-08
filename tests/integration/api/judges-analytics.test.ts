/**
 * Integration tests for Judge Analytics API endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/judges/[id]/analytics/route'
import { mockJudges } from '@/tests/fixtures/judges'
import { mockCasesList, generateMockCases } from '@/tests/fixtures/cases'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(async () => ({
    from: vi.fn((table: string) => {
      if (table === 'judges') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: mockJudges.activeJudge,
                error: null,
              })),
            })),
          })),
        }
      }
      if (table === 'cases') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    data: generateMockCases(50, 'judge-001'),
                    error: null,
                  })),
                })),
              })),
            })),
          })),
        }
      }
      if (table === 'judge_analytics_cache') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: null,
                error: { code: 'PGRST116' },
              })),
            })),
          })),
        }
      }
      return {}
    }),
  })),
}))

vi.mock('@/lib/security/rate-limit', () => ({
  buildRateLimiter: vi.fn(() => ({
    limit: vi.fn(async () => ({ success: true, remaining: 19 })),
  })),
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

vi.mock('@/lib/cache/redis', () => ({
  redisGetJSON: vi.fn(async () => null),
  redisSetJSON: vi.fn(async () => true),
}))

vi.mock('@/lib/analytics/enrichment', () => ({
  enrichCasesWithOpinions: vi.fn(async (_supabase, cases) => cases),
}))

vi.mock('@/lib/analytics/cache', () => ({
  getCachedAnalytics: vi.fn(async () => null),
  cacheAnalytics: vi.fn(async () => true),
  isDataFresh: vi.fn(() => false),
}))

describe('Judge Analytics API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/judges/[id]/analytics', () => {
    it('should return analytics for judge with cases', async () => {
      const request = new NextRequest('http://localhost:3000/api/judges/judge-001/analytics')
      const params = Promise.resolve({ id: 'judge-001' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.analytics).toBeDefined()
      expect(data.analytics.confidence_civil).toBeDefined()
      expect(data.document_count).toBeGreaterThan(0)
      expect(data.data_source).toBe('case_analysis')
    })

    it('should return 404 for non-existent judge', async () => {
      const { createServiceRoleClient } = await import('@/lib/supabase/server')
      vi.mocked(createServiceRoleClient).mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: null,
                error: { code: 'PGRST116' },
              })),
            })),
          })),
        })),
      } as any)

      const request = new NextRequest('http://localhost:3000/api/judges/non-existent/analytics')
      const params = Promise.resolve({ id: 'non-existent' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('Judge not found')
    })

    it('should use cached analytics if available', async () => {
      const { getCachedAnalytics } = await import('@/lib/analytics/cache')
      const cachedAnalytics = {
        analytics: {
          confidence_civil: 0.92,
          confidence_criminal: 0.88,
          total_cases_analyzed: 100,
          settlement_rate: 0.65,
          dismissal_rate: 0.15,
          avg_case_duration_days: 180,
          case_type_distribution: {},
          temporal_trends: [],
          bias_indicators: {
            consistency_score: 78.5,
            speed_score: 72.3,
            settlement_preference: 15.0,
            risk_tolerance: 45.2,
            predictability_score: 82.1,
          },
        },
        created_at: new Date().toISOString(),
      }
      vi.mocked(getCachedAnalytics).mockResolvedValue(cachedAnalytics as any)

      const request = new NextRequest('http://localhost:3000/api/judges/judge-001/analytics')
      const params = Promise.resolve({ id: 'judge-001' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.cached).toBe(true)
      expect(data.data_source).toBe('database_cache')
      expect(data.analytics).toBeDefined()
    })

    it('should handle rate limiting', async () => {
      const { buildRateLimiter } = await import('@/lib/security/rate-limit')
      vi.mocked(buildRateLimiter).mockReturnValue({
        limit: vi.fn(async () => ({ success: false, remaining: 0 })),
      } as any)

      const request = new NextRequest('http://localhost:3000/api/judges/judge-001/analytics')
      const params = Promise.resolve({ id: 'judge-001' })

      const response = await GET(request, { params })

      expect(response.status).toBe(429)
    })

    it('should generate analytics from minimal data', async () => {
      const { createServiceRoleClient } = await import('@/lib/supabase/server')
      vi.mocked(createServiceRoleClient).mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === 'judges') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => ({
                    data: mockJudges.minimalDataJudge,
                    error: null,
                  })),
                })),
              })),
            }
          }
          if (table === 'cases') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    order: vi.fn(() => ({
                      limit: vi.fn(() => ({
                        data: [],
                        error: null,
                      })),
                    })),
                  })),
                })),
              })),
            }
          }
          if (table === 'judge_analytics_cache') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => ({
                    data: null,
                    error: { code: 'PGRST116' },
                  })),
                })),
              })),
            }
          }
          return {}
        }),
      } as any)

      const request = new NextRequest('http://localhost:3000/api/judges/judge-004/analytics')
      const params = Promise.resolve({ id: 'judge-004' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data_source).toBe('profile_estimation')
      expect(data.analytics).toBeDefined()
    })

    it('should include rate limit remaining in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/judges/judge-001/analytics')
      const params = Promise.resolve({ id: 'judge-001' })

      const response = await GET(request, { params })
      const data = await response.json()

      expect(data.rate_limit_remaining).toBeDefined()
      expect(typeof data.rate_limit_remaining).toBe('number')
    })

    it('should cache generated analytics', async () => {
      const { cacheAnalytics } = await import('@/lib/analytics/cache')
      const { redisSetJSON } = await import('@/lib/cache/redis')

      const request = new NextRequest('http://localhost:3000/api/judges/judge-001/analytics')
      const params = Promise.resolve({ id: 'judge-001' })

      await GET(request, { params })

      expect(cacheAnalytics).toHaveBeenCalled()
      expect(redisSetJSON).toHaveBeenCalled()
    })

    it('should handle database errors during case fetch', async () => {
      const { createServiceRoleClient } = await import('@/lib/supabase/server')
      vi.mocked(createServiceRoleClient).mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === 'judges') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => ({
                    data: mockJudges.activeJudge,
                    error: null,
                  })),
                })),
              })),
            }
          }
          if (table === 'cases') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    order: vi.fn(() => ({
                      limit: vi.fn(() => ({
                        data: null,
                        error: { message: 'Database error', code: 'DB001' },
                      })),
                    })),
                  })),
                })),
              })),
            }
          }
          if (table === 'judge_analytics_cache') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => ({
                    data: null,
                    error: { code: 'PGRST116' },
                  })),
                })),
              })),
            }
          }
          return {}
        }),
      } as any)

      const request = new NextRequest('http://localhost:3000/api/judges/judge-001/analytics')
      const params = Promise.resolve({ id: 'judge-001' })

      const response = await GET(request, { params })
      const data = await response.json()

      // Should still return analytics using fallback method
      expect(response.status).toBe(200)
      expect(data.analytics).toBeDefined()
      expect(data.data_source).toBe('profile_estimation')
    })

    it('should respect lookback window configuration', async () => {
      const { createServiceRoleClient } = await import('@/lib/supabase/server')
      const selectSpy = vi.fn()

      vi.mocked(createServiceRoleClient).mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === 'cases') {
            return {
              select: selectSpy.mockReturnValue({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => ({
                    order: vi.fn(() => ({
                      limit: vi.fn(() => ({
                        data: [],
                        error: null,
                      })),
                    })),
                  })),
                })),
              }),
            }
          }
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: mockJudges.activeJudge,
                  error: null,
                })),
              })),
            })),
          }
        }),
      } as any)

      const request = new NextRequest('http://localhost:3000/api/judges/judge-001/analytics')
      const params = Promise.resolve({ id: 'judge-001' })

      await GET(request, { params })

      // Should select from cases table with date filter
      expect(selectSpy).toHaveBeenCalled()
    })
  })
})
