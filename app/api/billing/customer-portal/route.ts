import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getStripeClient } from '@/lib/stripe/client'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/customer-portal
 *
 * Creates a Stripe Customer Portal session for subscription management
 *
 * The Customer Portal allows users to:
 * - View and manage subscriptions
 * - Update payment methods
 * - View invoice history
 * - Download invoices as PDF
 *
 * @returns {url: string} - URL to redirect user to Stripe Customer Portal
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Require authentication
    const { userId } = await auth()
    if (!userId) {
      logger.warn('Unauthorized customer portal access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Stripe customer ID from advertiser profile
    const supabase = await createServiceRoleClient()
    const { data: appUser } = await supabase
      .from('app_users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!appUser) {
      logger.error('App user not found', { userId })
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is an advertiser with a Stripe customer ID
    const { data: advertiserProfile } = await supabase
      .from('advertiser_profiles')
      .select('stripe_customer_id, firm_name')
      .eq('user_id', appUser.id)
      .single()

    if (!advertiserProfile?.stripe_customer_id) {
      logger.warn('No Stripe customer found for user', { userId })
      return NextResponse.json(
        {
          error: 'No billing account found. Please make a purchase first.',
        },
        { status: 404 }
      )
    }

    // Get base URL for return redirect
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://judgefinder.io'

    // Create Stripe Customer Portal session
    const stripe = getStripeClient()
    const session = await stripe.billingPortal.sessions.create({
      customer: advertiserProfile.stripe_customer_id,
      return_url: `${baseUrl}/dashboard/billing`,
    })

    logger.info('Customer portal session created', {
      userId,
      customerId: advertiserProfile.stripe_customer_id,
      sessionId: session.id,
    })

    return NextResponse.json({
      url: session.url,
    })
  } catch (error) {
    logger.error(
      'Failed to create customer portal session',
      {},
      error instanceof Error ? error : undefined
    )

    return NextResponse.json(
      {
        error: 'Failed to create billing portal session. Please try again.',
      },
      { status: 500 }
    )
  }
}
