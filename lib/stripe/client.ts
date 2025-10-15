import Stripe from 'stripe'

/**
 * Stripe client configuration for universal access subscriptions
 *
 * Environment variables required:
 * - STRIPE_SECRET_KEY: Secret key from Stripe dashboard
 * - STRIPE_WEBHOOK_SECRET: Webhook signing secret for security
 * - STRIPE_PRICE_MONTHLY: Monthly subscription price ID ($500/month)
 * - STRIPE_PRICE_YEARLY: Annual subscription price ID ($5,000/year)
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
 * Get Stripe client instance (throws if not configured)
 * @returns Stripe client instance
 * @throws Error if Stripe is not configured
 */
export function getStripeClient(): Stripe {
  if (!stripe) {
    throw new Error('Stripe not configured - missing STRIPE_SECRET_KEY')
  }
  return stripe
}

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
  customer?: string // NEW: Use existing Stripe customer ID
  success_url: string
  cancel_url: string
  metadata?: Record<string, string>
}): Promise<Stripe.Checkout.Session> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  // priceId must be provided by the caller (STRIPE_PRICE_MONTHLY or STRIPE_PRICE_YEARLY)
  const priceId = params.priceId

  if (!priceId) {
    throw new Error('No Stripe price ID provided. Caller must specify priceId parameter.')
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
    // Use customer ID if provided, otherwise fall back to customer_email
    ...(params.customer
      ? { customer: params.customer }
      : { customer_email: params.customer_email }),
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
    process.env.STRIPE_PRICE_MONTHLY &&
    process.env.STRIPE_PRICE_YEARLY
  )
}
