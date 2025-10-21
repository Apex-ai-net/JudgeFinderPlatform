/**
 * Unit tests for Turnstile CAPTCHA verification
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { verifyTurnstileToken, isTurnstileConfigured, getTurnstileSiteKey } from '@/lib/auth/turnstile'
import {
  TURNSTILE_TEST_TOKENS,
  TURNSTILE_API_RESPONSES,
} from '../../fixtures/auth'
import {
  mockTurnstileAPI,
  mockTurnstileAPIError,
  mockTurnstileAPINetworkError,
} from '../../helpers/auth-helpers'
import { mockEnv, restoreEnv } from '../../helpers/test-utils'

describe('Turnstile Verification', () => {
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.TURNSTILE_SECRET_KEY = '0xTEST_SECRET_KEY'
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = '0xTEST_SITE_KEY'
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    delete process.env.TURNSTILE_SECRET_KEY
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  })

  describe('verifyTurnstileToken', () => {
    it('should verify valid token successfully', async () => {
      mockTurnstileAPI(true)

      const result = await verifyTurnstileToken(TURNSTILE_TEST_TOKENS.VALID_TOKEN)

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      )
    })

    it('should verify token with IP address', async () => {
      mockTurnstileAPI(true)
      const clientIp = '192.168.1.1'

      const result = await verifyTurnstileToken(TURNSTILE_TEST_TOKENS.VALID_TOKEN, clientIp)

      expect(result).toBe(true)
      const call = vi.mocked(global.fetch).mock.calls[0]
      const formData = call[1]?.body as FormData
      expect(formData.get('remoteip')).toBe(clientIp)
    })

    it('should reject invalid token', async () => {
      mockTurnstileAPI(false)

      const result = await verifyTurnstileToken(TURNSTILE_TEST_TOKENS.INVALID_TOKEN)

      expect(result).toBe(false)
    })

    it('should reject empty token', async () => {
      const result = await verifyTurnstileToken('')

      expect(result).toBe(false)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should reject whitespace-only token', async () => {
      const result = await verifyTurnstileToken('   ')

      expect(result).toBe(false)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle missing secret key in production', async () => {
      process.env.NODE_ENV = 'production'
      delete process.env.TURNSTILE_SECRET_KEY

      const result = await verifyTurnstileToken(TURNSTILE_TEST_TOKENS.VALID_TOKEN)

      expect(result).toBe(false)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should allow requests in development when secret key is missing', async () => {
      process.env.NODE_ENV = 'development'
      delete process.env.TURNSTILE_SECRET_KEY

      const result = await verifyTurnstileToken(TURNSTILE_TEST_TOKENS.VALID_TOKEN)

      expect(result).toBe(true)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle API errors gracefully', async () => {
      mockTurnstileAPIError(['timeout-or-duplicate'])

      const result = await verifyTurnstileToken(TURNSTILE_TEST_TOKENS.VALID_TOKEN)

      expect(result).toBe(false)
    })

    it('should handle network errors gracefully', async () => {
      mockTurnstileAPINetworkError()

      const result = await verifyTurnstileToken(TURNSTILE_TEST_TOKENS.VALID_TOKEN)

      expect(result).toBe(false)
    })

    it('should handle expired tokens', async () => {
      mockTurnstileAPIError(['timeout-or-duplicate'])

      const result = await verifyTurnstileToken(TURNSTILE_TEST_TOKENS.EXPIRED_TOKEN)

      expect(result).toBe(false)
    })

    it('should handle rate limited tokens', async () => {
      mockTurnstileAPIError(['rate-limit'])

      const result = await verifyTurnstileToken(TURNSTILE_TEST_TOKENS.VALID_TOKEN)

      expect(result).toBe(false)
    })

    it('should include secret in FormData', async () => {
      mockTurnstileAPI(true)

      await verifyTurnstileToken(TURNSTILE_TEST_TOKENS.VALID_TOKEN)

      const call = vi.mocked(global.fetch).mock.calls[0]
      const formData = call[1]?.body as FormData
      expect(formData.get('secret')).toBe('0xTEST_SECRET_KEY')
      expect(formData.get('response')).toBe(TURNSTILE_TEST_TOKENS.VALID_TOKEN)
    })
  })

  describe('isTurnstileConfigured', () => {
    it('should return true when both keys are configured', () => {
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = '0xSITE_KEY'
      process.env.TURNSTILE_SECRET_KEY = '0xSECRET_KEY'

      expect(isTurnstileConfigured()).toBe(true)
    })

    it('should return false when site key is missing', () => {
      delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

      expect(isTurnstileConfigured()).toBe(false)
    })

    it('should return false when secret key is missing', () => {
      delete process.env.TURNSTILE_SECRET_KEY

      expect(isTurnstileConfigured()).toBe(false)
    })

    it('should return false when both keys are missing', () => {
      delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
      delete process.env.TURNSTILE_SECRET_KEY

      expect(isTurnstileConfigured()).toBe(false)
    })

    it('should return false when keys do not start with 0x', () => {
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'INVALID_SITE_KEY'
      process.env.TURNSTILE_SECRET_KEY = 'INVALID_SECRET_KEY'

      expect(isTurnstileConfigured()).toBe(false)
    })
  })

  describe('getTurnstileSiteKey', () => {
    it('should return configured site key', () => {
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = '0xMY_SITE_KEY'

      expect(getTurnstileSiteKey()).toBe('0xMY_SITE_KEY')
    })

    it('should return test key in development when not configured', () => {
      process.env.NODE_ENV = 'development'
      delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

      const siteKey = getTurnstileSiteKey()

      expect(siteKey).toBe('1x00000000000000000000AA')
    })

    it('should return empty string in production when not configured', () => {
      process.env.NODE_ENV = 'production'
      delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

      expect(getTurnstileSiteKey()).toBe('')
    })
  })

  describe('Error Code Handling', () => {
    it('should handle missing-input-secret error', async () => {
      mockTurnstileAPIError(['missing-input-secret'])

      const result = await verifyTurnstileToken(TURNSTILE_TEST_TOKENS.VALID_TOKEN)

      expect(result).toBe(false)
    })

    it('should handle invalid-input-secret error', async () => {
      mockTurnstileAPIError(['invalid-input-secret'])

      const result = await verifyTurnstileToken(TURNSTILE_TEST_TOKENS.VALID_TOKEN)

      expect(result).toBe(false)
    })

    it('should handle missing-input-response error', async () => {
      mockTurnstileAPIError(['missing-input-response'])

      const result = await verifyTurnstileToken(TURNSTILE_TEST_TOKENS.VALID_TOKEN)

      expect(result).toBe(false)
    })

    it('should handle invalid-input-response error', async () => {
      mockTurnstileAPIError(['invalid-input-response'])

      const result = await verifyTurnstileToken(TURNSTILE_TEST_TOKENS.VALID_TOKEN)

      expect(result).toBe(false)
    })

    it('should handle bad-request error', async () => {
      mockTurnstileAPIError(['bad-request'])

      const result = await verifyTurnstileToken(TURNSTILE_TEST_TOKENS.VALID_TOKEN)

      expect(result).toBe(false)
    })

    it('should handle internal-error', async () => {
      mockTurnstileAPIError(['internal-error'])

      const result = await verifyTurnstileToken(TURNSTILE_TEST_TOKENS.VALID_TOKEN)

      expect(result).toBe(false)
    })
  })
})
