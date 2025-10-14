/**
 * Unit tests for Stripe client wrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Stripe from 'stripe'
import {
  createMockCheckoutSession,
  createStripeSignatureVerificationError,
} from '@/tests/helpers/stripe'

// Mock Stripe SDK
vi.mock('stripe')

describe('Stripe Client', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset modules to get fresh imports
    vi.resetModules()
    // Reset environment
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('createStripeClient()', () => {
    it('returns null when STRIPE_SECRET_KEY is missing', async () => {
      delete process.env.STRIPE_SECRET_KEY

      // Need to reimport after env change
      const { stripe } = await import('@/lib/stripe/client')

      expect(stripe).toBeNull()
    })

    it('returns Stripe instance when STRIPE_SECRET_KEY is configured', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'

      const mockStripeInstance = {
        apiVersion: '2024-12-18.acacia',
      }
      vi.mocked(Stripe).mockReturnValue(mockStripeInstance as unknown as Stripe)

      // Reimport to create new instance
      const { stripe } = await import('@/lib/stripe/client')

      expect(stripe).toBeTruthy()
      expect(Stripe).toHaveBeenCalledWith('sk_test_123', {
        apiVersion: '2024-12-18.acacia',
        typescript: true,
        maxNetworkRetries: 3,
      })
    })
  })

  describe('verifyWebhookSignature()', () => {
    it('throws error when Stripe not configured', async () => {
      delete process.env.STRIPE_SECRET_KEY

      const { verifyWebhookSignature } = await import('@/lib/stripe/client')

      expect(() => {
        verifyWebhookSignature('payload', 'signature')
      }).toThrow('Stripe not configured')
    })

    it('throws error when STRIPE_WEBHOOK_SECRET is missing', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      delete process.env.STRIPE_WEBHOOK_SECRET

      const mockStripeInstance = {
        webhooks: {
          constructEvent: vi.fn(),
        },
      }
      vi.mocked(Stripe).mockReturnValue(mockStripeInstance as unknown as Stripe)

      const { verifyWebhookSignature } = await import('@/lib/stripe/client')

      expect(() => {
        verifyWebhookSignature('payload', 'signature')
      }).toThrow('STRIPE_WEBHOOK_SECRET not configured')
    })

    it('verifies valid signatures successfully', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123'

      const mockEvent = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: { object: {} },
      } as Stripe.Event

      const mockConstructEvent = vi.fn().mockReturnValue(mockEvent)
      const mockStripeInstance = {
        webhooks: {
          constructEvent: mockConstructEvent,
        },
      }
      vi.mocked(Stripe).mockReturnValue(mockStripeInstance as unknown as Stripe)

      const { verifyWebhookSignature } = await import('@/lib/stripe/client')

      const payload = 'test-payload'
      const signature = 'test-signature'
      const result = verifyWebhookSignature(payload, signature)

      expect(result).toEqual(mockEvent)
      expect(mockConstructEvent).toHaveBeenCalledWith(payload, signature, 'whsec_test_123')
    })

    it('throws on invalid signatures', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123'

      const mockError = createStripeSignatureVerificationError()
      const mockConstructEvent = vi.fn().mockImplementation(() => {
        throw mockError
      })
      const mockStripeInstance = {
        webhooks: {
          constructEvent: mockConstructEvent,
        },
      }
      vi.mocked(Stripe).mockReturnValue(mockStripeInstance as unknown as Stripe)

      const { verifyWebhookSignature } = await import('@/lib/stripe/client')

      expect(() => {
        verifyWebhookSignature('payload', 'invalid-signature')
      }).toThrow('No signatures found matching the expected signature for payload')
    })

    it('accepts Buffer payload', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123'

      const mockEvent = { id: 'evt_test_123' } as Stripe.Event
      const mockConstructEvent = vi.fn().mockReturnValue(mockEvent)
      const mockStripeInstance = {
        webhooks: {
          constructEvent: mockConstructEvent,
        },
      }
      vi.mocked(Stripe).mockReturnValue(mockStripeInstance as unknown as Stripe)

      const { verifyWebhookSignature } = await import('@/lib/stripe/client')

      const payload = Buffer.from('test-payload')
      const signature = 'test-signature'
      const result = verifyWebhookSignature(payload, signature)

      expect(result).toEqual(mockEvent)
      expect(mockConstructEvent).toHaveBeenCalledWith(payload, signature, 'whsec_test_123')
    })
  })

  describe('createCheckoutSession()', () => {
    it('throws error when Stripe not configured', async () => {
      delete process.env.STRIPE_SECRET_KEY

      const { createCheckoutSession } = await import('@/lib/stripe/client')

      await expect(
        createCheckoutSession({
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel',
        })
      ).rejects.toThrow('Stripe not configured')
    })

    it('throws error when STRIPE_PRICE_ADSPACE is missing', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      delete process.env.STRIPE_PRICE_ADSPACE

      const mockStripeInstance = {
        checkout: {
          sessions: {
            create: vi.fn(),
          },
        },
      }
      vi.mocked(Stripe).mockReturnValue(mockStripeInstance as unknown as Stripe)

      const { createCheckoutSession } = await import('@/lib/stripe/client')

      await expect(
        createCheckoutSession({
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel',
        })
      ).rejects.toThrow('STRIPE_PRICE_ADSPACE not configured')
    })

    it('creates session with correct parameters', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      process.env.STRIPE_PRICE_ADSPACE = 'price_test_123'

      const mockSession = createMockCheckoutSession()
      const mockCreate = vi.fn().mockResolvedValue(mockSession)
      const mockStripeInstance = {
        checkout: {
          sessions: {
            create: mockCreate,
          },
        },
      }
      vi.mocked(Stripe).mockReturnValue(mockStripeInstance as unknown as Stripe)

      const { createCheckoutSession } = await import('@/lib/stripe/client')

      const params = {
        customer_email: 'test@example.com',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        metadata: {
          organization_name: 'Test Org',
          ad_type: 'judge-profile',
        },
      }

      const result = await createCheckoutSession(params)

      expect(result).toEqual(mockSession)
      expect(mockCreate).toHaveBeenCalledWith({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price: 'price_test_123',
            quantity: 1,
          },
        ],
        customer_email: 'test@example.com',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        metadata: {
          organization_name: 'Test Org',
          ad_type: 'judge-profile',
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
      })
    })

    it('creates session without customer_email', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      process.env.STRIPE_PRICE_ADSPACE = 'price_test_123'

      const mockSession = createMockCheckoutSession()
      const mockCreate = vi.fn().mockResolvedValue(mockSession)
      const mockStripeInstance = {
        checkout: {
          sessions: {
            create: mockCreate,
          },
        },
      }
      vi.mocked(Stripe).mockReturnValue(mockStripeInstance as unknown as Stripe)

      const { createCheckoutSession } = await import('@/lib/stripe/client')

      await createCheckoutSession({
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      })

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_email: undefined,
        })
      )
    })

    it('creates session with empty metadata when not provided', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      process.env.STRIPE_PRICE_ADSPACE = 'price_test_123'

      const mockSession = createMockCheckoutSession()
      const mockCreate = vi.fn().mockResolvedValue(mockSession)
      const mockStripeInstance = {
        checkout: {
          sessions: {
            create: mockCreate,
          },
        },
      }
      vi.mocked(Stripe).mockReturnValue(mockStripeInstance as unknown as Stripe)

      const { createCheckoutSession } = await import('@/lib/stripe/client')

      await createCheckoutSession({
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      })

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {},
        })
      )
    })
  })

  describe('getCheckoutSession()', () => {
    it('throws error when Stripe not configured', async () => {
      delete process.env.STRIPE_SECRET_KEY

      const { getCheckoutSession } = await import('@/lib/stripe/client')

      await expect(getCheckoutSession('cs_test_123')).rejects.toThrow('Stripe not configured')
    })

    it('retrieves session with expanded data', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'

      const mockSession = createMockCheckoutSession()
      const mockRetrieve = vi.fn().mockResolvedValue(mockSession)
      const mockStripeInstance = {
        checkout: {
          sessions: {
            retrieve: mockRetrieve,
          },
        },
      }
      vi.mocked(Stripe).mockReturnValue(mockStripeInstance as unknown as Stripe)

      const { getCheckoutSession } = await import('@/lib/stripe/client')

      const result = await getCheckoutSession('cs_test_123')

      expect(result).toEqual(mockSession)
      expect(mockRetrieve).toHaveBeenCalledWith('cs_test_123', {
        expand: ['line_items', 'customer', 'payment_intent'],
      })
    })
  })

  describe('isStripeConfigured()', () => {
    it('returns false when STRIPE_SECRET_KEY is missing', async () => {
      delete process.env.STRIPE_SECRET_KEY
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123'
      process.env.STRIPE_PRICE_ADSPACE = 'price_test_123'

      const { isStripeConfigured } = await import('@/lib/stripe/client')

      expect(isStripeConfigured()).toBe(false)
    })

    it('returns false when STRIPE_WEBHOOK_SECRET is missing', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      delete process.env.STRIPE_WEBHOOK_SECRET
      process.env.STRIPE_PRICE_ADSPACE = 'price_test_123'

      const mockStripeInstance = {}
      vi.mocked(Stripe).mockReturnValue(mockStripeInstance as unknown as Stripe)

      const { isStripeConfigured } = await import('@/lib/stripe/client')

      expect(isStripeConfigured()).toBe(false)
    })

    it('returns false when STRIPE_PRICE_ADSPACE is missing', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123'
      delete process.env.STRIPE_PRICE_ADSPACE

      const mockStripeInstance = {}
      vi.mocked(Stripe).mockReturnValue(mockStripeInstance as unknown as Stripe)

      const { isStripeConfigured } = await import('@/lib/stripe/client')

      expect(isStripeConfigured()).toBe(false)
    })

    it('returns true when all environment variables are present', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123'
      process.env.STRIPE_PRICE_ADSPACE = 'price_test_123'

      const mockStripeInstance = {}
      vi.mocked(Stripe).mockReturnValue(mockStripeInstance as unknown as Stripe)

      const { isStripeConfigured } = await import('@/lib/stripe/client')

      expect(isStripeConfigured()).toBe(true)
    })
  })
})
