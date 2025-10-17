/**
 * Unit tests for Court Sync Manager
 * Tests court data synchronization from CourtListener
 *
 * Coverage targets:
 * - CourtSyncManager.syncCourts()
 * - Court creation and updates
 * - Jurisdiction extraction
 * - Error handling
 * - Rate limiting respect
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CourtSyncManager } from '@/lib/sync/court-sync'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CourtListenerClient, CourtListenerCourt } from '@/lib/courtlistener/client'

// Mock dependencies
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/utils/helpers', () => ({
  sleep: vi.fn(async () => Promise.resolve()),
}))

describe('CourtSyncManager', () => {
  let mockSupabase: Partial<SupabaseClient>
  let mockCourtListener: Partial<CourtListenerClient>
  let syncManager: CourtSyncManager

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = {
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          ilike: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      })) as any,
    }

    // Mock CourtListener client
    mockCourtListener = {
      listCourts: vi.fn(),
      setMetricsReporter: vi.fn(),
    }

    // Create sync manager - note: CourtSyncManager doesn't have DI in current implementation
    // so we'll need to mock the environment variables instead
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
    process.env.COURTLISTENER_API_KEY = 'test-api-key'

    syncManager = new CourtSyncManager()
  })

  afterEach(() => {
    vi.clearAllMocks()
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.COURTLISTENER_API_KEY
  })

  describe('syncCourts()', () => {
    it('should complete successfully with empty database', async () => {
      // Mock empty CourtListener response
      mockCourtListener.listCourts = vi.fn().mockResolvedValue({
        results: [],
        next: null,
        previous: null,
        count: 0,
      })

      // Replace the internal courtListener with our mock
      ;(syncManager as any).courtListener = mockCourtListener

      const result = await syncManager.syncCourts({
        batchSize: 10,
      })

      expect(result.success).toBe(true)
      expect(result.courtsProcessed).toBe(0)
    })

    it('should process courts in batches', async () => {
      const mockCourts: CourtListenerCourt[] = [
        {
          id: 'ca',
          name: 'California Supreme Court',
          full_name: 'Supreme Court of California',
          jurisdiction: 'CA',
          url: 'https://courts.ca.gov',
        },
        {
          id: 'ca-superior',
          name: 'Superior Court',
          full_name: 'Superior Court of California - Los Angeles',
          jurisdiction: 'CA',
        },
      ]

      mockCourtListener.listCourts = vi.fn().mockResolvedValue({
        results: mockCourts,
        next: null,
        previous: null,
        count: 2,
      })
      ;(syncManager as any).courtListener = mockCourtListener
      ;(syncManager as any).supabase = mockSupabase

      const result = await syncManager.syncCourts({
        batchSize: 10,
      })

      expect(result.courtsProcessed).toBe(2)
      expect(mockSupabase.from).toHaveBeenCalled()
    })

    it('should handle jurisdiction filtering', async () => {
      const caCourts: CourtListenerCourt[] = [
        {
          id: 'ca',
          name: 'CA Court',
          full_name: 'California Court',
          jurisdiction: 'CA',
        },
      ]

      mockCourtListener.listCourts = vi.fn().mockResolvedValue({
        results: caCourts,
        next: null,
        previous: null,
        count: 1,
      })
      ;(syncManager as any).courtListener = mockCourtListener
      ;(syncManager as any).supabase = mockSupabase

      const result = await syncManager.syncCourts({
        jurisdiction: 'CA',
      })

      expect(result.success).toBe(true)
      expect(result.courtsProcessed).toBe(1)
    })

    it('should respect batch size and rate limiting', async () => {
      const largeCourts = Array(50)
        .fill(null)
        .map((_, i) => ({
          id: `court-${i}`,
          name: `Court ${i}`,
          full_name: `Full Name Court ${i}`,
          jurisdiction: 'CA',
        }))

      mockCourtListener.listCourts = vi.fn().mockResolvedValue({
        results: largeCourts,
        next: null,
        previous: null,
        count: 50,
      })
      ;(syncManager as any).courtListener = mockCourtListener
      ;(syncManager as any).supabase = mockSupabase

      const result = await syncManager.syncCourts({
        batchSize: 20,
      })

      expect(result.courtsProcessed).toBe(50)
      // Should have paused between batches
      const { sleep } = await import('@/lib/utils/helpers')
      expect(sleep).toHaveBeenCalled()
    })
  })

  describe('Jurisdiction Extraction', () => {
    it('should extract jurisdiction from court data', () => {
      const testCases = [
        {
          court: { jurisdiction: 'CA', name: 'Test Court' },
          expected: 'CA',
        },
        {
          court: { jurisdiction: '', name: 'California Supreme Court' },
          expected: 'CA',
        },
        {
          court: { jurisdiction: '', name: 'Federal District Court' },
          expected: 'US',
        },
        {
          court: { jurisdiction: '', name: 'U.S. Court of Appeals' },
          expected: 'US',
        },
      ]

      testCases.forEach(({ court, expected }) => {
        const result = (syncManager as any).extractJurisdiction(court)
        expect(result).toBe(expected)
      })
    })
  })

  describe('Court Type Determination', () => {
    it('should correctly identify federal courts', () => {
      const federalCourts = [
        { name: 'U.S. District Court' },
        { name: 'Federal Court of Appeals' },
        { name: 'Ninth Circuit Court' },
      ]

      federalCourts.forEach((court) => {
        const result = (syncManager as any).determineCourtType(court)
        expect(result).toBe('federal')
      })
    })

    it('should correctly identify state courts', () => {
      const stateCourts = [
        { name: 'Superior Court of California' },
        { name: 'Los Angeles County Superior Court' },
        { name: 'District Court of Appeals' },
      ]

      stateCourts.forEach((court) => {
        const result = (syncManager as any).determineCourtType(court)
        expect(result).toBe('state')
      })
    })

    it('should default to state court when unclear', () => {
      const result = (syncManager as any).determineCourtType({ name: 'Unknown Court' })
      expect(result).toBe('state')
    })
  })

  describe('Court Creation vs Update', () => {
    it('should create new court when not found', async () => {
      const newCourt: CourtListenerCourt = {
        id: 'new-court',
        name: 'New Court',
        full_name: 'New Court Full Name',
        jurisdiction: 'CA',
      }

      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          ilike: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert: mockInsert,
      })) as any
      ;(syncManager as any).supabase = mockSupabase

      await (syncManager as any).createCourt(newCourt)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Court',
          jurisdiction: 'CA',
          courtlistener_id: 'new-court',
        })
      )
    })

    it('should update existing court when found', async () => {
      const existingCourt = {
        id: 'court-123',
        name: 'Old Name',
        courtlistener_id: 'cl-court',
      }

      const updatedData: CourtListenerCourt = {
        id: 'cl-court',
        name: 'New Name',
        full_name: 'New Full Name',
        jurisdiction: 'CA',
      }

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      mockSupabase.from = vi.fn(() => ({
        update: mockUpdate,
      })) as any
      ;(syncManager as any).supabase = mockSupabase

      await (syncManager as any).updateCourt(existingCourt.id, updatedData)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Name',
          courtlistener_id: 'cl-court',
        })
      )
    })
  })

  describe('Metadata Building', () => {
    it('should build comprehensive courthouse metadata', () => {
      const courtData: CourtListenerCourt = {
        id: 'ca',
        name: 'CA Court',
        full_name: 'California Court',
        jurisdiction: 'CA',
        short_name: 'CA',
        citation_string: 'Cal.',
        in_use: true,
        has_opinion_scraper: true,
        has_oral_argument_scraper: false,
        position_count: 7,
        start_date: '1850-01-01',
        end_date: null,
        location: 'Sacramento, CA',
        url: 'https://courts.ca.gov',
      }

      const metadata = (syncManager as any).buildCourthouseMetadata(courtData)

      expect(metadata).toMatchObject({
        source: 'courtlistener',
        short_name: 'CA',
        citation_string: 'Cal.',
        in_use: true,
        has_opinion_scraper: true,
        has_oral_argument_scraper: false,
        position_count: 7,
        location: 'Sacramento, CA',
      })
      expect(metadata.sync_id).toBeDefined()
      expect(metadata.fetched_at).toBeDefined()
      expect(metadata.raw).toEqual(courtData)
    })
  })

  describe('Error Handling', () => {
    it('should handle CourtListener API errors', async () => {
      mockCourtListener.listCourts = vi.fn().mockRejectedValue(new Error('API Error'))
      ;(syncManager as any).courtListener = mockCourtListener

      const result = await syncManager.syncCourts()

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should handle Supabase errors gracefully', async () => {
      mockCourtListener.listCourts = vi.fn().mockResolvedValue({
        results: [
          {
            id: 'ca',
            name: 'CA Court',
            full_name: 'California Court',
            jurisdiction: 'CA',
          },
        ],
        next: null,
        previous: null,
        count: 1,
      })

      mockSupabase.from = vi.fn(() => {
        throw new Error('Database connection failed')
      }) as any
      ;(syncManager as any).courtListener = mockCourtListener
      ;(syncManager as any).supabase = mockSupabase

      const result = await syncManager.syncCourts()

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should continue processing after individual court failures', async () => {
      const courts = [
        {
          id: 'good-court',
          name: 'Good Court',
          full_name: 'Good Court Full',
          jurisdiction: 'CA',
        },
        {
          id: 'bad-court',
          name: 'Bad Court',
          full_name: 'Bad Court Full',
          jurisdiction: 'CA',
        },
      ]

      mockCourtListener.listCourts = vi.fn().mockResolvedValue({
        results: courts,
        next: null,
        previous: null,
        count: 2,
      })

      let callCount = 0
      mockSupabase.from = vi.fn(() => {
        callCount++
        if (callCount === 2) {
          throw new Error('Database error for bad court')
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }) as any
      ;(syncManager as any).courtListener = mockCourtListener
      ;(syncManager as any).supabase = mockSupabase

      const result = await syncManager.syncCourts()

      // Should process both courts despite one failing
      expect(result.courtsProcessed).toBe(2)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Pagination Support', () => {
    it('should handle paginated results from CourtListener', async () => {
      let page = 0
      mockCourtListener.listCourts = vi.fn().mockImplementation(() => {
        page++
        if (page === 1) {
          return Promise.resolve({
            results: Array(100)
              .fill(null)
              .map((_, i) => ({
                id: `court-${i}`,
                name: `Court ${i}`,
                full_name: `Full Court ${i}`,
                jurisdiction: 'CA',
              })),
            next: 'https://api.courtlistener.com/courts?page=2',
            previous: null,
            count: 200,
          })
        } else {
          return Promise.resolve({
            results: Array(100)
              .fill(null)
              .map((_, i) => ({
                id: `court-${i + 100}`,
                name: `Court ${i + 100}`,
                full_name: `Full Court ${i + 100}`,
                jurisdiction: 'CA',
              })),
            next: null,
            previous: 'https://api.courtlistener.com/courts?page=1',
            count: 200,
          })
        }
      })
      ;(syncManager as any).courtListener = mockCourtListener
      ;(syncManager as any).supabase = mockSupabase

      const result = await syncManager.syncCourts()

      expect(result.courtsProcessed).toBe(200)
      expect(mockCourtListener.listCourts).toHaveBeenCalledTimes(2)
    })
  })
})
