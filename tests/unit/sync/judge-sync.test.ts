/**
 * Unit tests for Judge Sync Manager
 * Tests critical data pipeline functionality
 *
 * Coverage targets:
 * - JudgeSyncManager.syncJudges()
 * - JudgeSyncManager.syncSingleJudge()
 * - Retirement detection logic
 * - Profile enhancement
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { JudgeSyncManager } from '@/lib/sync/judge-sync'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CourtListenerClient, CourtListenerJudge } from '@/lib/courtlistener/client'

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

describe('JudgeSyncManager', () => {
  let mockSupabase: Partial<SupabaseClient>
  let mockCourtListener: Partial<CourtListenerClient>
  let syncManager: JudgeSyncManager

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = {
      from: vi.fn(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'judge-123' }, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          not: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          range: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      })) as any,
    }

    // Mock CourtListener client
    mockCourtListener = {
      getJudgeById: vi.fn(),
      listJudges: vi.fn(),
      setMetricsReporter: vi.fn(),
    }

    // Create sync manager with mocked dependencies
    syncManager = new JudgeSyncManager({
      supabase: mockSupabase as SupabaseClient,
      courtListener: mockCourtListener as CourtListenerClient,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('syncJudges()', () => {
    it('should complete successfully with empty database', async () => {
      const result = await syncManager.syncJudges({
        batchSize: 5,
        jurisdiction: 'CA',
      })

      expect(result.success).toBe(true)
      expect(result.judgesProcessed).toBe(0)
      expect(result.errors).toEqual([])
    })

    it('should respect per-run limits', async () => {
      // Mock judges needing update
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: Array(300)
              .fill(null)
              .map((_, i) => ({
                id: `judge-${i}`,
                courtlistener_id: `cl-${i}`,
                name: `Judge ${i}`,
                updated_at: '2024-01-01',
              })),
            error: null,
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'new-judge' }, error: null }),
          }),
        }),
      })) as any

      // Mock CourtListener responses
      mockCourtListener.getJudgeById = vi.fn().mockResolvedValue({
        id: 'cl-1',
        name: 'Test Judge',
        positions: [{ court: { name: 'Test Court' }, date_termination: null }],
      })

      const result = await syncManager.syncJudges({
        batchSize: 10,
      })

      // Should stop at 250 judges limit
      expect(result.judgesProcessed).toBeLessThanOrEqual(250)
    })

    it('should handle jurisdiction filtering', async () => {
      const result = await syncManager.syncJudges({
        jurisdiction: 'CA',
      })

      expect(mockSupabase.from).toHaveBeenCalled()
      expect(result.success).toBe(true)
    })

    it('should track errors without crashing', async () => {
      // Mock CourtListener failure
      mockCourtListener.getJudgeById = vi.fn().mockRejectedValue(new Error('API Error'))

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [{ id: 'judge-1', courtlistener_id: 'cl-1', name: 'Test Judge' }],
            error: null,
          }),
        }),
      })) as any

      const result = await syncManager.syncJudges()

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Retirement Detection', () => {
    it('should detect retired judge when all positions terminated', async () => {
      const existingJudge = {
        id: 'judge-123',
        name: 'Judge Smith',
        status: 'active',
      }

      const courtListenerData: CourtListenerJudge = {
        id: 'cl-123',
        name: 'Judge Smith',
        positions: [
          {
            id: 1,
            court_id: 'ca',
            date_start: '2000-01-01',
            date_termination: '2023-12-31', // Terminated
          },
          {
            id: 2,
            court_id: 'ca-superior',
            date_start: '2010-01-01',
            date_termination: '2023-12-31', // Terminated
          },
        ],
      }

      // Mock update call
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })
      mockSupabase.from = vi.fn(() => ({
        update: mockUpdate,
      })) as any

      // Access private method via any cast for testing
      const result = await (syncManager as any).detectAndMarkRetirement(
        existingJudge,
        courtListenerData
      )

      expect(result).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'retired',
        })
      )
    })

    it('should not mark as retired when active position exists', async () => {
      const existingJudge = {
        id: 'judge-123',
        name: 'Judge Smith',
        status: 'active',
      }

      const courtListenerData: CourtListenerJudge = {
        id: 'cl-123',
        name: 'Judge Smith',
        positions: [
          {
            id: 1,
            court_id: 'ca',
            date_start: '2000-01-01',
            date_termination: '2020-12-31', // Terminated
          },
          {
            id: 2,
            court_id: 'ca-superior',
            date_start: '2021-01-01',
            date_termination: undefined, // Still active
          },
        ],
      }

      const result = await (syncManager as any).detectAndMarkRetirement(
        existingJudge,
        courtListenerData
      )

      expect(result).toBe(false)
    })
  })

  describe('Profile Enhancement', () => {
    it('should enhance profile with education data', async () => {
      const judgeId = 'judge-123'
      const judgeData: CourtListenerJudge = {
        id: 'cl-123',
        name: 'Judge Smith',
        educations: [
          {
            school: 'Harvard Law',
            degree: 'JD',
            degree_year: '1995',
          },
          {
            school: 'Yale',
            degree: 'BA',
            degree_year: '1992',
          },
        ],
        positions: [
          {
            id: 1,
            position_type: 'Judge',
            court: { name: 'Superior Court', full_name: 'Superior Court of California' },
          },
        ],
      }

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })
      mockSupabase.from = vi.fn(() => ({
        update: mockUpdate,
      })) as any

      const result = await (syncManager as any).enhanceJudgeProfile(judgeId, judgeData)

      expect(result).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          education: expect.stringContaining('Harvard Law'),
        })
      )
    })

    it('should handle enhancement failure gracefully', async () => {
      const judgeId = 'judge-123'
      const judgeData: CourtListenerJudge = {
        id: 'cl-123',
        name: 'Judge Smith',
        educations: [],
      }

      mockSupabase.from = vi.fn(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Database error'),
          }),
        }),
      })) as any

      const result = await (syncManager as any).enhanceJudgeProfile(judgeId, judgeData)

      expect(result).toBe(false)
    })
  })

  describe('Batch Processing', () => {
    it('should process judges in batches', async () => {
      const judges = Array(25)
        .fill(null)
        .map((_, i) => ({
          id: `judge-${i}`,
          courtlistener_id: `cl-${i}`,
          name: `Judge ${i}`,
        }))

      mockCourtListener.getJudgeById = vi.fn().mockResolvedValue({
        id: 'cl-1',
        name: 'Test Judge',
        positions: [],
      })

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'judge-1' }, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      })) as any

      const result = await (syncManager as any).processBatch(judges, { batchSize: 10 })

      expect(result.processed).toBe(25)
      expect(mockCourtListener.getJudgeById).toHaveBeenCalledTimes(25)
    })

    it('should stop processing when run limits reached', async () => {
      // Artificially set run limits
      ;(syncManager as any).processedCount = 240
      ;(syncManager as any).createdCount = 145

      const judges = Array(50)
        .fill(null)
        .map((_, i) => ({
          id: `judge-${i}`,
          courtlistener_id: `cl-${i}`,
          name: `Judge ${i}`,
        }))

      mockCourtListener.getJudgeById = vi.fn().mockResolvedValue({
        id: 'cl-1',
        name: 'Test Judge',
        positions: [],
      })

      const result = await (syncManager as any).processBatch(judges, {})

      // Should stop early due to limits
      expect(result.processed).toBeLessThan(50)
      expect(result.errors).toContain(expect.stringContaining('Run limits reached'))
    })
  })

  describe('Error Handling', () => {
    it('should handle Supabase connection errors', async () => {
      mockSupabase.from = vi.fn(() => {
        throw new Error('Connection failed')
      }) as any

      const result = await syncManager.syncJudges()

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Sync failed')
    })

    it('should handle CourtListener API errors', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          not: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [{ id: 'judge-1', courtlistener_id: 'cl-1' }],
            error: null,
          }),
        }),
      })) as any

      mockCourtListener.getJudgeById = vi.fn().mockRejectedValue(new Error('404 Not Found'))

      const result = await syncManager.syncJudges()

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should log sync operations', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockUpdateLog = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      mockSupabase.from = vi.fn((table) => {
        if (table === 'sync_logs') {
          return {
            insert: mockInsert,
            update: mockUpdateLog,
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      }) as any

      await syncManager.syncJudges()

      expect(mockInsert).toHaveBeenCalled()
      expect(mockUpdateLog).toHaveBeenCalled()
    })
  })
})
