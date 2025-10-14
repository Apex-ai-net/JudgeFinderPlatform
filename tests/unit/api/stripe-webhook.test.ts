/**
 * Unit tests for Stripe webhook handler
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/stripe/webhook/route'
import { NextRequest } from 'next/server'
import {
  createCheckoutSessionCompletedEvent,
  createCheckoutSessionExpiredEvent,
  createMockWebhookEvent,
  createMockCheckoutSession,
  createStripeSignatureVerificationError,
} from '@/tests/helpers/stripe'

// Mock dependencies
vi.mock('@/lib/stripe/client', () => ({
  verifyWebhookSignature: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when signature header is missing', async () => {
    const request = new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      body: JSON.stringify({ type: 'test' }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toContain('Missing signature')

    const { logger } = await import('@/lib/utils/logger')
    expect(logger.error).toHaveBeenCalledWith('Missing Stripe signature header')
  })

  it('returns 400 when signature verification fails', async () => {
    const { verifyWebhookSignature } = vi.mocked(await import('@/lib/stripe/client'))
    verifyWebhookSignature.mockImplementation(() => {
      throw createStripeSignatureVerificationError()
    })

    const request = new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': 'invalid-signature',
      },
      body: 'raw-body',
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toContain('Invalid signature')

    const { logger } = await import('@/lib/utils/logger')
    expect(logger.error).toHaveBeenCalledWith(
      'Webhook signature verification failed',
      {},
      expect.any(Error)
    )
  })

  it('returns 200 when event processed successfully', async () => {
    const event = createCheckoutSessionCompletedEvent()
    const { verifyWebhookSignature } = vi.mocked(await import('@/lib/stripe/client'))
    verifyWebhookSignature.mockReturnValue(event)

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'order_123' },
          error: null,
        }),
      }),
    })

    const { createServerClient } = vi.mocked(await import('@/lib/supabase/server'))
    createServerClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    } as never)

    const request = new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': 'valid-signature',
      },
      body: JSON.stringify(event),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.received).toBe(true)
  })

  it('creates order record for checkout.session.completed', async () => {
    const session = createMockCheckoutSession({
      id: 'cs_test_123',
      payment_intent: 'pi_test_123',
      amount_total: 50000,
      currency: 'usd',
      payment_status: 'paid',
      customer_details: {
        address: null,
        email: 'customer@example.com',
        name: 'Customer Name',
        phone: null,
        tax_exempt: 'none',
        tax_ids: [],
      },
      metadata: {
        organization_name: 'Test Organization',
        ad_type: 'judge-profile',
        notes: 'Test notes',
        client_ip: '192.168.1.1',
        created_at: '2024-01-01T00:00:00.000Z',
      },
    })

    const event = createCheckoutSessionCompletedEvent(session)
    const { verifyWebhookSignature } = vi.mocked(await import('@/lib/stripe/client'))
    verifyWebhookSignature.mockReturnValue(event)

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'order_456' },
          error: null,
        }),
      }),
    })

    const { createServerClient } = vi.mocked(await import('@/lib/supabase/server'))
    createServerClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    } as never)

    const request = new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': 'valid-signature',
      },
      body: JSON.stringify(event),
    })

    await POST(request)

    expect(mockInsert).toHaveBeenCalledWith({
      stripe_session_id: 'cs_test_123',
      stripe_payment_intent: 'pi_test_123',
      organization_name: 'Test Organization',
      customer_email: 'customer@example.com',
      ad_type: 'judge-profile',
      notes: 'Test notes',
      status: 'paid',
      amount_total: 50000,
      currency: 'usd',
      payment_status: 'paid',
      client_ip: '192.168.1.1',
      metadata: {
        created_at: '2024-01-01T00:00:00.000Z',
        checkout_completed_at: expect.any(String),
        stripe_customer: 'cus_test_123',
      },
    })
  })

  it('extracts customer email from customer_email field', async () => {
    const session = createMockCheckoutSession({
      customer_details: null,
      customer_email: 'fallback@example.com',
      metadata: {
        organization_name: 'Test Org',
        ad_type: 'judge-profile',
        notes: '',
        client_ip: '127.0.0.1',
        created_at: '2024-01-01T00:00:00.000Z',
      },
    })

    const event = createCheckoutSessionCompletedEvent(session)
    const { verifyWebhookSignature } = vi.mocked(await import('@/lib/stripe/client'))
    verifyWebhookSignature.mockReturnValue(event)

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'order_123' },
          error: null,
        }),
      }),
    })

    const { createServerClient } = vi.mocked(await import('@/lib/supabase/server'))
    createServerClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    } as never)

    const request = new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': 'valid-signature',
      },
      body: JSON.stringify(event),
    })

    await POST(request)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_email: 'fallback@example.com',
      })
    )
  })

  it('handles missing metadata gracefully', async () => {
    const session = createMockCheckoutSession({
      metadata: {},
    })

    const event = createCheckoutSessionCompletedEvent(session)
    const { verifyWebhookSignature } = vi.mocked(await import('@/lib/stripe/client'))
    verifyWebhookSignature.mockReturnValue(event)

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'order_123' },
          error: null,
        }),
      }),
    })

    const { createServerClient } = vi.mocked(await import('@/lib/supabase/server'))
    createServerClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    } as never)

    const request = new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': 'valid-signature',
      },
      body: JSON.stringify(event),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_name: undefined,
        ad_type: undefined,
        notes: undefined,
        client_ip: undefined,
      })
    )
  })

  it('handles database errors gracefully (still returns 200)', async () => {
    const event = createCheckoutSessionCompletedEvent()
    const { verifyWebhookSignature } = vi.mocked(await import('@/lib/stripe/client'))
    verifyWebhookSignature.mockReturnValue(event)

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'Database connection failed',
            code: '500',
          },
        }),
      }),
    })

    const { createServerClient } = vi.mocked(await import('@/lib/supabase/server'))
    createServerClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    } as never)

    const request = new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': 'valid-signature',
      },
      body: JSON.stringify(event),
    })

    const response = await POST(request)
    const json = await response.json()

    // Should still return 200 to acknowledge webhook receipt
    expect(response.status).toBe(200)
    expect(json.received).toBe(true)

    const { logger } = await import('@/lib/utils/logger')
    expect(logger.error).toHaveBeenCalledWith('Failed to create order record', {
      session_id: 'cs_test_123',
      error: 'Database connection failed',
    })
  })

  it('logs order creation success', async () => {
    const session = createMockCheckoutSession({
      id: 'cs_success_123',
      amount_total: 75000,
      metadata: {
        organization_name: 'Success Org',
        ad_type: 'featured-spot',
        notes: '',
        client_ip: '127.0.0.1',
        created_at: '2024-01-01T00:00:00.000Z',
      },
    })

    const event = createCheckoutSessionCompletedEvent(session)
    const { verifyWebhookSignature } = vi.mocked(await import('@/lib/stripe/client'))
    verifyWebhookSignature.mockReturnValue(event)

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'order_789' },
          error: null,
        }),
      }),
    })

    const { createServerClient } = vi.mocked(await import('@/lib/supabase/server'))
    createServerClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    } as never)

    const { logger } = await import('@/lib/utils/logger')

    const request = new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': 'valid-signature',
      },
      body: JSON.stringify(event),
    })

    await POST(request)

    expect(logger.info).toHaveBeenCalledWith('Order created successfully', {
      order_id: 'order_789',
      organization_name: 'Success Org',
      ad_type: 'featured-spot',
      amount: 75000,
    })
  })

  it('handles checkout.session.expired event', async () => {
    const event = createCheckoutSessionExpiredEvent({
      id: 'cs_expired_123',
    })

    const { verifyWebhookSignature } = vi.mocked(await import('@/lib/stripe/client'))
    verifyWebhookSignature.mockReturnValue(event)

    const { createServerClient } = vi.mocked(await import('@/lib/supabase/server'))
    createServerClient.mockResolvedValue({
      from: vi.fn(),
    } as never)

    const { logger } = await import('@/lib/utils/logger')

    const request = new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': 'valid-signature',
      },
      body: JSON.stringify(event),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(logger.info).toHaveBeenCalledWith('Checkout session expired', {
      session_id: 'cs_expired_123',
    })
  })

  it('handles unhandled event types', async () => {
    const event = createMockWebhookEvent('payment_intent.succeeded', {
      id: 'pi_test_123',
    })

    const { verifyWebhookSignature } = vi.mocked(await import('@/lib/stripe/client'))
    verifyWebhookSignature.mockReturnValue(event)

    const { createServerClient } = vi.mocked(await import('@/lib/supabase/server'))
    createServerClient.mockResolvedValue({
      from: vi.fn(),
    } as never)

    const { logger } = await import('@/lib/utils/logger')

    const request = new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': 'valid-signature',
      },
      body: JSON.stringify(event),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(logger.info).toHaveBeenCalledWith('Unhandled webhook event type', {
      event_type: 'payment_intent.succeeded',
    })
  })

  it('returns 500 on unexpected errors', async () => {
    const event = createCheckoutSessionCompletedEvent()
    const { verifyWebhookSignature } = vi.mocked(await import('@/lib/stripe/client'))
    verifyWebhookSignature.mockReturnValue(event)

    // Make createServerClient throw an unexpected error
    const { createServerClient } = vi.mocked(await import('@/lib/supabase/server'))
    createServerClient.mockImplementation(() => {
      throw new Error('Unexpected database error')
    })

    const request = new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': 'valid-signature',
      },
      body: JSON.stringify(event),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toContain('Webhook processing failed')

    const { logger } = await import('@/lib/utils/logger')
    expect(logger.error).toHaveBeenCalledWith('Webhook processing error', {}, expect.any(Error))
  })

  it('logs webhook received event', async () => {
    const event = createCheckoutSessionCompletedEvent()
    const { verifyWebhookSignature } = vi.mocked(await import('@/lib/stripe/client'))
    verifyWebhookSignature.mockReturnValue(event)

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'order_123' },
          error: null,
        }),
      }),
    })

    const { createServerClient } = vi.mocked(await import('@/lib/supabase/server'))
    createServerClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    } as never)

    const { logger } = await import('@/lib/utils/logger')

    const request = new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': 'valid-signature',
      },
      body: JSON.stringify(event),
    })

    await POST(request)

    expect(logger.info).toHaveBeenCalledWith('Webhook received', {
      event_type: 'checkout.session.completed',
      event_id: 'evt_test_123',
    })
  })

  it('passes raw body to signature verification', async () => {
    const event = createCheckoutSessionCompletedEvent()
    const { verifyWebhookSignature } = vi.mocked(await import('@/lib/stripe/client'))
    verifyWebhookSignature.mockReturnValue(event)

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'order_123' },
          error: null,
        }),
      }),
    })

    const { createServerClient } = vi.mocked(await import('@/lib/supabase/server'))
    createServerClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    } as never)

    const rawBody = JSON.stringify(event)
    const request = new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': 'test-signature',
      },
      body: rawBody,
    })

    await POST(request)

    expect(verifyWebhookSignature).toHaveBeenCalledWith(rawBody, 'test-signature')
  })

  it('handles null metadata values', async () => {
    const session = createMockCheckoutSession({
      metadata: null as never,
    })

    const event = createCheckoutSessionCompletedEvent(session)
    const { verifyWebhookSignature } = vi.mocked(await import('@/lib/stripe/client'))
    verifyWebhookSignature.mockReturnValue(event)

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'order_123' },
          error: null,
        }),
      }),
    })

    const { createServerClient } = vi.mocked(await import('@/lib/supabase/server'))
    createServerClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    } as never)

    const request = new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'stripe-signature': 'valid-signature',
      },
      body: JSON.stringify(event),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })

  it('handles multiple checkout.session.completed events', async () => {
    const { verifyWebhookSignature } = vi.mocked(await import('@/lib/stripe/client'))
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'order_123' },
          error: null,
        }),
      }),
    })

    const { createServerClient } = vi.mocked(await import('@/lib/supabase/server'))
    createServerClient.mockResolvedValue({
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    } as never)

    // Process first event
    const event1 = createCheckoutSessionCompletedEvent({
      id: 'cs_test_1',
      metadata: {
        organization_name: 'Org 1',
        ad_type: 'judge-profile',
        notes: '',
        client_ip: '127.0.0.1',
        created_at: '2024-01-01T00:00:00.000Z',
      },
    })
    verifyWebhookSignature.mockReturnValue(event1)

    const request1 = new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig1' },
      body: JSON.stringify(event1),
    })

    const response1 = await POST(request1)
    expect(response1.status).toBe(200)

    // Process second event
    const event2 = createCheckoutSessionCompletedEvent({
      id: 'cs_test_2',
      metadata: {
        organization_name: 'Org 2',
        ad_type: 'court-listing',
        notes: '',
        client_ip: '127.0.0.1',
        created_at: '2024-01-02T00:00:00.000Z',
      },
    })
    verifyWebhookSignature.mockReturnValue(event2)

    const request2 = new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig2' },
      body: JSON.stringify(event2),
    })

    const response2 = await POST(request2)
    expect(response2.status).toBe(200)

    // Verify both were processed
    expect(mockInsert).toHaveBeenCalledTimes(2)
  })
})
