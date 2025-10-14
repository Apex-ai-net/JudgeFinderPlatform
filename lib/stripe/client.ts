import Stripe from 'stripe'

/**
 * Stripe client configuration for ad space purchases
 *
 * Environment variables required:
 * - STRIPE_SECRET_KEY: Secret key from Stripe dashboard
 * - STRIPE_WEBHOOK_SECRET: Webhook signing secret for security
 * - STRIPE_PRICE_ADSPACE: Price ID for ad placement product
 */

// Initialize Stripe client with proper error handling
function createStripeClient(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('STRIPE_SECRET_KEY not configured - Stripe features disabled')
    return null
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
    typescript: true,
    maxNetworkRetries: 3,
  })
}

export const stripe = createStripeClient()

/**
 * Verify Stripe webhook signature
 * @param payload - Raw request body
 * @param signature - Stripe-Signature header value
 * @returns Parsed Stripe event
 * @throws Error if signature verification fails
 */
export function verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured')
  }

  return stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET)
}

/**
 * Create a checkout session for universal access purchase
 * @param params - Session parameters
 * @returns Stripe checkout session
 */
export async function createCheckoutSession(params: {
  priceId?: string
  customer_email?: string
  success_url: string
  cancel_url: string
  metadata?: Record<string, string>
}): Promise<Stripe.Checkout.Session> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  // Use provided priceId, or fall back to legacy STRIPE_PRICE_ADSPACE for backward compatibility
  const priceId = params.priceId || process.env.STRIPE_PRICE_ADSPACE

  if (!priceId) {
    throw new Error('No Stripe price ID provided and STRIPE_PRICE_ADSPACE not configured')
  }

  return await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    customer_email: params.customer_email,
    success_url: params.success_url,
    cancel_url: params.cancel_url,
    metadata: params.metadata || {},
    allow_promotion_codes: true,
    billing_address_collection: 'required',
  })
}

/**
 * Retrieve a checkout session by ID
 * @param sessionId - Stripe session ID
 * @returns Checkout session with expanded data
 */
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  return await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items', 'customer', 'payment_intent'],
  })
}

/**
 * Check if Stripe is configured and ready
 * @returns true if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!(
    stripe &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    (process.env.STRIPE_PRICE_MONTHLY || process.env.STRIPE_PRICE_ADSPACE)
  )
}
