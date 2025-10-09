import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripeClient, isStripeEnabled } from '@/lib/ads/stripe'
import { logger } from '@/lib/utils/logger'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { fetchCurrentAppUser } from '@/lib/auth/user-mapping'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest): Promise<NextResponse> {
  if (!isStripeEnabled()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const user = await fetchCurrentAppUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceRoleClient()
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.clerk_user_id)
    .maybeSingle<{ stripe_customer_id: string | null }>()

  if (!sub || !sub.stripe_customer_id) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
  }

  const stripe = getStripeClient() as Stripe
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://judgefinder.io'}/dashboard`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    logger.error('Failed to create billing portal session', { error })
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
