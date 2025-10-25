/**
 * State Bar Verification Client
 *
 * Provides integration with State Bar APIs for attorney verification.
 * California State Bar API integration with fallback to manual verification.
 *
 * @module lib/verification/state-bar-client
 */

import { logger } from '@/lib/utils/logger'

export interface BarVerificationResult {
  valid: boolean
  attorneyName?: string
  status?: 'active' | 'inactive' | 'suspended' | 'disbarred'
  licenseDate?: Date
  practiceAreas?: string[]
  address?: string
  phone?: string
  email?: string
  errorMessage?: string
  rawResponse?: any
}

export interface BarVerificationRequest {
  barNumber: string
  state: string
  lastName?: string
}

/**
 * Verify attorney bar number with California State Bar
 *
 * California State Bar provides a public search at:
 * https://apps.calbar.ca.gov/attorney/Licensee/Detail/{barNumber}
 *
 * Note: As of 2025, California State Bar does not provide a public API.
 * This implementation uses web scraping as a fallback. For production,
 * consider applying for official API access or using manual verification.
 *
 * @param request - Bar verification request details
 * @returns Verification result with attorney information
 */
export async function verifyBarNumber(
  request: BarVerificationRequest
): Promise<BarVerificationResult> {
  const { barNumber, state, lastName } = request

  try {
    // Validate inputs
    if (!barNumber || !state) {
      return {
        valid: false,
        errorMessage: 'Bar number and state are required',
      }
    }

    // Route to appropriate state handler
    switch (state.toUpperCase()) {
      case 'CA':
      case 'CALIFORNIA':
        return await verifyCaliforniaBar(barNumber, lastName)

      default:
        // For now, other states require manual verification
        return {
          valid: false,
          errorMessage: `Automated verification not available for ${state}. Manual verification required.`,
        }
    }
  } catch (error) {
    logger.error('Bar verification error', { error, barNumber, state })
    return {
      valid: false,
      errorMessage: 'Verification service temporarily unavailable',
    }
  }
}

/**
 * Verify California State Bar number
 *
 * Implementation notes:
 * - California State Bar does not provide a public API as of 2025
 * - Web scraping from https://apps.calbar.ca.gov is possible but fragile
 * - Rate limiting is essential to avoid blocking
 * - Consider this a Phase 2 feature - start with manual admin verification
 *
 * @param barNumber - California bar number
 * @param lastName - Optional last name for validation
 * @returns Verification result
 */
async function verifyCaliforniaBar(
  barNumber: string,
  lastName?: string
): Promise<BarVerificationResult> {
  // PHASE 1: Manual verification workflow
  // For production launch, all verifications go through admin approval
  // This prevents abuse and ensures quality control

  logger.info('CA Bar verification requested - manual approval required', {
    barNumber,
    lastName,
  })

  // Return pending status - admin will verify manually
  return {
    valid: false,
    errorMessage: 'California Bar verification requires manual admin approval',
  }

  // PHASE 2: Automated verification (future implementation)
  // Uncomment and implement when ready to automate
  /*
  try {
    // Clean bar number (CA bar numbers are typically 6 digits)
    const cleanBarNumber = barNumber.replace(/\D/g, '')

    if (cleanBarNumber.length !== 6) {
      return {
        valid: false,
        errorMessage: 'California bar numbers must be 6 digits',
      }
    }

    // Check rate limit before making external request
    const canProceed = await checkRateLimit('calbar', cleanBarNumber)
    if (!canProceed) {
      return {
        valid: false,
        errorMessage: 'Rate limit exceeded. Please try again later.',
      }
    }

    // Option A: Use California State Bar API (if available)
    // const apiResult = await fetchFromCalBarAPI(cleanBarNumber)

    // Option B: Web scraping (use with caution)
    const scrapeResult = await scrapeCalBarProfile(cleanBarNumber)

    if (!scrapeResult) {
      return {
        valid: false,
        errorMessage: 'Bar number not found in California State Bar records',
      }
    }

    // Validate last name if provided
    if (lastName && scrapeResult.attorneyName) {
      const nameMatch = scrapeResult.attorneyName
        .toLowerCase()
        .includes(lastName.toLowerCase())

      if (!nameMatch) {
        return {
          valid: false,
          errorMessage: 'Bar number does not match provided last name',
        }
      }
    }

    return scrapeResult
  } catch (error) {
    logger.error('CA Bar verification failed', { error, barNumber })
    return {
      valid: false,
      errorMessage: 'Unable to verify with California State Bar',
    }
  }
  */
}

/**
 * FUTURE: Scrape California State Bar profile
 *
 * This function would parse the public profile page to extract attorney info.
 * Implementation considerations:
 * - Use a headless browser (Puppeteer/Playwright) for dynamic content
 * - Parse HTML carefully as structure may change
 * - Implement retry logic with exponential backoff
 * - Cache results to reduce load on State Bar website
 * - Respect robots.txt and rate limits
 *
 * @param barNumber - California bar number
 * @returns Scraped profile data
 */
async function scrapeCalBarProfile(barNumber: string): Promise<BarVerificationResult | null> {
  // TODO: Implement web scraping
  // URL: https://apps.calbar.ca.gov/attorney/Licensee/Detail/${barNumber}

  return null
}

/**
 * Check rate limit for bar verification requests
 *
 * Implements rate limiting to prevent abuse and avoid being blocked
 * by State Bar websites.
 *
 * Rate limits:
 * - CA State Bar: 10 requests per minute per IP
 * - Per bar number: 1 request per hour (caching)
 *
 * @param state - State identifier
 * @param barNumber - Bar number being verified
 * @returns True if request is allowed
 */
async function checkRateLimit(state: string, barNumber: string): Promise<boolean> {
  // TODO: Implement with Redis or database-backed rate limiting
  // For now, allow all requests (manual verification handles abuse)
  return true
}

/**
 * Get cached verification result
 *
 * Checks if we have a recent verification result cached.
 * Reduces load on external services and improves response time.
 *
 * @param barNumber - Bar number to check
 * @param state - State identifier
 * @returns Cached result or null
 */
export async function getCachedVerification(
  barNumber: string,
  state: string
): Promise<BarVerificationResult | null> {
  // TODO: Implement caching with Redis or database
  // Cache TTL: 24 hours for successful verifications
  //           1 hour for failures (allow retry)
  return null
}

/**
 * Cache verification result
 *
 * @param barNumber - Bar number
 * @param state - State identifier
 * @param result - Verification result to cache
 */
export async function cacheVerification(
  barNumber: string,
  state: string,
  result: BarVerificationResult
): Promise<void> {
  // TODO: Implement caching
}

/**
 * Manual verification helper for admin dashboard
 *
 * Creates a verification record that can be manually approved/rejected
 * by admins in the dashboard.
 *
 * @param barNumber - Bar number
 * @param state - State identifier
 * @param userId - User requesting verification
 * @returns Verification request ID
 */
export async function createManualVerificationRequest(
  barNumber: string,
  state: string,
  userId: string
): Promise<string> {
  // This is handled by the verify-bar API route
  // Just a placeholder for future direct usage
  return `manual-${Date.now()}`
}
