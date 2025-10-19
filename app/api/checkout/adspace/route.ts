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
 *   judge_id?: string (NEW: Required for judge-profile ads)
 *   judge_name?: string (NEW: Judge's full name for display)
 *   court_name?: string (NEW: Court name for context)
 *   court_level?: 'federal' | 'state' (NEW: Determines pricing)
 *   ad_position?: 1 | 2 (NEW: Which rotation slot)
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
    const isLocalOrTest = process.env.NODE_ENV !== 'production'
    let userId: string | null = null
    let userEmail: string | undefined
    let stripeCustomerId: string | undefined

    if (!isLocalOrTest) {
      // Require authentication in non-test environments
      const authCtx = await auth()
      userId = authCtx.userId
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
      userEmail = user.primaryEmailAddress.emailAddress
      stripeCustomerId = user.privateMetadata?.stripe_customer_id as string | undefined
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
    const { success, remaining } = await rl.limit(`${clientIp}:global`)

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
    const {
      organization_name,
      email,
      ad_type,
      notes,
      judge_id,
      judge_name,
      court_name,
      court_level,
      ad_position,
      billing_cycle,
    } = body

    if (!organization_name || !email || !ad_type) {
      return NextResponse.json(
        {
          error: 'Missing required fields: organization_name, email, ad_type',
        },
        { status: 400 }
      )
    }

    // Validate judge-specific fields for judge-profile ads
    if (ad_type === 'judge-profile') {
      if (!judge_id || !judge_name || !court_level) {
        return NextResponse.json(
          {
            error: 'For judge-profile ads, judge_id, judge_name, and court_level are required',
          },
          { status: 400 }
        )
      }

      if (court_level !== 'federal' && court_level !== 'state') {
        return NextResponse.json(
          {
            error: 'court_level must be either "federal" or "state"',
          },
          { status: 400 }
        )
      }

      if (ad_position && ad_position !== 1 && ad_position !== 2) {
        return NextResponse.json(
          {
            error: 'ad_position must be either 1 or 2',
          },
          { status: 400 }
        )
      }
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

    // Validate ad type
    const validAdTypes = ['judge-profile', 'court-listing', 'featured-spot'] as const
    if (!validAdTypes.includes(ad_type)) {
      return NextResponse.json(
        {
          error: `Invalid ad_type. Must be one of: ${validAdTypes.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Link or create Stripe customer in non-test environments
    if (!isLocalOrTest) {
      if (!stripeCustomerId) {
        logger.info('Creating Stripe customer for new user', { userId })

        const stripe = getStripeClient()
        const customer = await stripe.customers.create({
          email: userEmail!,
          name: organization_name,
          metadata: {
            clerk_user_id: userId!,
            clerk_email: userEmail!,
          },
        })

        const clerk = await clerkClient()
        await clerk.users.updateUserMetadata(userId!, {
          privateMetadata: {
            stripe_customer_id: customer.id,
          },
        })

        stripeCustomerId = customer.id
        logger.info('Stripe customer created and linked', { userId, customerId: customer.id })
      } else {
        logger.info('Using existing Stripe customer', { userId, customerId: stripeCustomerId })
      }
    }

    // Get base URL for success/cancel redirects
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://judgefinder.io'

    // Create Stripe Checkout session with linked customer
    const session = await createCheckoutSession({
      ...(stripeCustomerId ? { customer: stripeCustomerId } : { customer_email: email }),
      success_url: `${baseUrl}/ads/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/ads/buy?canceled=true`,
      billing_cycle: billing_cycle || 'monthly',
      // Pass judge-specific parameters for product/price creation
      ...(ad_type === 'judge-profile' && {
        judge_id,
        judge_name,
        court_name,
        court_level,
      }),
      metadata: {
        organization_name,
        ad_type,
        notes: notes || '',
        client_ip: clientIp,
        created_at: new Date().toISOString(),
        // Judge-specific metadata for ad subscriptions
        ...(ad_type === 'judge-profile' && {
          judge_id: judge_id!,
          judge_name: judge_name!,
          court_name: court_name || '',
          court_level: court_level!,
          ad_position: ad_position?.toString() || '1',
        }),
      },
    } as any)

    logger.info('Checkout session created', {
      session_id: session.id,
      organization_name,
      email,
      ad_type,
      ...(ad_type === 'judge-profile' && {
        judge_id,
        judge_name,
        court_level,
        ad_position,
      }),
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

    // Handle Stripe-specific errors with helpful guidance
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; message: string; code?: string }

      // Provide specific guidance based on error type
      let userMessage = 'Payment system error. Please try again.'
      let helpText = ''

      if (stripeError.code === 'account_invalid') {
        userMessage = 'Payment configuration error.'
        helpText = 'Please contact support for assistance.'
      } else if (stripeError.code === 'rate_limit') {
        userMessage = 'Too many requests to payment system.'
        helpText = 'Please wait a moment and try again.'
      } else if (stripeError.message?.includes('customer')) {
        userMessage = 'Customer account error.'
        helpText = 'Please try signing out and back in, then retry.'
      }

      return NextResponse.json(
        {
          error: userMessage,
          help: helpText,
          details: process.env.NODE_ENV === 'development' ? stripeError.message : undefined,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to create checkout session.',
        help: 'Please try again. If the problem persists, contact support@judgefinder.io',
      },
      { status: 500 }
    )
  }
}
