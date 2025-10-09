import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Stripe from 'stripe'
import { getStripeClient, isStripeEnabled } from '@/lib/ads/stripe'
import { logger } from '@/lib/utils/logger'
import { createServerClient } from '@/lib/supabase/server'
import { fetchCurrentAppUser } from '@/lib/auth/user-mapping'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  booking_id: z.string().uuid(),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isStripeEnabled()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const user = await fetchCurrentAppUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let parsed
  try {
    const json = await request.json()
    const res = bodySchema.safeParse(json)
    if (!res.success) {
      return NextResponse.json(
        { error: res.error.errors[0]?.message || 'Invalid body' },
        { status: 400 }
      )
    }
    parsed = res.data
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = await createServerClient()
  const { data: booking, error: bookingError } = await supabase
    .from('ad_bookings')
    .select('id, advertiser_id, price_paid')
    .eq('id', parsed.booking_id)
    .maybeSingle<{ id: string; advertiser_id: string; price_paid: number }>()

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const stripe = getStripeClient() as Stripe
  const priceId = process.env.STRIPE_PRICE_AD_SLOT
  if (!priceId) {
    logger.error('Missing STRIPE_PRICE_AD_SLOT')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        type: 'ad_booking',
        booking_id: booking.id,
        advertiser_id: booking.advertiser_id,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://judgefinder.io'}/dashboard?ad=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://judgefinder.io'}/dashboard?ad=cancel`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    logger.error('Failed to create ad booking checkout session', { error })
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
