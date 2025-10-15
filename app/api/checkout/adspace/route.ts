import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { createCheckoutSession, isStripeConfigured, getStripeClient } from '@/lib/stripe/client'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

/**
 * POST /api/checkout/adspace
 *
 * Creates a Stripe Checkout session for universal access purchase
 *
 * SECURITY: Requires authentication (enforced by middleware + this handler)
 *
 * Request body:
 * {
 *   organization_name: string
 *   email: string
 *   billing_cycle: string ('monthly' | 'annual')
 *   ad_type?: string (deprecated - kept for backward compatibility)
 *   notes?: string
 * }
 *
 * Response:
 * {
 *   session_url: string (Stripe Checkout URL)
 *   session_id: string (for tracking)
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // CRITICAL: Require authentication (also enforced by middleware)
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthorized checkout attempt - user not signed in')
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in to purchase ad space' },
        { status: 401 }
      )
    }

    const user = await currentUser()
    if (!user || !user.primaryEmailAddress) {
      logger.error('User profile incomplete', { userId })
      return NextResponse.json(
        { error: 'User profile incomplete - please update your profile' },
        { status: 400 }
      )
    }

    // Check Stripe configuration
    if (!isStripeConfigured()) {
      logger.error('Stripe not configured - cannot create checkout session')
      return NextResponse.json(
        {
          error: 'Payment system not configured. Please contact support.',
        },
        { status: 503 }
      )
    }

    // Rate limiting
    const { buildRateLimiter, getClientIp } = await import('@/lib/security/rate-limit')
    const rl = buildRateLimiter({
      tokens: 10,
      window: '1 h',
      prefix: 'api:checkout:adspace',
    })
    const clientIp = getClientIp(request)
    const { success, remaining } = await rl.limit(`${userId}:checkout`)

    if (!success) {
      return NextResponse.json(
        {
          error: 'Too many checkout attempts. Please try again later.',
        },
        { status: 429 }
      )
    }

    // Parse and validate request
    const body = await request.json()
    const { organization_name, email, billing_cycle, ad_type, notes } = body

    if (!organization_name || !email || !billing_cycle) {
      return NextResponse.json(
        {
          error: 'Missing required fields: organization_name, email, billing_cycle',
        },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          error: 'Invalid email address',
        },
        { status: 400 }
      )
    }

    // Validate billing cycle
    const validCycles = ['monthly', 'annual']
    if (!validCycles.includes(billing_cycle)) {
      return NextResponse.json(
        {
          error: `Invalid billing_cycle. Must be one of: ${validCycles.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Get appropriate Stripe price ID based on billing cycle
    const priceId =
      billing_cycle === 'annual'
        ? process.env.STRIPE_PRICE_YEARLY
        : process.env.STRIPE_PRICE_MONTHLY

    if (!priceId) {
      logger.error(`Missing Stripe price ID for billing cycle: ${billing_cycle}`)
      return NextResponse.json(
        {
          error: 'Pricing configuration error. Please contact support.',
        },
        { status: 503 }
      )
    }

    // Link to existing Stripe customer or create new one
    let stripeCustomerId = user.privateMetadata?.stripe_customer_id as string | undefined

    if (!stripeCustomerId) {
      logger.info('Creating Stripe customer for new user', { userId })

      const stripe = getStripeClient()
      const customer = await stripe.customers.create({
        email: user.primaryEmailAddress.emailAddress,
        name: user.fullName || organization_name,
        metadata: {
          clerk_user_id: userId,
          clerk_email: user.primaryEmailAddress.emailAddress,
        },
      })

      // Save to Clerk private metadata
      const clerk = await clerkClient()
      await clerk.users.updateUserMetadata(userId, {
        privateMetadata: {
          ...user.privateMetadata,
          stripe_customer_id: customer.id,
        },
      })

      stripeCustomerId = customer.id
      logger.info('Stripe customer created and linked', { userId, customerId: customer.id })
    } else {
      logger.info('Using existing Stripe customer', { userId, customerId: stripeCustomerId })
    }

    // Get base URL for success/cancel redirects
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://judgefinder.io'

    // Create Stripe Checkout session with linked customer
    const session = await createCheckoutSession({
      priceId,
      customer: stripeCustomerId, // Use linked Stripe customer
      success_url: `${baseUrl}/dashboard/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/ads/buy?canceled=true`,
      metadata: {
        clerk_user_id: userId, // CRITICAL: track Clerk user for webhook
        organization_name,
        billing_cycle,
        ad_type: ad_type || 'universal_access',
        notes: notes || '',
        client_ip: clientIp,
        created_at: new Date().toISOString(),
        tier: 'universal_access',
        domain: 'judgefinder',
      },
    })

    logger.info('Checkout session created', {
      session_id: session.id,
      user_id: userId,
      customer_id: stripeCustomerId,
      organization_name,
      billing_cycle,
      price_id: priceId,
    })

    return NextResponse.json({
      session_url: session.url,
      session_id: session.id,
      rate_limit_remaining: remaining,
    })
  } catch (error) {
    logger.error(
      'Failed to create checkout session',
      {},
      error instanceof Error ? error : undefined
    )

    // Handle Stripe-specific errors
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; message: string }
      return NextResponse.json(
        {
          error: 'Payment system error. Please try again.',
          details: process.env.NODE_ENV === 'development' ? stripeError.message : undefined,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to create checkout session. Please try again.',
      },
      { status: 500 }
    )
  }
}
