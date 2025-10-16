import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getUserSubscriptions, getPaymentMethods } from '@/lib/billing/subscriptions'
import { logger } from '@/lib/utils/logger'
import { isStripeConfigured } from '@/lib/stripe/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/billing/subscriptions
 *
 * Fetches active subscriptions and payment methods for the authenticated user
 *
 * @returns {subscriptions, paymentMethods}
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Require authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      logger.warn('Stripe not configured - returning empty billing data')
      return NextResponse.json({
        subscriptions: [],
        paymentMethods: [],
      })
    }

    // Get user's Stripe customer ID
    const supabase = await createServiceRoleClient()
    const { data: appUser } = await supabase
      .from('app_users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!appUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data: advertiserProfile } = await supabase
      .from('advertiser_profiles')
      .select('stripe_customer_id')
      .eq('user_id', appUser.id)
      .single()

    if (!advertiserProfile?.stripe_customer_id) {
      // No subscriptions if no Stripe customer exists
      return NextResponse.json({
        subscriptions: [],
        paymentMethods: [],
      })
    }

    // Fetch data from Stripe
    const [subscriptions, paymentMethods] = await Promise.all([
      getUserSubscriptions(advertiserProfile.stripe_customer_id),
      getPaymentMethods(advertiserProfile.stripe_customer_id),
    ])

    return NextResponse.json({
      subscriptions,
      paymentMethods,
    })
  } catch (error) {
    logger.error('Failed to fetch subscriptions', {}, error instanceof Error ? error : undefined)

    return NextResponse.json(
      {
        error: 'Failed to fetch subscription data',
      },
      { status: 500 }
    )
  }
}
