/**
 * Integration Tests: Stripe Ad Purchase Flow
 *
 * Tests the complete end-to-end ad purchase flow including:
 * - Checkout API endpoint
 * - Stripe session creation
 * - Webhook processing
 * - Database operations
 * - RLS policies
 * - Rate limiting
 * - Error handling
 *
 * Prerequisites:
 * 1. Supabase test database configured (local or cloud)
 * 2. Run migration: supabase/migrations/20251013_001_ad_orders_table.sql
 * 3. Environment variables set:
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *    - SUPABASE_SERVICE_ROLE_KEY
 *    - STRIPE_SECRET_KEY (test key)
 *    - STRIPE_WEBHOOK_SECRET (test secret)
 *    - STRIPE_PRICE_ADSPACE (test price)
 */

import { describe, it, expect, beforeAll, afterEach, vi, beforeEach } from 'vitest'
import { POST as checkoutPost } from '@/app/api/checkout/adspace/route'
import { POST as webhookPost } from '@/app/api/stripe/webhook/route'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import {
  createMockRequest,
  createCheckoutSessionCompletedEvent,
  createMockCheckoutSession,
  createStripeSignatureVerificationError,
} from '@/tests/helpers/stripe'
import * as stripeClient from '@/lib/stripe/client'

// Mock Stripe client
vi.mock('@/lib/stripe/client', async () => {
  const actual = await vi.importActual('@/lib/stripe/client')
  return {
    ...actual,
    stripe: {
      checkout: {
        sessions: {
          create: vi.fn(),
        },
      },
      webhooks: {
        constructEvent: vi.fn(),
      },
    },
    createCheckoutSession: vi.fn(),
    verifyWebhookSignature: vi.fn(),
    isStripeConfigured: vi.fn(() => true),
  }
})

// Mock rate limiter to pass by default
vi.mock('@/lib/security/rate-limit', async () => {
  const actual = await vi.importActual('@/lib/security/rate-limit')
  return {
    ...actual,
    buildRateLimiter: vi.fn(() => ({
      limit: vi.fn(async () => ({
        success: true,
        remaining: 10,
        reset: Date.now() + 3600000,
      })),
    })),
    getClientIp: vi.fn(() => '127.0.0.1'),
  }
})

describe('Stripe Ad Purchase Flow Integration', () => {
  let supabase: SupabaseClient
  let testOrderIds: string[] = []

  beforeAll(async () => {
    // Verify environment variables
    const requiredEnvVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']

    for (const varName of requiredEnvVars) {
      if (!process.env[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`)
      }
    }

    // Setup test environment
    try {
      supabase = createServiceRoleClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Verify test environment - check if ad_orders table exists
      const { error } = await supabase.from('ad_orders').select('count').limit(1)
      if (error) {
        throw new Error(
          `Test environment not ready. ad_orders table may not exist. Please run migration: ${error.message}`
        )
      }
    } catch (error) {
      console.error('Failed to setup test environment:', error)
      throw error
    }
  })

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()

    // Set default environment variables
    process.env.STRIPE_SECRET_KEY = 'sk_test_123'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123'
    process.env.STRIPE_PRICE_ADSPACE = 'price_test_123'
    process.env.NEXT_PUBLIC_APP_URL = 'https://test.judgefinder.io'
  })

  afterEach(async () => {
    // Cleanup test orders
    if (testOrderIds.length > 0) {
      try {
        await supabase.from('ad_orders').delete().in('id', testOrderIds)
      } catch (error) {
        console.warn('Failed to cleanup test orders:', error)
      }
      testOrderIds = []
    }
  })

  describe('Scenario 1: Complete Ad Purchase Flow (Happy Path)', () => {
    it('should complete full judge-profile ad purchase flow', async () => {
      // Step 1: Create checkout session
      const sessionId = `cs_test_${Date.now()}`
      const mockSession = createMockCheckoutSession({
        id: sessionId,
        url: 'https://checkout.stripe.com/c/pay/' + sessionId,
        amount_total: 29900, // $299.00
        metadata: {
          organization_name: 'Test Law Firm',
          ad_type: 'judge-profile',
          notes: 'Integration test',
          client_ip: '127.0.0.1',
          created_at: new Date().toISOString(),
        },
      })

      vi.mocked(stripeClient.createCheckoutSession).mockResolvedValue(mockSession)

      const checkoutRequest = createMockRequest({
        method: 'POST',
        body: {
          organization_name: 'Test Law Firm',
          email: 'test@lawfirm.com',
          ad_type: 'judge-profile',
          notes: 'Integration test',
        },
        ip: '127.0.0.1',
      })

      const checkoutResponse = await checkoutPost(checkoutRequest as any)
      const checkoutData = await checkoutResponse.json()

      expect(checkoutResponse.status).toBe(200)
      expect(checkoutData.session_url).toBe(mockSession.url)
      expect(checkoutData.session_id).toBe(sessionId)
      expect(checkoutData.rate_limit_remaining).toBeDefined()

      // Step 2: Simulate webhook (checkout.session.completed)
      const webhookEvent = createCheckoutSessionCompletedEvent({
        id: sessionId,
        amount_total: 29900,
        payment_intent: 'pi_test_123',
        customer_email: 'test@lawfirm.com',
        metadata: {
          organization_name: 'Test Law Firm',
          ad_type: 'judge-profile',
          notes: 'Integration test',
          client_ip: '127.0.0.1',
          created_at: new Date().toISOString(),
        },
      })

      vi.mocked(stripeClient.verifyWebhookSignature).mockReturnValue(webhookEvent)

      const webhookRequest = createMockRequest({
        method: 'POST',
        body: JSON.stringify(webhookEvent),
        headers: {
          'stripe-signature': 't=123,v1=abc',
        },
      })

      const webhookResponse = await webhookPost(webhookRequest as any)

      expect(webhookResponse.status).toBe(200)
      const webhookData = await webhookResponse.json()
      expect(webhookData.received).toBe(true)

      // Step 3: Verify order in database
      const { data: orders, error: ordersError } = await supabase
        .from('ad_orders')
        .select('*')
        .eq('stripe_session_id', sessionId)

      expect(ordersError).toBeNull()
      expect(orders).toHaveLength(1)

      const order = orders![0]
      expect(order.organization_name).toBe('Test Law Firm')
      expect(order.customer_email).toBe('test@lawfirm.com')
      expect(order.ad_type).toBe('judge-profile')
      expect(order.amount_total).toBe(29900)
      expect(order.status).toBe('paid')
      expect(order.currency).toBe('usd')
      expect(order.stripe_payment_intent).toBe('pi_test_123')
      expect(order.client_ip).toBe('127.0.0.1')

      testOrderIds.push(order.id)
    })

    it('should handle court-listing ad purchase', async () => {
      const sessionId = `cs_test_court_${Date.now()}`
      const mockSession = createMockCheckoutSession({
        id: sessionId,
        url: 'https://checkout.stripe.com/c/pay/' + sessionId,
        amount_total: 19900, // $199.00
        metadata: {
          organization_name: 'County Court System',
          ad_type: 'court-listing',
          notes: 'Court listing ad',
          client_ip: '127.0.0.1',
          created_at: new Date().toISOString(),
        },
      })

      vi.mocked(stripeClient.createCheckoutSession).mockResolvedValue(mockSession)

      const checkoutRequest = createMockRequest({
        method: 'POST',
        body: {
          organization_name: 'County Court System',
          email: 'admin@court.gov',
          ad_type: 'court-listing',
          notes: 'Court listing ad',
        },
        ip: '127.0.0.1',
      })

      const checkoutResponse = await checkoutPost(checkoutRequest as any)
      expect(checkoutResponse.status).toBe(200)

      // Process webhook
      const webhookEvent = createCheckoutSessionCompletedEvent({
        id: sessionId,
        amount_total: 19900,
        customer_email: 'admin@court.gov',
        metadata: mockSession.metadata,
      })

      vi.mocked(stripeClient.verifyWebhookSignature).mockReturnValue(webhookEvent)

      const webhookRequest = createMockRequest({
        method: 'POST',
        body: JSON.stringify(webhookEvent),
        headers: { 'stripe-signature': 't=123,v1=abc' },
      })

      await webhookPost(webhookRequest as any)

      // Verify order
      const { data: orders } = await supabase
        .from('ad_orders')
        .select('*')
        .eq('stripe_session_id', sessionId)
        .single()

      expect(orders?.ad_type).toBe('court-listing')
      expect(orders?.amount_total).toBe(19900)

      testOrderIds.push(orders!.id)
    })

    it('should handle featured-spot ad purchase', async () => {
      const sessionId = `cs_test_featured_${Date.now()}`
      const mockSession = createMockCheckoutSession({
        id: sessionId,
        url: 'https://checkout.stripe.com/c/pay/' + sessionId,
        amount_total: 49900, // $499.00
        metadata: {
          organization_name: 'Premier Legal Services',
          ad_type: 'featured-spot',
          notes: 'Featured placement',
          client_ip: '127.0.0.1',
          created_at: new Date().toISOString(),
        },
      })

      vi.mocked(stripeClient.createCheckoutSession).mockResolvedValue(mockSession)

      const checkoutRequest = createMockRequest({
        method: 'POST',
        body: {
          organization_name: 'Premier Legal Services',
          email: 'contact@premierlaw.com',
          ad_type: 'featured-spot',
          notes: 'Featured placement',
        },
        ip: '127.0.0.1',
      })

      const checkoutResponse = await checkoutPost(checkoutRequest as any)
      expect(checkoutResponse.status).toBe(200)

      // Process webhook
      const webhookEvent = createCheckoutSessionCompletedEvent({
        id: sessionId,
        amount_total: 49900,
        customer_email: 'contact@premierlaw.com',
        metadata: mockSession.metadata,
      })

      vi.mocked(stripeClient.verifyWebhookSignature).mockReturnValue(webhookEvent)

      const webhookRequest = createMockRequest({
        method: 'POST',
        body: JSON.stringify(webhookEvent),
        headers: { 'stripe-signature': 't=123,v1=abc' },
      })

      await webhookPost(webhookRequest as any)

      // Verify order
      const { data: orders } = await supabase
        .from('ad_orders')
        .select('*')
        .eq('stripe_session_id', sessionId)
        .single()

      expect(orders?.ad_type).toBe('featured-spot')
      expect(orders?.amount_total).toBe(49900)

      testOrderIds.push(orders!.id)
    })
  })

  describe('Scenario 2: Invalid Email Format', () => {
    it('should reject invalid email addresses', async () => {
      const invalidEmails = [
        'notanemail',
        'missing@domain',
        '@nodomain.com',
        'spaces in@email.com',
        'double@@domain.com',
      ]

      for (const email of invalidEmails) {
        const request = createMockRequest({
          method: 'POST',
          body: {
            organization_name: 'Test Org',
            email,
            ad_type: 'judge-profile',
          },
          ip: '127.0.0.1',
        })

        const response = await checkoutPost(request as any)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Invalid email')
      }

      // Verify no database records created
      const { data: orders } = await supabase
        .from('ad_orders')
        .select('*')
        .eq('organization_name', 'Test Org')

      expect(orders).toHaveLength(0)
    })

    it('should accept valid email addresses', async () => {
      const validEmails = [
        'simple@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user_123@sub.example.com',
      ]

      for (const email of validEmails) {
        const sessionId = `cs_test_${Date.now()}_${email.replace(/[^a-z0-9]/gi, '')}`
        vi.mocked(stripeClient.createCheckoutSession).mockResolvedValue(
          createMockCheckoutSession({
            id: sessionId,
            customer_email: email,
          })
        )

        const request = createMockRequest({
          method: 'POST',
          body: {
            organization_name: 'Test Org',
            email,
            ad_type: 'judge-profile',
          },
          ip: '127.0.0.1',
        })

        const response = await checkoutPost(request as any)
        expect(response.status).toBe(200)
      }
    })
  })

  describe('Scenario 3: Rate Limiting', () => {
    it('should enforce rate limits on checkout endpoint', async () => {
      const { buildRateLimiter } = await import('@/lib/security/rate-limit')

      // Create a real rate limiter that fails after 3 requests
      let callCount = 0
      vi.mocked(buildRateLimiter).mockReturnValue({
        limit: vi.fn(async () => {
          callCount++
          return {
            success: callCount <= 3,
            remaining: Math.max(0, 3 - callCount),
            reset: Date.now() + 3600000,
          }
        }),
      })

      const sessionId = `cs_test_ratelimit_${Date.now()}`
      vi.mocked(stripeClient.createCheckoutSession).mockResolvedValue(
        createMockCheckoutSession({ id: sessionId })
      )

      // First 3 requests should succeed
      for (let i = 0; i < 3; i++) {
        const request = createMockRequest({
          method: 'POST',
          body: {
            organization_name: 'Test Org',
            email: `test${i}@example.com`,
            ad_type: 'judge-profile',
          },
          ip: '127.0.0.1',
        })

        const response = await checkoutPost(request as any)
        expect(response.status).toBe(200)
      }

      // 4th request should be rate limited
      const request = createMockRequest({
        method: 'POST',
        body: {
          organization_name: 'Test Org',
          email: 'test-ratelimit@example.com',
          ad_type: 'judge-profile',
        },
        ip: '127.0.0.1',
      })

      const response = await checkoutPost(request as any)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toContain('Too many')
    })
  })

  describe('Scenario 4: Webhook Signature Verification', () => {
    it('should reject webhooks with invalid signature', async () => {
      vi.mocked(stripeClient.verifyWebhookSignature).mockImplementation(() => {
        throw createStripeSignatureVerificationError()
      })

      const webhookEvent = createCheckoutSessionCompletedEvent({
        id: 'cs_invalid_signature',
      })

      const request = createMockRequest({
        method: 'POST',
        body: JSON.stringify(webhookEvent),
        headers: {
          'stripe-signature': 'invalid_signature',
        },
      })

      const response = await webhookPost(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid signature')

      // Verify no database record created
      const { data: orders } = await supabase
        .from('ad_orders')
        .select('*')
        .eq('stripe_session_id', 'cs_invalid_signature')

      expect(orders).toHaveLength(0)
    })

    it('should reject webhooks without signature header', async () => {
      const webhookEvent = createCheckoutSessionCompletedEvent()

      const request = createMockRequest({
        method: 'POST',
        body: JSON.stringify(webhookEvent),
        headers: {}, // Missing stripe-signature
      })

      const response = await webhookPost(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing signature')
    })
  })

  describe('Scenario 5: Duplicate Webhook Handling', () => {
    it('should handle duplicate webhooks gracefully', async () => {
      const sessionId = `cs_test_duplicate_${Date.now()}`
      const webhookEvent = createCheckoutSessionCompletedEvent({
        id: sessionId,
        amount_total: 29900,
        customer_email: 'duplicate@example.com',
        metadata: {
          organization_name: 'Test Duplicate Org',
          ad_type: 'judge-profile',
          notes: 'Duplicate test',
          client_ip: '127.0.0.1',
          created_at: new Date().toISOString(),
        },
      })

      vi.mocked(stripeClient.verifyWebhookSignature).mockReturnValue(webhookEvent)

      // First webhook - should succeed
      const request1 = createMockRequest({
        method: 'POST',
        body: JSON.stringify(webhookEvent),
        headers: { 'stripe-signature': 't=123,v1=abc' },
      })

      const response1 = await webhookPost(request1 as any)
      expect(response1.status).toBe(200)

      // Verify first order created
      const { data: orders1 } = await supabase
        .from('ad_orders')
        .select('*')
        .eq('stripe_session_id', sessionId)

      expect(orders1).toHaveLength(1)
      testOrderIds.push(orders1![0].id)

      // Second webhook (duplicate) - should return 200 but not create duplicate
      // The database unique constraint will prevent duplicate insertion
      const request2 = createMockRequest({
        method: 'POST',
        body: JSON.stringify(webhookEvent),
        headers: { 'stripe-signature': 't=124,v1=def' },
      })

      const response2 = await webhookPost(request2 as any)

      // Webhook handler returns 200 even if DB insert fails
      // This is intentional to acknowledge receipt to Stripe
      expect(response2.status).toBe(200)

      // Verify still only one order exists
      const { data: orders2 } = await supabase
        .from('ad_orders')
        .select('*')
        .eq('stripe_session_id', sessionId)

      expect(orders2).toHaveLength(1)
    })
  })

  describe('Scenario 6: Missing Required Fields', () => {
    it('should reject checkout without organization_name', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          email: 'test@example.com',
          ad_type: 'judge-profile',
        },
        ip: '127.0.0.1',
      })

      const response = await checkoutPost(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('should reject checkout without email', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          organization_name: 'Test Org',
          ad_type: 'judge-profile',
        },
        ip: '127.0.0.1',
      })

      const response = await checkoutPost(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('should reject checkout without ad_type', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          organization_name: 'Test Org',
          email: 'test@example.com',
        },
        ip: '127.0.0.1',
      })

      const response = await checkoutPost(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })
  })

  describe('Scenario 7: Invalid Ad Type', () => {
    it('should reject invalid ad types', async () => {
      const invalidAdTypes = ['invalid-type', 'banner-ad', 'sidebar', 'popup', '', 'null']

      for (const ad_type of invalidAdTypes) {
        const request = createMockRequest({
          method: 'POST',
          body: {
            organization_name: 'Test Org',
            email: 'test@example.com',
            ad_type,
          },
          ip: '127.0.0.1',
        })

        const response = await checkoutPost(request as any)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Invalid ad_type')
      }
    })
  })

  describe('Scenario 8: Stripe Configuration', () => {
    it('should return 503 when Stripe is not configured', async () => {
      vi.mocked(stripeClient.isStripeConfigured).mockReturnValue(false)

      const request = createMockRequest({
        method: 'POST',
        body: {
          organization_name: 'Test Org',
          email: 'test@example.com',
          ad_type: 'judge-profile',
        },
        ip: '127.0.0.1',
      })

      const response = await checkoutPost(request as any)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toContain('Payment system not configured')
    })
  })

  describe('Scenario 9: Database RLS Policies', () => {
    it('should allow service role to view all orders', async () => {
      // Create a test order via webhook
      const sessionId = `cs_test_rls_${Date.now()}`
      const webhookEvent = createCheckoutSessionCompletedEvent({
        id: sessionId,
        customer_email: 'rls-test@example.com',
        metadata: {
          organization_name: 'RLS Test Org',
          ad_type: 'judge-profile',
          notes: 'RLS test',
          client_ip: '127.0.0.1',
          created_at: new Date().toISOString(),
        },
      })

      vi.mocked(stripeClient.verifyWebhookSignature).mockReturnValue(webhookEvent)

      const webhookRequest = createMockRequest({
        method: 'POST',
        body: JSON.stringify(webhookEvent),
        headers: { 'stripe-signature': 't=123,v1=abc' },
      })

      await webhookPost(webhookRequest as any)

      // Service role should be able to view the order
      const { data: orders, error } = await supabase
        .from('ad_orders')
        .select('*')
        .eq('stripe_session_id', sessionId)

      expect(error).toBeNull()
      expect(orders).toHaveLength(1)
      expect(orders![0].customer_email).toBe('rls-test@example.com')

      testOrderIds.push(orders![0].id)
    })
  })

  describe('Scenario 10: Webhook Event Types', () => {
    it('should handle checkout.session.expired event', async () => {
      const sessionId = `cs_test_expired_${Date.now()}`
      const expiredEvent: Stripe.Event = {
        id: 'evt_test_expired',
        object: 'event',
        api_version: '2024-12-18.acacia',
        created: Date.now(),
        data: {
          object: createMockCheckoutSession({
            id: sessionId,
            status: 'expired',
            payment_status: 'unpaid',
          }),
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        type: 'checkout.session.expired',
      }

      vi.mocked(stripeClient.verifyWebhookSignature).mockReturnValue(expiredEvent)

      const request = createMockRequest({
        method: 'POST',
        body: JSON.stringify(expiredEvent),
        headers: { 'stripe-signature': 't=123,v1=abc' },
      })

      const response = await webhookPost(request as any)

      expect(response.status).toBe(200)

      // Should not create an order for expired sessions
      const { data: orders } = await supabase
        .from('ad_orders')
        .select('*')
        .eq('stripe_session_id', sessionId)

      expect(orders).toHaveLength(0)
    })

    it('should handle unknown webhook event types gracefully', async () => {
      const unknownEvent: Stripe.Event = {
        id: 'evt_test_unknown',
        object: 'event',
        api_version: '2024-12-18.acacia',
        created: Date.now(),
        data: { object: {} },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        type: 'payment_intent.created' as any,
      }

      vi.mocked(stripeClient.verifyWebhookSignature).mockReturnValue(unknownEvent)

      const request = createMockRequest({
        method: 'POST',
        body: JSON.stringify(unknownEvent),
        headers: { 'stripe-signature': 't=123,v1=abc' },
      })

      const response = await webhookPost(request as any)

      expect(response.status).toBe(200)
    })
  })

  describe('Scenario 11: Checkout Session Metadata', () => {
    it('should preserve all metadata in checkout session', async () => {
      const sessionId = `cs_test_metadata_${Date.now()}`
      const testMetadata = {
        organization_name: 'Metadata Test Org',
        ad_type: 'judge-profile',
        notes: 'Special instructions for ad placement',
        client_ip: '192.168.1.100',
        created_at: new Date().toISOString(),
      }

      const mockSession = createMockCheckoutSession({
        id: sessionId,
        metadata: testMetadata,
      })

      vi.mocked(stripeClient.createCheckoutSession).mockResolvedValue(mockSession)

      const request = createMockRequest({
        method: 'POST',
        body: {
          organization_name: testMetadata.organization_name,
          email: 'metadata@example.com',
          ad_type: testMetadata.ad_type,
          notes: testMetadata.notes,
        },
        ip: testMetadata.client_ip,
      })

      const response = await checkoutPost(request as any)
      expect(response.status).toBe(200)

      // Verify createCheckoutSession was called with correct metadata
      expect(stripeClient.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_email: 'metadata@example.com',
          metadata: expect.objectContaining({
            organization_name: testMetadata.organization_name,
            ad_type: testMetadata.ad_type,
            notes: testMetadata.notes,
            client_ip: testMetadata.client_ip,
          }),
        })
      )
    })

    it('should handle optional notes field', async () => {
      const sessionId = `cs_test_no_notes_${Date.now()}`
      const mockSession = createMockCheckoutSession({
        id: sessionId,
        metadata: {
          organization_name: 'Test Org',
          ad_type: 'judge-profile',
          notes: '',
          client_ip: '127.0.0.1',
          created_at: new Date().toISOString(),
        },
      })

      vi.mocked(stripeClient.createCheckoutSession).mockResolvedValue(mockSession)

      const request = createMockRequest({
        method: 'POST',
        body: {
          organization_name: 'Test Org',
          email: 'test@example.com',
          ad_type: 'judge-profile',
          // notes field omitted
        },
        ip: '127.0.0.1',
      })

      const response = await checkoutPost(request as any)
      expect(response.status).toBe(200)

      // Verify metadata has empty notes
      expect(stripeClient.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            notes: '',
          }),
        })
      )
    })
  })
})
