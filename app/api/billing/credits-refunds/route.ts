import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { getCreditsAndRefunds } from '@/lib/billing/credits-refunds'

export const dynamic = 'force-dynamic'

/**
 * GET /api/billing/credits-refunds
 * Get customer credits and refunds history
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
      // No Stripe customer = no credits/refunds
      return NextResponse.json({
        data: {
          currentBalance: 0,
          currency: 'USD',
          credits: [],
          refunds: [],
          totalCreditsApplied: 0,
          totalRefunded: 0,
        },
      })
    }

    const data = await getCreditsAndRefunds(advertiserProfile.stripe_customer_id)

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Failed to get credits and refunds:', error)
    return NextResponse.json({ error: 'Failed to get credits and refunds' }, { status: 500 })
  }
}
