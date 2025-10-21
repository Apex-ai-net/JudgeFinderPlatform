/**
 * Cloudflare Turnstile CAPTCHA verification utilities
 *
 * Turnstile is Cloudflare's free, privacy-friendly CAPTCHA alternative.
 * Used to prevent bot abuse on sensitive features like AI chat and sign-up.
 *
 * @see https://developers.cloudflare.com/turnstile/
 */

import { logger } from '@/lib/utils/logger'

export interface TurnstileVerifyResponse {
  success: boolean
  challenge_ts?: string
  hostname?: string
  'error-codes'?: string[]
  action?: string
  cdata?: string
}

/**
 * Verify a Turnstile token on the server-side
 *
 * @param token - The token received from the Turnstile widget
 * @param remoteIp - Optional IP address of the user (for additional validation)
 * @returns Promise<boolean> - True if verification succeeded, false otherwise
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  if (!secretKey) {
    logger.error('Turnstile secret key not configured', {
      scope: 'turnstile',
      action: 'verify',
    })
    // In development, allow requests to proceed if Turnstile is not configured
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Turnstile verification skipped in development mode')
      return true
    }
    return false
  }

  if (!token || token.trim() === '') {
    logger.warn('Turnstile token missing or empty', {
      scope: 'turnstile',
      action: 'verify',
    })
    return false
  }

  try {
    const formData = new FormData()
    formData.append('secret', secretKey)
    formData.append('response', token)
    if (remoteIp) {
      formData.append('remoteip', remoteIp)
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    })

    const data = (await response.json()) as TurnstileVerifyResponse

    if (!data.success) {
      logger.warn('Turnstile verification failed', {
        scope: 'turnstile',
        action: 'verify',
        errorCodes: data['error-codes'],
        hostname: data.hostname,
      })
      return false
    }

    logger.info('Turnstile verification succeeded', {
      scope: 'turnstile',
      action: 'verify',
      hostname: data.hostname,
      timestamp: data.challenge_ts,
    })

    return true
  } catch (error) {
    logger.error('Turnstile verification error', {
      scope: 'turnstile',
      action: 'verify',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return false
  }
}

/**
 * Check if Turnstile is properly configured
 * @returns boolean
 */
export function isTurnstileConfigured(): boolean {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const secretKey = process.env.TURNSTILE_SECRET_KEY

  return Boolean(siteKey && secretKey && siteKey.startsWith('0x') && secretKey.startsWith('0x'))
}

/**
 * Get the Turnstile site key for client-side widget
 * Returns a test key in development if not configured
 */
export function getTurnstileSiteKey(): string {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  // Cloudflare's official test keys (always passes)
  const TEST_SITE_KEY_ALWAYS_PASSES = '1x00000000000000000000AA'
  const TEST_SITE_KEY_ALWAYS_BLOCKS = '2x00000000000000000000AB'
  const TEST_SITE_KEY_FORCE_CHALLENGE = '3x00000000000000000000FF'

  if (!siteKey && process.env.NODE_ENV === 'development') {
    logger.warn('Turnstile site key not configured, using test key', {
      scope: 'turnstile',
      testKey: TEST_SITE_KEY_ALWAYS_PASSES,
    })
    return TEST_SITE_KEY_ALWAYS_PASSES
  }

  return siteKey || ''
}
