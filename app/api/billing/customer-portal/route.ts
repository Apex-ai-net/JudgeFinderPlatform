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

    // Get user's organization and Stripe customer ID
    const supabase = await createServiceRoleClient()

    // Find organization where user is a member
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, organizations(stripe_customer_id, name)')
      .eq('user_id', userId)
      .single()

    if (!membership?.organizations) {
      logger.warn('No organization found for user', { userId })
      return NextResponse.json(
        {
          error: 'No billing account found. Please make a purchase first.',
        },
        { status: 404 }
      )
    }

    const organization = Array.isArray(membership.organizations)
      ? membership.organizations[0]
      : membership.organizations

    if (!organization?.stripe_customer_id) {
      logger.warn('No Stripe customer found for organization', { userId })
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
      customer: organization.stripe_customer_id,
      return_url: `${baseUrl}/dashboard/billing`,
    })

    logger.info('Customer portal session created', {
      userId,
      customerId: organization.stripe_customer_id,
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
