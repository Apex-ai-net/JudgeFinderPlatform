/**
 * Unit tests for admin authorization logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isAdmin, resolveAdminStatus, requireAdmin } from '@/lib/auth/is-admin'
import type { AppUserRecord } from '@/lib/auth/user-mapping'

// Mock dependencies
vi.mock('@/lib/auth/safe-auth', () => ({
  safeAuth: vi.fn(async () => ({ userId: 'test-user-id' })),
}))

vi.mock('@/lib/auth/user-mapping', () => ({
  ensureCurrentAppUser: vi.fn(),
  fetchCurrentAppUser: vi.fn(),
}))

describe('Admin Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('resolveAdminStatus', () => {
    it('should return admin status for admin user', async () => {
      const { ensureCurrentAppUser } = await import('@/lib/auth/user-mapping')
      const mockAdminUser: AppUserRecord = {
        clerk_user_id: 'clerk_123',
        email: 'admin@judgefinder.io',
        full_name: 'Admin User',
        is_admin: true,
        last_seen_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      vi.mocked(ensureCurrentAppUser).mockResolvedValue(mockAdminUser)

      const result = await resolveAdminStatus()

      expect(result.isAdmin).toBe(true)
      expect(result.user).toEqual(mockAdminUser)
      expect(ensureCurrentAppUser).toHaveBeenCalledTimes(1)
    })

    it('should return non-admin status for regular user', async () => {
      const { ensureCurrentAppUser } = await import('@/lib/auth/user-mapping')
      const mockRegularUser: AppUserRecord = {
        clerk_user_id: 'clerk_456',
        email: 'user@example.com',
        full_name: 'Regular User',
        is_admin: false,
        last_seen_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      vi.mocked(ensureCurrentAppUser).mockResolvedValue(mockRegularUser)

      const result = await resolveAdminStatus()

      expect(result.isAdmin).toBe(false)
      expect(result.user).toEqual(mockRegularUser)
    })

    it('should return false for null user', async () => {
      const { ensureCurrentAppUser } = await import('@/lib/auth/user-mapping')
      vi.mocked(ensureCurrentAppUser).mockResolvedValue(null)

      const result = await resolveAdminStatus()

      expect(result.isAdmin).toBe(false)
      expect(result.user).toBeNull()
    })
  })

  describe('isAdmin', () => {
    it('should return true for admin user', async () => {
      const { ensureCurrentAppUser } = await import('@/lib/auth/user-mapping')
      vi.mocked(ensureCurrentAppUser).mockResolvedValue({
        clerk_user_id: 'clerk_123',
        email: 'admin@judgefinder.io',
        full_name: 'Admin User',
        is_admin: true,
        last_seen_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })

      const result = await isAdmin()

      expect(result).toBe(true)
    })

    it('should return false for non-admin user', async () => {
      const { ensureCurrentAppUser } = await import('@/lib/auth/user-mapping')
      vi.mocked(ensureCurrentAppUser).mockResolvedValue({
        clerk_user_id: 'clerk_456',
        email: 'user@example.com',
        full_name: 'Regular User',
        is_admin: false,
        last_seen_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })

      const result = await isAdmin()

      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      const { ensureCurrentAppUser } = await import('@/lib/auth/user-mapping')
      vi.mocked(ensureCurrentAppUser).mockRejectedValue(new Error('Database error'))

      const result = await isAdmin()

      expect(result).toBe(false)
    })
  })

  describe('requireAdmin', () => {
    it('should not throw for admin user', async () => {
      const { ensureCurrentAppUser } = await import('@/lib/auth/user-mapping')

      vi.mocked(ensureCurrentAppUser).mockResolvedValue({
        clerk_user_id: 'clerk_123',
        email: 'admin@judgefinder.io',
        full_name: 'Admin User',
        is_admin: true,
        last_seen_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })

      await expect(requireAdmin()).resolves.not.toThrow()
    })

    it('should throw for non-admin user', async () => {
      const { ensureCurrentAppUser } = await import('@/lib/auth/user-mapping')

      vi.mocked(ensureCurrentAppUser).mockResolvedValue({
        clerk_user_id: 'clerk_456',
        email: 'user@example.com',
        full_name: 'Regular User',
        is_admin: false,
        last_seen_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })

      await expect(requireAdmin()).rejects.toThrow('Admin access required')
    })

    it('should throw for unauthenticated user', async () => {
      const { ensureCurrentAppUser } = await import('@/lib/auth/user-mapping')
      vi.mocked(ensureCurrentAppUser).mockResolvedValue(null)

      await expect(requireAdmin()).rejects.toThrow('Authentication required')
    })
  })
})
