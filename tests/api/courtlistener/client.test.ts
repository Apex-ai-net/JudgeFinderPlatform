/**
 * CourtListener API Client Test Suite
 *
 * Tests the core CourtListener client implementation including:
 * - Authentication
 * - Rate limiting
 * - Error handling
 * - Retry logic
 * - Circuit breaker
 * - Request/response parsing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CourtListenerClient } from '@/lib/courtlistener/client'

// Mock environment variables
process.env.COURTLISTENER_API_KEY = 'test-api-key'
process.env.COURTLISTENER_REQUEST_DELAY_MS = '100' // Faster for tests
process.env.COURTLISTENER_MAX_RETRIES = '3'
process.env.COURTLISTENER_REQUEST_TIMEOUT_MS = '5000'

describe('CourtListenerClient', () => {
  let client: CourtListenerClient
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Mock fetch
    fetchMock = vi.fn()
    global.fetch = fetchMock

    client = new CourtListenerClient()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Authentication', () => {
    it('should include Authorization header with Token prefix', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: [] }),
        headers: new Headers()
      })

      await client.listJudges({ pageSize: 1 })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const callArgs = fetchMock.mock.calls[0]
      const headers = callArgs[1].headers

      expect(headers['Authorization']).toBe('Token test-api-key')
    })

    it('should throw error when API key is missing', () => {
      delete process.env.COURTLISTENER_API_KEY
      delete process.env.COURTLISTENER_API_TOKEN

      expect(() => new CourtListenerClient()).toThrow(
        'COURTLISTENER_API_KEY or COURTLISTENER_API_TOKEN environment variable is required'
      )

      // Restore for other tests
      process.env.COURTLISTENER_API_KEY = 'test-api-key'
    })

    it('should accept COURTLISTENER_API_TOKEN as alternative', () => {
      process.env.COURTLISTENER_API_TOKEN = 'alternative-token'
      delete process.env.COURTLISTENER_API_KEY

      const altClient = new CourtListenerClient()
      expect(altClient).toBeInstanceOf(CourtListenerClient)

      // Restore
      process.env.COURTLISTENER_API_KEY = 'test-api-key'
      delete process.env.COURTLISTENER_API_TOKEN
    })

    it('should include proper User-Agent header', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: [] }),
        headers: new Headers()
      })

      await client.listJudges({ pageSize: 1 })

      const headers = fetchMock.mock.calls[0][1].headers
      expect(headers['User-Agent']).toContain('JudgeFinder')
      expect(headers['User-Agent']).toContain('judgefinder.io')
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce request delay between calls', async () => {
      const startTime = Date.now()

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ results: [], count: 0, next: null }),
          headers: new Headers()
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ results: [], count: 0, next: null }),
          headers: new Headers()
        })

      await client.listJudges({ pageSize: 1 })
      await client.listJudges({ pageSize: 1 })

      const elapsed = Date.now() - startTime
      // Should take at least 100ms (our test delay) between requests
      expect(elapsed).toBeGreaterThanOrEqual(100)
    })

    it('should respect Retry-After header (seconds format)', async () => {
      const retryAfterSeconds = 2

      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => 'Rate limit exceeded',
          headers: new Headers({ 'Retry-After': retryAfterSeconds.toString() })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ results: [], count: 0, next: null }),
          headers: new Headers()
        })

      const startTime = Date.now()
      await client.listJudges({ pageSize: 1 })
      const elapsed = Date.now() - startTime

      // Should wait at least retryAfterSeconds * 1000ms
      expect(elapsed).toBeGreaterThanOrEqual(retryAfterSeconds * 1000)
    })

    it('should respect Retry-After header (HTTP-date format)', async () => {
      const retryDate = new Date(Date.now() + 1000) // 1 second from now

      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => 'Rate limit exceeded',
          headers: new Headers({ 'Retry-After': retryDate.toUTCString() })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ results: [], count: 0, next: null }),
          headers: new Headers()
        })

      const startTime = Date.now()
      await client.listJudges({ pageSize: 1 })
      const elapsed = Date.now() - startTime

      expect(elapsed).toBeGreaterThanOrEqual(900) // Allow 100ms margin
    })

    it('should use longer backoff for 429 errors', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => 'Rate limit exceeded',
          headers: new Headers()
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ results: [], count: 0, next: null }),
          headers: new Headers()
        })

      const startTime = Date.now()
      await client.listJudges({ pageSize: 1 })
      const elapsed = Date.now() - startTime

      // 429 should use 1.5x multiplier on backoff
      // First retry: ~1000ms base * 1.5 = ~1500ms minimum
      expect(elapsed).toBeGreaterThanOrEqual(1000)
    })
  })

  describe('Error Handling', () => {
    it('should retry on 500 server errors', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
          headers: new Headers()
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ results: [], count: 0, next: null }),
          headers: new Headers()
        })

      const result = await client.listJudges({ pageSize: 1 })

      expect(fetchMock).toHaveBeenCalledTimes(2) // Original + 1 retry
      expect(result.count).toBe(0)
    })

    it('should retry on network errors', async () => {
      fetchMock
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ results: [], count: 0, next: null }),
          headers: new Headers()
        })

      const result = await client.listJudges({ pageSize: 1 })

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(result.count).toBe(0)
    })

    it('should NOT retry on 404 errors (by default)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
        headers: new Headers()
      })

      await expect(client.listJudges({ pageSize: 1 })).rejects.toThrow(
        'CourtListener API error 404'
      )

      expect(fetchMock).toHaveBeenCalledTimes(1) // No retry
    })

    it('should return null on 404 when allow404 is true', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
        headers: new Headers()
      })

      const result = await client.getJudgeById('999999')

      expect(result).toBeNull()
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('should throw error after max retries exhausted', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Error 1',
          headers: new Headers()
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Error 2',
          headers: new Headers()
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Error 3',
          headers: new Headers()
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Error 4',
          headers: new Headers()
        })

      await expect(client.listJudges({ pageSize: 1 })).rejects.toThrow()

      // Should have tried: original + 3 retries = 4 attempts
      expect(fetchMock).toHaveBeenCalledTimes(4)
    })

    it('should handle timeout errors', async () => {
      fetchMock.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 100)
        })
      })

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: [], count: 0, next: null }),
        headers: new Headers()
      })

      // Should retry after timeout
      const result = await client.listJudges({ pageSize: 1 })
      expect(result.count).toBe(0)
    })

    it('should NOT retry on 400 Bad Request', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
        headers: new Headers()
      })

      await expect(client.listJudges({ pageSize: 1 })).rejects.toThrow(
        'CourtListener API error 400'
      )

      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('Circuit Breaker', () => {
    it('should open circuit after threshold failures', async () => {
      // Mock 5 consecutive failures (circuit threshold)
      for (let i = 0; i < 5; i++) {
        fetchMock.mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Server Error',
          headers: new Headers()
        })
      }

      // Try to make requests
      for (let i = 0; i < 5; i++) {
        try {
          await client.listJudges({ pageSize: 1 })
        } catch (error) {
          // Expected to fail
        }
      }

      // Next request should be circuit breaker error
      await expect(client.listJudges({ pageSize: 1 })).rejects.toThrow(
        'circuit open'
      )
    })

    it('should reset circuit on successful request', async () => {
      // Cause some failures
      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Error',
          headers: new Headers()
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ results: [], count: 0, next: null }),
          headers: new Headers()
        })

      await client.listJudges({ pageSize: 1 })

      // Circuit should be closed now
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: [], count: 0, next: null }),
        headers: new Headers()
      })

      const result = await client.listJudges({ pageSize: 1 })
      expect(result.count).toBe(0)
    })
  })

  describe('Request Formatting', () => {
    it('should add format=json parameter', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: [], count: 0, next: null }),
        headers: new Headers()
      })

      await client.listJudges({ pageSize: 1 })

      const requestUrl = fetchMock.mock.calls[0][0]
      expect(requestUrl).toContain('format=json')
    })

    it('should properly encode query parameters', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: [], count: 0, next: null }),
        headers: new Headers()
      })

      await client.listJudges({
        pageSize: 50,
        ordering: '-date_modified',
        filters: { name: 'John Doe' }
      })

      const requestUrl = fetchMock.mock.calls[0][0]
      expect(requestUrl).toContain('page_size=50')
      expect(requestUrl).toContain('ordering=-date_modified')
      expect(requestUrl).toContain('name=John+Doe')
    })

    it('should handle absolute URLs (pagination)', async () => {
      const nextUrl = 'https://www.courtlistener.com/api/rest/v4/people/?page=2'

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: [], count: 0, next: null }),
        headers: new Headers()
      })

      await client.listJudges({ cursorUrl: nextUrl })

      const requestUrl = fetchMock.mock.calls[0][0]
      expect(requestUrl).toBe(nextUrl + '&format=json')
    })
  })

  describe('Response Parsing', () => {
    it('should parse successful JSON response', async () => {
      const mockData = {
        count: 100,
        next: 'https://example.com/next',
        previous: null,
        results: [
          { id: 1, name: 'Judge 1' },
          { id: 2, name: 'Judge 2' }
        ]
      }

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
        headers: new Headers()
      })

      const result = await client.listJudges({ pageSize: 2 })

      expect(result.count).toBe(100)
      expect(result.results).toHaveLength(2)
      expect(result.next).toBeTruthy()
    })

    it('should handle empty results', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: [], count: 0, next: null }),
        headers: new Headers()
      })

      const result = await client.listJudges({ pageSize: 10 })

      expect(result.count).toBe(0)
      expect(result.results).toHaveLength(0)
      expect(result.next).toBeNull()
    })
  })

  describe('Specific Endpoint Methods', () => {
    describe('getOpinionsByJudge', () => {
      it('should fetch opinions with proper filters', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ results: [], count: 0, next: null }),
          headers: new Headers()
        })

        await client.getOpinionsByJudge('12345', {
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          limit: 50
        })

        const requestUrl = fetchMock.mock.calls[0][0]
        expect(requestUrl).toContain('author=12345')
        expect(requestUrl).toContain('cluster__date_filed__gte=2023-01-01')
        expect(requestUrl).toContain('cluster__date_filed__lte=2023-12-31')
        expect(requestUrl).toContain('page_size=50')
        expect(requestUrl).toContain('ordering=-date_created')
      })
    })

    describe('getDocketsByJudge', () => {
      it('should fetch dockets with assigned_to_id', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ results: [], count: 0, next: null }),
          headers: new Headers()
        })

        await client.getDocketsByJudge('12345', {
          startDate: '2023-01-01',
          limit: 25
        })

        const requestUrl = fetchMock.mock.calls[0][0]
        expect(requestUrl).toContain('assigned_to_id=12345')
        expect(requestUrl).toContain('date_filed__gte=2023-01-01')
        expect(requestUrl).toContain('page_size=25')
      })
    })

    describe('getJudgeById', () => {
      it('should fetch specific judge by ID', async () => {
        const mockJudge = {
          id: '12345',
          name: 'John Doe',
          positions: []
        }

        fetchMock.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockJudge,
          headers: new Headers()
        })

        const result = await client.getJudgeById('12345')

        expect(result).toEqual(mockJudge)
        expect(fetchMock.mock.calls[0][0]).toContain('/people/12345/')
      })

      it('should return null for non-existent judge', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: async () => 'Not Found',
          headers: new Headers()
        })

        const result = await client.getJudgeById('999999')
        expect(result).toBeNull()
      })
    })
  })

  describe('Metrics Reporting', () => {
    it('should report metrics when reporter is configured', async () => {
      const metricsReporter = vi.fn()
      client.setMetricsReporter(metricsReporter)

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate Limited',
        headers: new Headers()
      })

      try {
        await client.listJudges({ pageSize: 1 })
      } catch (error) {
        // Expected to fail
      }

      // Should have reported retry metric
      expect(metricsReporter).toHaveBeenCalled()
      expect(metricsReporter.mock.calls.some(
        (call: any[]) => call[0] === 'courtlistener_retry'
      )).toBe(true)
    })
  })

  describe('Helper Functions', () => {
    describe('transformOpinionToCase', () => {
      it('should transform opinion data to case format', () => {
        const opinionData = {
          opinion_id: 12345,
          case_name: 'Test v. Case',
          date_filed: '2023-06-15',
          precedential_status: 'Published'
        }

        const result = client.transformOpinionToCase(opinionData, 'judge-123')

        expect(result.judge_id).toBe('judge-123')
        expect(result.case_name).toBe('Test v. Case')
        expect(result.case_number).toBe('CL-O12345')
        expect(result.decision_date).toBe('2023-06-15')
        expect(result.outcome).toBe('Published')
        expect(result.case_type).toBe('Opinion')
      })

      it('should truncate long case names', () => {
        const longName = 'A'.repeat(600)
        const opinionData = {
          opinion_id: 12345,
          case_name: longName,
          date_filed: '2023-06-15'
        }

        const result = client.transformOpinionToCase(opinionData, 'judge-123')

        expect(result.case_name.length).toBe(500)
      })
    })

    describe('validateJudge', () => {
      it('should return true if judge has opinions', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ results: [{ id: 1 }], count: 1, next: null }),
          headers: new Headers()
        })

        const result = await client.validateJudge('12345')
        expect(result).toBe(true)
      })

      it('should return false if judge has no opinions', async () => {
        fetchMock.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ results: [], count: 0, next: null }),
          headers: new Headers()
        })

        const result = await client.validateJudge('12345')
        expect(result).toBe(false)
      })
    })
  })
})
