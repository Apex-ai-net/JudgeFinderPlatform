import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSpendingAnalytics } from '@/lib/billing/analytics'

export const dynamic = 'force-dynamic'

/**
 * GET /api/billing/analytics
 * Fetches spending analytics for the authenticated user
 */
export async function GET() {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Stripe customer ID
    const supabase = await createServiceRoleClient()

    // First get app_users record
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (appUserError || !appUser) {
      console.error('Error fetching app user:', appUserError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get advertiser profile
    const { data: advertiserProfile, error: profileError } = await supabase
      .from('advertiser_profiles')
      .select('stripe_customer_id')
      .eq('user_id', appUser.id)
      .single()

    if (profileError || !advertiserProfile?.stripe_customer_id) {
      // No Stripe customer yet, return empty analytics
      return NextResponse.json({
        totalSpent: 0,
        avgMonthlySpend: 0,
        monthlyBreakdown: [],
        lastInvoiceDate: null,
        currentMonthSpend: 0,
        previousMonthSpend: 0,
        spendTrend: 'stable',
      })
    }

    // Fetch analytics from Stripe
    const analytics = await getSpendingAnalytics(advertiserProfile.stripe_customer_id)

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error in GET /api/billing/analytics:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
