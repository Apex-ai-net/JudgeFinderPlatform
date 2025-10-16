import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getUserRole, getDashboardDataByRole } from '@/lib/auth/user-roles'

// Mock the Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(),
}))

describe('User Roles System', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    }
    vi.mocked(require('@/lib/supabase/server').createServiceRoleClient).mockResolvedValue(
      mockSupabase
    )
  })

  describe('getUserRole', () => {
    it('should detect advertiser role when advertiser_profiles record exists', async () => {
      const mockAdvertiserProfile = {
        id: 'adv-123',
        firm_name: 'Test Law Firm',
        firm_type: 'medium',
        verification_status: 'verified',
        account_status: 'active',
        total_spend: 5000,
        stripe_customer_id: 'cus_123',
      }

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockAdvertiserProfile,
              error: null,
            }),
          }),
        }),
      })

      const result = await getUserRole('user-123', 'clerk-123')

      expect(result.role).toBe('advertiser')
      expect(result.isAdvertiser).toBe(true)
      expect(result.isLegalProfessional).toBe(false)
      expect(result.isAdmin).toBe(false)
      expect(result.advertiserProfile).toEqual(mockAdvertiserProfile)
    })

    it('should default to legal_professional role when no advertiser profile exists', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      const result = await getUserRole('user-123', 'clerk-123')

      expect(result.role).toBe('legal_professional')
      expect(result.isAdvertiser).toBe(false)
      expect(result.isLegalProfessional).toBe(true)
      expect(result.isAdmin).toBe(false)
    })

    it('should handle table not found error gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'relation does not exist' },
            }),
          }),
        }),
      })

      const result = await getUserRole('user-123', 'clerk-123')

      expect(result.role).toBe('legal_professional')
      expect(result.isLegalProfessional).toBe(true)
    })

    it('should handle database query errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockRejectedValue(new Error('Database connection failed')),
          }),
        }),
      })

      const result = await getUserRole('user-123', 'clerk-123')

      expect(result.role).toBe('legal_professional')
      expect(result.isLegalProfessional).toBe(true)
    })
  })

  describe('getDashboardDataByRole', () => {
    it('should fetch advertiser dashboard data for advertiser role', async () => {
      const mockCampaigns = [
        {
          id: 'camp-1',
          name: 'Campaign 1',
          status: 'active',
          budget_total: 5000,
          budget_spent: 2500,
          impressions_total: 10000,
          clicks_total: 500,
        },
      ]

      const mockBookings = [
        {
          id: 'book-1',
          booking_status: 'active',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          price_paid: 500,
          impressions: 1000,
          clicks: 50,
        },
      ]

      const mockMetrics = [
        {
          impressions: 100,
          clicks: 5,
          ctr: 0.05,
          conversions: 1,
          spend: 50,
        },
      ]

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: mockCampaigns, error: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockBookings, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: mockMetrics, error: null }),
              }),
            }),
          }),
        })

      const result = await getDashboardDataByRole('user-123', 'advertiser')

      expect(result.campaigns).toEqual(mockCampaigns)
      expect(result.activeBookings).toEqual(mockBookings)
      expect(result.recentMetrics).toEqual(mockMetrics)
    })

    it('should fetch legal professional dashboard data', async () => {
      const mockBookmarks = [{ judge_id: 'judge-1' }, { judge_id: 'judge-2' }]
      const mockSavedSearches = [
        { id: 'search-1', search_query: 'civil cases', results_count: 100 },
      ]

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockBookmarks, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: mockSavedSearches, error: null }),
              }),
            }),
          }),
        })

      const result = await getDashboardDataByRole('user-123', 'legal_professional')

      expect(result.bookmarks).toEqual(mockBookmarks)
      expect(result.savedSearches).toEqual(mockSavedSearches)
    })

    it('should return empty arrays on database errors for advertiser role', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockRejectedValue(new Error('Database error')),
            }),
          }),
        }),
      })

      const result = await getDashboardDataByRole('user-123', 'advertiser')

      expect(result.campaigns).toEqual([])
      expect(result.activeBookings).toEqual([])
      expect(result.recentMetrics).toEqual([])
    })

    it('should return empty arrays on database errors for legal professional role', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      })

      const result = await getDashboardDataByRole('user-123', 'legal_professional')

      expect(result.bookmarks).toEqual([])
      expect(result.savedSearches).toEqual([])
    })
  })
})
