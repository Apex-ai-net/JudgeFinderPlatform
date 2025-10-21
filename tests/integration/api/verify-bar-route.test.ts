/**
 * Integration tests for /api/advertising/verify-bar route
 * Tests bar number verification and advertiser role assignment
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/advertising/verify-bar/route'
import {
  mockAuthenticatedSession,
  mockUnauthenticatedSession,
  mockTurnstileAPI,
  createMockRequest,
  extractJSON,
  mockSupabaseUserQuery,
} from '../../helpers/auth-helpers'
import {
  TURNSTILE_TEST_TOKENS,
  VALID_BAR_NUMBERS,
  INVALID_BAR_NUMBERS,
} from '../../fixtures/auth'

describe('POST /api/advertising/verify-bar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.TURNSTILE_SECRET_KEY = '0xTEST_SECRET_KEY'
  })

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      mockUnauthenticatedSession()

      const request = createMockRequest('http://localhost:3000/api/advertising/verify-bar', {
        method: 'POST',
        body: {
          barNumber: VALID_BAR_NUMBERS.california,
          barState: 'CA',
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      const response = await POST(request)
      const json = await extractJSON<{ error: string }>(response)

      expect(response.status).toBe(401)
      expect(json.error).toContain('Authentication required')
    })

    it('should accept authenticated requests', async () => {
      mockAuthenticatedSession('user-123')
      mockTurnstileAPI(true)

      // Mock Supabase
      vi.doMock('@/lib/supabase/server', () => ({
        createServerClient: vi.fn().mockResolvedValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
            }),
          }),
        }),
      }))

      const request = createMockRequest('http://localhost:3000/api/advertising/verify-bar', {
        method: 'POST',
        body: {
          barNumber: VALID_BAR_NUMBERS.california,
          barState: 'CA',
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Turnstile Verification', () => {
    it('should verify Turnstile token', async () => {
      mockAuthenticatedSession('user-123')
      mockTurnstileAPI(true)

      vi.doMock('@/lib/supabase/server', () => ({
        createServerClient: vi.fn().mockResolvedValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
            }),
          }),
        }),
      }))

      const request = createMockRequest('http://localhost:3000/api/advertising/verify-bar', {
        method: 'POST',
        body: {
          barNumber: VALID_BAR_NUMBERS.california,
          barState: 'CA',
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      const response = await POST(request)

      expect(global.fetch).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.any(Object)
      )
    })

    it('should reject invalid Turnstile token', async () => {
      mockAuthenticatedSession('user-123')
      mockTurnstileAPI(false)

      const request = createMockRequest('http://localhost:3000/api/advertising/verify-bar', {
        method: 'POST',
        body: {
          barNumber: VALID_BAR_NUMBERS.california,
          barState: 'CA',
          turnstileToken: TURNSTILE_TEST_TOKENS.INVALID_TOKEN,
        },
      })

      const response = await POST(request)
      const json = await extractJSON<{ error: string }>(response)

      expect(response.status).toBe(403)
      expect(json.error).toContain('CAPTCHA verification failed')
    })

    it('should allow request without Turnstile token (optional)', async () => {
      mockAuthenticatedSession('user-123')

      vi.doMock('@/lib/supabase/server', () => ({
        createServerClient: vi.fn().mockResolvedValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
            }),
          }),
        }),
      }))

      const request = createMockRequest('http://localhost:3000/api/advertising/verify-bar', {
        method: 'POST',
        body: {
          barNumber: VALID_BAR_NUMBERS.california,
          barState: 'CA',
        },
      })

      const response = await POST(request)

      // Should fail due to missing fields, but not due to Turnstile
      expect(response.status).not.toBe(403)
    })
  })

  describe('Bar Number Validation', () => {
    it('should accept valid California bar number', async () => {
      mockAuthenticatedSession('user-123')
      mockTurnstileAPI(true)

      vi.doMock('@/lib/supabase/server', () => ({
        createServerClient: vi.fn().mockResolvedValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
            }),
          }),
        }),
      }))

      const request = createMockRequest('http://localhost:3000/api/advertising/verify-bar', {
        method: 'POST',
        body: {
          barNumber: VALID_BAR_NUMBERS.california,
          barState: 'CA',
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      const response = await POST(request)
      const json = await extractJSON<{ success: boolean; barNumber: string }>(response)

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.barNumber).toBe(VALID_BAR_NUMBERS.california)
    })

    it('should normalize bar number to uppercase', async () => {
      mockAuthenticatedSession('user-123')
      mockTurnstileAPI(true)

      vi.doMock('@/lib/supabase/server', () => ({
        createServerClient: vi.fn().mockResolvedValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
            }),
          }),
        }),
      }))

      const request = createMockRequest('http://localhost:3000/api/advertising/verify-bar', {
        method: 'POST',
        body: {
          barNumber: 'ca123456',
          barState: 'CA',
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      const response = await POST(request)
      const json = await extractJSON<{ success: boolean; barNumber: string }>(response)

      expect(response.status).toBe(200)
      expect(json.barNumber).toBe('CA123456')
    })

    it('should trim whitespace from bar number', async () => {
      mockAuthenticatedSession('user-123')
      mockTurnstileAPI(true)

      vi.doMock('@/lib/supabase/server', () => ({
        createServerClient: vi.fn().mockResolvedValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
            }),
          }),
        }),
      }))

      const request = createMockRequest('http://localhost:3000/api/advertising/verify-bar', {
        method: 'POST',
        body: {
          barNumber: '  CA123456  ',
          barState: 'CA',
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      const response = await POST(request)
      const json = await extractJSON<{ success: boolean; barNumber: string }>(response)

      expect(response.status).toBe(200)
      expect(json.barNumber).toBe('CA123456')
    })

    it('should reject invalid bar number format', async () => {
      mockAuthenticatedSession('user-123')
      mockTurnstileAPI(true)

      const request = createMockRequest('http://localhost:3000/api/advertising/verify-bar', {
        method: 'POST',
        body: {
          barNumber: INVALID_BAR_NUMBERS.invalidChars,
          barState: 'CA',
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      const response = await POST(request)
      const json = await extractJSON<{ error: string }>(response)

      expect(response.status).toBe(400)
      expect(json.error).toContain('Invalid bar number format')
    })

    it('should reject bar number that is too short', async () => {
      mockAuthenticatedSession('user-123')
      mockTurnstileAPI(true)

      const request = createMockRequest('http://localhost:3000/api/advertising/verify-bar', {
        method: 'POST',
        body: {
          barNumber: 'CA',
          barState: 'CA',
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      const response = await POST(request)
      const json = await extractJSON<{ error: string }>(response)

      expect(response.status).toBe(400)
      expect(json.error).toContain('Invalid bar number format')
    })

    it('should reject bar number that is too long', async () => {
      mockAuthenticatedSession('user-123')
      mockTurnstileAPI(true)

      const request = createMockRequest('http://localhost:3000/api/advertising/verify-bar', {
        method: 'POST',
        body: {
          barNumber: 'CA' + '1'.repeat(30),
          barState: 'CA',
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      const response = await POST(request)
      const json = await extractJSON<{ error: string }>(response)

      expect(response.status).toBe(400)
      expect(json.error).toContain('Invalid bar number format')
    })

    it('should reject missing bar number', async () => {
      mockAuthenticatedSession('user-123')

      const request = createMockRequest('http://localhost:3000/api/advertising/verify-bar', {
        method: 'POST',
        body: {
          barState: 'CA',
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      const response = await POST(request)
      const json = await extractJSON<{ error: string }>(response)

      expect(response.status).toBe(400)
      expect(json.error).toContain('Bar number and state are required')
    })

    it('should reject missing bar state', async () => {
      mockAuthenticatedSession('user-123')

      const request = createMockRequest('http://localhost:3000/api/advertising/verify-bar', {
        method: 'POST',
        body: {
          barNumber: VALID_BAR_NUMBERS.california,
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      const response = await POST(request)
      const json = await extractJSON<{ error: string }>(response)

      expect(response.status).toBe(400)
      expect(json.error).toContain('Bar number and state are required')
    })
  })

  describe('Duplicate Bar Number Detection', () => {
    it('should detect duplicate bar number for different user', async () => {
      mockAuthenticatedSession('user-123')
      mockTurnstileAPI(true)

      // Mock existing user with same bar number
      vi.doMock('@/lib/supabase/server', () => ({
        createServerClient: vi.fn().mockResolvedValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'different-user-id' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }))

      const request = createMockRequest('http://localhost:3000/api/advertising/verify-bar', {
        method: 'POST',
        body: {
          barNumber: VALID_BAR_NUMBERS.california,
          barState: 'CA',
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      const response = await POST(request)
      const json = await extractJSON<{ error: string }>(response)

      expect(response.status).toBe(409)
      expect(json.error).toContain('already registered')
    })

    it('should allow updating own bar number', async () => {
      const userId = 'user-123'
      mockAuthenticatedSession(userId)
      mockTurnstileAPI(true)

      // Mock existing user with same ID
      vi.doMock('@/lib/supabase/server', () => ({
        createServerClient: vi.fn().mockResolvedValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: userId },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
            }),
          }),
        }),
      }))

      const request = createMockRequest('http://localhost:3000/api/advertising/verify-bar', {
        method: 'POST',
        body: {
          barNumber: VALID_BAR_NUMBERS.california,
          barState: 'CA',
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Role Assignment', () => {
    it('should set verification_status to verified', async () => {
      mockAuthenticatedSession('user-123')
      mockTurnstileAPI(true)

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      })

      vi.doMock('@/lib/supabase/server', () => ({
        createServerClient: vi.fn().mockResolvedValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            update: updateMock,
          }),
        }),
      }))

      const request = createMockRequest('http://localhost:3000/api/advertising/verify-bar', {
        method: 'POST',
        body: {
          barNumber: VALID_BAR_NUMBERS.california,
          barState: 'CA',
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      await POST(request)

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          verification_status: 'verified',
          user_role: 'advertiser',
        })
      )
    })

    it('should return success message with advertiser access', async () => {
      mockAuthenticatedSession('user-123')
      mockTurnstileAPI(true)

      vi.doMock('@/lib/supabase/server', () => ({
        createServerClient: vi.fn().mockResolvedValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
            }),
          }),
        }),
      }))

      const request = createMockRequest('http://localhost:3000/api/advertising/verify-bar', {
        method: 'POST',
        body: {
          barNumber: VALID_BAR_NUMBERS.california,
          barState: 'CA',
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      const response = await POST(request)
      const json = await extractJSON<{ success: boolean; message: string }>(response)

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.message).toContain('advertiser access')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockAuthenticatedSession('user-123')
      mockTurnstileAPI(true)

      vi.doMock('@/lib/supabase/server', () => ({
        createServerClient: vi.fn().mockResolvedValue({
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      }))

      const request = createMockRequest('http://localhost:3000/api/advertising/verify-bar', {
        method: 'POST',
        body: {
          barNumber: VALID_BAR_NUMBERS.california,
          barState: 'CA',
          turnstileToken: TURNSTILE_TEST_TOKENS.VALID_TOKEN,
        },
      })

      const response = await POST(request)
      const json = await extractJSON<{ error: string }>(response)

      expect(response.status).toBe(500)
      expect(json.error).toContain('Failed to update user information')
    })
  })
})
