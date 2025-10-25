import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { getDunningStatus } from '@/lib/billing/dunning'

export const dynamic = 'force-dynamic'

/**
 * GET /api/billing/dunning/status
 * Get failed payments and dunning status
 */
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user's app_user record
    const { data: appUser } = await supabase
      .from('app_users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!appUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get advertiser profile with Stripe customer ID
    const { data: advertiserProfile } = await supabase
      .from('advertiser_profiles')
      .select('stripe_customer_id')
      .eq('user_id', appUser.id)
      .maybeSingle()

    if (!advertiserProfile?.stripe_customer_id) {
      // No Stripe customer = no failed payments
      return NextResponse.json({
        dunningStatus: {
          hasFailedPayments: false,
          failedPayments: [],
          totalOutstanding: 0,
          nextRetryDate: null,
          subscriptionAtRisk: false,
        },
      })
    }

    const dunningStatus = await getDunningStatus(advertiserProfile.stripe_customer_id)

    return NextResponse.json({ dunningStatus })
  } catch (error) {
    console.error('Failed to get dunning status:', error)
    return NextResponse.json({ error: 'Failed to get dunning status' }, { status: 500 })
  }
}
