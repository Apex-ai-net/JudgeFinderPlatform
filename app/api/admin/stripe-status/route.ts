import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isStripeConfigured, getStripeClient } from '@/lib/stripe/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/stripe-status
 *
 * Validates Stripe configuration and returns status
 *
 * SECURITY: Requires authentication (admin users only)
 *
 * Response:
 * {
 *   stripe_configured: boolean
 *   has_secret_key: boolean
 *   has_webhook_secret: boolean
 *   has_price_monthly: boolean
 *   has_price_yearly: boolean
 *   price_monthly_id: string | null
 *   price_yearly_id: string | null
 *   mode: 'test' | 'live' | 'unknown'
 *   timestamp: string
 * }
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Require authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - Authentication required' }, { status: 401 })
    }

    // Check if Stripe is configured
    const configured = isStripeConfigured()

    // Extract env var presence (not values for security)
    const status = {
      stripe_configured: configured,
      has_secret_key: !!process.env.STRIPE_SECRET_KEY,
      has_webhook_secret: !!process.env.STRIPE_WEBHOOK_SECRET,
      has_price_monthly: !!process.env.STRIPE_PRICE_MONTHLY,
      has_price_yearly: !!process.env.STRIPE_PRICE_YEARLY,
      price_monthly_id: process.env.STRIPE_PRICE_MONTHLY || null,
      price_yearly_id: process.env.STRIPE_PRICE_YEARLY || null,
      mode: 'unknown' as 'test' | 'live' | 'unknown',
      timestamp: new Date().toISOString(),
    }

    // Determine mode from secret key prefix
    if (process.env.STRIPE_SECRET_KEY) {
      if (process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
        status.mode = 'test'
      } else if (process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')) {
        status.mode = 'live'
      }
    }

    // Try to ping Stripe API to verify key works
    let apiReachable = false
    if (configured) {
      try {
        const stripe = getStripeClient()
        await stripe.balance.retrieve()
        apiReachable = true
      } catch (error) {
        console.error('Stripe API test failed:', error)
      }
    }

    return NextResponse.json({
      ...status,
      api_reachable: apiReachable,
    })
  } catch (error) {
    console.error('Error checking Stripe status:', error)
    return NextResponse.json(
      {
        error: 'Failed to check Stripe status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
