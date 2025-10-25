import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCustomerInvoices } from '@/lib/billing/invoices'

export const dynamic = 'force-dynamic'

/**
 * GET /api/billing/invoices
 * Fetches invoice history for the authenticated user
 */
export async function GET(request: Request) {
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
      // No Stripe customer yet, return empty array
      return NextResponse.json({ invoices: [] })
    }

    // Parse query parameters
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '12', 10)

    // Fetch invoices from Stripe
    const invoices = await getCustomerInvoices(advertiserProfile.stripe_customer_id, limit)

    return NextResponse.json({ invoices })
  } catch (error) {
    console.error('Error in GET /api/billing/invoices:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch invoices',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
