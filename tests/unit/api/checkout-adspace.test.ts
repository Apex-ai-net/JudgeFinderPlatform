/**
 * Unit tests for checkout adspace API endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/checkout/adspace/route'
import { NextRequest } from 'next/server'
import { createMockCheckoutSession, createStripeApiError } from '@/tests/helpers/stripe'

// Mock dependencies
vi.mock('@/lib/stripe/client', () => ({
  isStripeConfigured: vi.fn(),
  createCheckoutSession: vi.fn(),
}))

vi.mock('@/lib/security/rate-limit', () => ({
  buildRateLimiter: vi.fn(),
  getClientIp: vi.fn(),
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('POST /api/checkout/adspace', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    // Default mocks - can be overridden in individual tests
    const { isStripeConfigured } = vi.mocked(await import('@/lib/stripe/client'))
    isStripeConfigured.mockReturnValue(true)

    // Mock rate limiter
    const { buildRateLimiter, getClientIp } = vi.mocked(await import('@/lib/security/rate-limit'))
    getClientIp.mockReturnValue('127.0.0.1')
    buildRateLimiter.mockReturnValue({
      limit: vi.fn().mockResolvedValue({ success: true, remaining: 9 }),
    } as never)
  })

  it('returns 503 when Stripe not configured', async () => {
    const { isStripeConfigured } = vi.mocked(await import('@/lib/stripe/client'))
    isStripeConfigured.mockReturnValue(false)

    const request = new NextRequest('http://localhost/api/checkout/adspace', {
      method: 'POST',
      body: JSON.stringify({
        organization_name: 'Test Org',
        email: 'test@example.com',
        ad_type: 'judge-profile',
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(503)
    expect(json.error).toContain('not configured')
  })

  it('returns 429 when rate limit exceeded', async () => {
    const { buildRateLimiter } = vi.mocked(await import('@/lib/security/rate-limit'))
    buildRateLimiter.mockReturnValue({
      limit: vi.fn().mockResolvedValue({ success: false, remaining: 0 }),
    } as never)

    const request = new NextRequest('http://localhost/api/checkout/adspace', {
      method: 'POST',
      body: JSON.stringify({
        organization_name: 'Test Org',
        email: 'test@example.com',
        ad_type: 'judge-profile',
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(429)
    expect(json.error).toContain('Too many checkout attempts')
  })

  it('returns 400 when missing organization_name', async () => {
    const request = new NextRequest('http://localhost/api/checkout/adspace', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        ad_type: 'judge-profile',
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toContain('Missing required fields')
  })

  it('returns 400 when missing email', async () => {
    const request = new NextRequest('http://localhost/api/checkout/adspace', {
      method: 'POST',
      body: JSON.stringify({
        organization_name: 'Test Org',
        ad_type: 'judge-profile',
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toContain('Missing required fields')
  })

  it('returns 400 when missing ad_type', async () => {
    const request = new NextRequest('http://localhost/api/checkout/adspace', {
      method: 'POST',
      body: JSON.stringify({
        organization_name: 'Test Org',
        email: 'test@example.com',
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toContain('Missing required fields')
  })

  it('returns 400 when email format is invalid', async () => {
    const request = new NextRequest('http://localhost/api/checkout/adspace', {
      method: 'POST',
      body: JSON.stringify({
        organization_name: 'Test Org',
        email: 'invalid-email',
        ad_type: 'judge-profile',
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toContain('Invalid email address')
  })

  it('returns 400 when email is missing @ symbol', async () => {
    const request = new NextRequest('http://localhost/api/checkout/adspace', {
      method: 'POST',
      body: JSON.stringify({
        organization_name: 'Test Org',
        email: 'testexample.com',
        ad_type: 'judge-profile',
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toContain('Invalid email address')
  })

  it('returns 400 when ad_type is invalid', async () => {
    const request = new NextRequest('http://localhost/api/checkout/adspace', {
      method: 'POST',
      body: JSON.stringify({
        organization_name: 'Test Org',
        email: 'test@example.com',
        ad_type: 'invalid-type',
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toContain('Invalid ad_type')
    expect(json.error).toContain('judge-profile')
    expect(json.error).toContain('court-listing')
    expect(json.error).toContain('featured-spot')
  })

  it('returns 200 with session_url on success', async () => {
    const mockSession = createMockCheckoutSession({
      url: 'https://checkout.stripe.com/session_123',
      id: 'cs_test_123',
    })

    const { createCheckoutSession } = vi.mocked(await import('@/lib/stripe/client'))
    createCheckoutSession.mockResolvedValue(mockSession)

    const request = new NextRequest('http://localhost/api/checkout/adspace', {
      method: 'POST',
      body: JSON.stringify({
        organization_name: 'Test Org',
        email: 'test@example.com',
        ad_type: 'judge-profile',
        notes: 'Test notes',
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.session_url).toBe('https://checkout.stripe.com/session_123')
    expect(json.session_id).toBe('cs_test_123')
  })

  it('includes rate_limit_remaining in response', async () => {
    const mockSession = createMockCheckoutSession()
    const { createCheckoutSession } = vi.mocked(await import('@/lib/stripe/client'))
    createCheckoutSession.mockResolvedValue(mockSession)

    const { buildRateLimiter } = vi.mocked(await import('@/lib/security/rate-limit'))
    buildRateLimiter.mockReturnValue({
      limit: vi.fn().mockResolvedValue({ success: true, remaining: 7 }),
    } as never)

    const request = new NextRequest('http://localhost/api/checkout/adspace', {
      method: 'POST',
      body: JSON.stringify({
        organization_name: 'Test Org',
        email: 'test@example.com',
        ad_type: 'judge-profile',
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(json.rate_limit_remaining).toBe(7)
  })

  it('passes correct metadata to Stripe', async () => {
    const mockSession = createMockCheckoutSession()
    const { createCheckoutSession } = vi.mocked(await import('@/lib/stripe/client'))
    createCheckoutSession.mockResolvedValue(mockSession)

    const request = new NextRequest('http://localhost/api/checkout/adspace', {
      method: 'POST',
      body: JSON.stringify({
        organization_name: 'Test Organization',
        email: 'test@example.com',
        ad_type: 'court-listing',
        notes: 'Looking for high visibility placement',
      }),
    })

    await POST(request)

    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_email: 'test@example.com',
        metadata: expect.objectContaining({
          organization_name: 'Test Organization',
          ad_type: 'court-listing',
          notes: 'Looking for high visibility placement',
          client_ip: '127.0.0.1',
          created_at: expect.any(String),
        }),
      })
    )
  })

  it('passes empty string for notes when not provided', async () => {
    const mockSession = createMockCheckoutSession()
    const { createCheckoutSession } = vi.mocked(await import('@/lib/stripe/client'))
    createCheckoutSession.mockResolvedValue(mockSession)

    const request = new NextRequest('http://localhost/api/checkout/adspace', {
      method: 'POST',
      body: JSON.stringify({
        organization_name: 'Test Org',
        email: 'test@example.com',
        ad_type: 'judge-profile',
      }),
    })

    await POST(request)

    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          notes: '',
        }),
      })
    )
  })

  it('handles Stripe API errors gracefully', async () => {
    const stripeError = createStripeApiError('Rate limit exceeded', 'rate_limit')
    const { createCheckoutSession } = vi.mocked(await import('@/lib/stripe/client'))
    createCheckoutSession.mockRejectedValue(stripeError)

    const request = new NextRequest('http://localhost/api/checkout/adspace', {
      method: 'POST',
      body: JSON.stringify({
        organization_name: 'Test Org',
        email: 'test@example.com',
        ad_type: 'judge-profile',
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toContain('Payment system error')
  })

  it('includes error details in development mode', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const stripeError = createStripeApiError('Detailed error message', 'api_error')
    const { createCheckoutSession } = vi.mocked(await import('@/lib/stripe/client'))
    createCheckoutSession.mockRejectedValue(stripeError)

    const request = new NextRequest('http://localhost/api/checkout/adspace', {
      method: 'POST',
      body: JSON.stringify({
        organization_name: 'Test Org',
        email: 'test@example.com',
        ad_type: 'judge-profile',
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(json.details).toBe('Detailed error message')

    process.env.NODE_ENV = originalEnv
  })

  it('logs checkout session creation', async () => {
    const mockSession = createMockCheckoutSession({
      id: 'cs_test_456',
    })
    const { createCheckoutSession } = vi.mocked(await import('@/lib/stripe/client'))
    createCheckoutSession.mockResolvedValue(mockSession)

    const { logger } = await import('@/lib/utils/logger')

    const request = new NextRequest('http://localhost/api/checkout/adspace', {
      method: 'POST',
      body: JSON.stringify({
        organization_name: 'Test Org',
        email: 'test@example.com',
        ad_type: 'featured-spot',
      }),
    })

    await POST(request)

    expect(logger.info).toHaveBeenCalledWith('Checkout session created', {
      session_id: 'cs_test_456',
      organization_name: 'Test Org',
      email: 'test@example.com',
      ad_type: 'featured-spot',
    })
  })

  it('logs errors when checkout fails', async () => {
    const error = new Error('Network error')
    const { createCheckoutSession } = vi.mocked(await import('@/lib/stripe/client'))
    createCheckoutSession.mockRejectedValue(error)

    const { logger } = await import('@/lib/utils/logger')

    const request = new NextRequest('http://localhost/api/checkout/adspace', {
      method: 'POST',
      body: JSON.stringify({
        organization_name: 'Test Org',
        email: 'test@example.com',
        ad_type: 'judge-profile',
      }),
    })

    await POST(request)

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to create checkout session',
      {},
      expect.any(Error)
    )
  })

  it('accepts all valid ad types', async () => {
    const mockSession = createMockCheckoutSession()
    const { createCheckoutSession } = vi.mocked(await import('@/lib/stripe/client'))
    createCheckoutSession.mockResolvedValue(mockSession)

    const validAdTypes = ['judge-profile', 'court-listing', 'featured-spot']

    for (const ad_type of validAdTypes) {
      const request = new NextRequest('http://localhost/api/checkout/adspace', {
        method: 'POST',
        body: JSON.stringify({
          organization_name: 'Test Org',
          email: 'test@example.com',
          ad_type,
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    }
  })

  it('uses correct success and cancel URLs', async () => {
    const mockSession = createMockCheckoutSession()
    const { createCheckoutSession } = vi.mocked(await import('@/lib/stripe/client'))
    createCheckoutSession.mockResolvedValue(mockSession)

    const request = new NextRequest('http://localhost/api/checkout/adspace', {
      method: 'POST',
      body: JSON.stringify({
        organization_name: 'Test Org',
        email: 'test@example.com',
        ad_type: 'judge-profile',
      }),
    })

    await POST(request)

    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: expect.stringContaining('/ads/success?session_id='),
        cancel_url: expect.stringContaining('/ads/buy?canceled=true'),
      })
    )
  })

  it('handles non-Error exceptions', async () => {
    const { createCheckoutSession } = vi.mocked(await import('@/lib/stripe/client'))
    createCheckoutSession.mockRejectedValue('String error')

    const request = new NextRequest('http://localhost/api/checkout/adspace', {
      method: 'POST',
      body: JSON.stringify({
        organization_name: 'Test Org',
        email: 'test@example.com',
        ad_type: 'judge-profile',
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toContain('Failed to create checkout session')
  })

  it('calls rate limiter with correct prefix and window', async () => {
    const mockSession = createMockCheckoutSession()
    const { createCheckoutSession } = vi.mocked(await import('@/lib/stripe/client'))
    createCheckoutSession.mockResolvedValue(mockSession)

    const { buildRateLimiter } = vi.mocked(await import('@/lib/security/rate-limit'))
    const mockLimit = vi.fn().mockResolvedValue({ success: true, remaining: 9 })
    buildRateLimiter.mockReturnValue({
      limit: mockLimit,
    } as never)

    const request = new NextRequest('http://localhost/api/checkout/adspace', {
      method: 'POST',
      body: JSON.stringify({
        organization_name: 'Test Org',
        email: 'test@example.com',
        ad_type: 'judge-profile',
      }),
    })

    await POST(request)

    expect(buildRateLimiter).toHaveBeenCalledWith({
      tokens: 10,
      window: '1 h',
      prefix: 'api:checkout:adspace',
    })
    expect(mockLimit).toHaveBeenCalledWith('127.0.0.1:global')
  })
})
