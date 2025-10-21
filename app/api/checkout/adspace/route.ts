import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { createCheckoutSession, getStripeClient } from '@/lib/stripe/client'
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

    // Check Stripe configuration (flexible by flow)
    const hasSecret = !!process.env.STRIPE_SECRET_KEY
    const hasWebhook = !!process.env.STRIPE_WEBHOOK_SECRET
    if (!hasSecret || !hasWebhook) {
      logger.error('Stripe not configured - missing secret or webhook secret', {
        hasSecret,
        hasWebhook,
      })
      return NextResponse.json(
        { error: 'Payment system not configured. Please contact support.' },
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
      promo_code,
    } = body

    // Default ad_type for universal access if not provided
    const effectiveAdType: 'judge-profile' | 'court-listing' | 'featured-spot' =
      ad_type || 'featured-spot'

    if (!organization_name || !email) {
      return NextResponse.json(
        {
          error: 'Missing required fields: organization_name, email',
        },
        { status: 400 }
      )
    }

    // Validate judge-specific fields for judge-profile ads
    if (effectiveAdType === 'judge-profile') {
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
    if (!validAdTypes.includes(effectiveAdType)) {
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

    // STEP 1: Save form data to pending_checkouts BEFORE creating Stripe session
    // This prevents data loss if Stripe checkout fails or user abandons
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data: pendingCheckout, error: insertError } = await supabase
      .from('pending_checkouts')
      .insert({
        clerk_user_id: userId || null,
        organization_name,
        email,
        billing_cycle: billing_cycle || 'monthly',
        notes: notes || null,
        promo_code: promo_code || null,
        judge_id: judge_id || null,
        judge_name: judge_name || null,
        court_name: court_name || null,
        court_level: court_level || null,
        ad_position: ad_position || null,
        ad_type: effectiveAdType,
        status: 'pending',
        client_ip: clientIp,
        metadata: {
          user_agent: request.headers.get('user-agent') || null,
          referrer: request.headers.get('referer') || null,
        },
      })
      .select('id')
      .single()

    if (insertError || !pendingCheckout) {
      logger.error('Failed to save pending checkout', { error: insertError })
      // Non-blocking: continue with checkout even if save fails
      logger.warn('Continuing checkout without pending_checkout record (data loss risk)')
    } else {
      logger.info('Pending checkout saved', {
        pendingCheckoutId: pendingCheckout.id,
        userId,
        email,
      })
    }

    // Get base URL for success/cancel redirects
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://judgefinder.io'

    // Determine universal price when not judge-specific
    let priceId: string | undefined
    const cycle = (billing_cycle || 'monthly') as 'monthly' | 'annual'
    if (effectiveAdType !== 'judge-profile') {
      const priceMonthly = process.env.STRIPE_PRICE_MONTHLY
      const priceYearly = process.env.STRIPE_PRICE_YEARLY
      if (!priceMonthly || !priceYearly) {
        logger.error('Universal price IDs missing', {
          hasMonthly: !!priceMonthly,
          hasYearly: !!priceYearly,
        })
        return NextResponse.json(
          { error: 'Payment pricing not configured. Please contact support.' },
          { status: 503 }
        )
      }
      priceId = cycle === 'annual' ? priceYearly : priceMonthly
    }

    // Create Stripe Checkout session with linked customer
    const session = await createCheckoutSession({
      ...(stripeCustomerId ? { customer: stripeCustomerId } : { customer_email: email }),
      ...(priceId ? { priceId } : {}),
      ...(promo_code ? { promotionCode: String(promo_code) } : {}),
      success_url: `${baseUrl}/ads/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/ads/buy?canceled=true`,
      billing_cycle: cycle,
      // Pass judge-specific parameters for product/price creation
      ...(effectiveAdType === 'judge-profile' && {
        judge_id,
        judge_name,
        court_name,
        court_level,
      }),
      metadata: {
        organization_name,
        ad_type: effectiveAdType,
        notes: notes || '',
        client_ip: clientIp,
        created_at: new Date().toISOString(),
        ...(userId ? { clerk_user_id: userId } : {}),
        // Judge-specific metadata for ad subscriptions
        ...(effectiveAdType === 'judge-profile' && {
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
      ad_type: effectiveAdType,
      ...(effectiveAdType === 'judge-profile' && {
        judge_id,
        judge_name,
        court_level,
        ad_position,
      }),
    })

    // STEP 2: Update pending checkout with Stripe session ID
    if (pendingCheckout?.id) {
      const { error: updateError } = await supabase
        .from('pending_checkouts')
        .update({
          stripe_session_id: session.id,
          status: 'checkout_created',
          checkout_created_at: new Date().toISOString(),
        })
        .eq('id', pendingCheckout.id)

      if (updateError) {
        logger.error('Failed to update pending checkout with session ID', {
          pendingCheckoutId: pendingCheckout.id,
          sessionId: session.id,
          error: updateError,
        })
      } else {
        logger.info('Pending checkout updated with session ID', {
          pendingCheckoutId: pendingCheckout.id,
          sessionId: session.id,
        })
      }
    }

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
