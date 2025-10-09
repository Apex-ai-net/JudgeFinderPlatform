import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Stripe from 'stripe'
import { getStripeClient, isStripeEnabled } from '@/lib/ads/stripe'
import { logger } from '@/lib/utils/logger'
import { fetchCurrentAppUser } from '@/lib/auth/user-mapping'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  plan: z.enum(['pro', 'team']).default('pro'),
  seats: z.coerce.number().int().min(1).max(250).default(1),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const started = Date.now()

  if (!isStripeEnabled()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || 'Invalid body' },
      { status: 400 }
    )
  }

  const { plan, seats } = parsed.data
  const user = await fetchCurrentAppUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stripe = getStripeClient() as Stripe

  const priceId = plan === 'team' ? process.env.STRIPE_PRICE_TEAM : process.env.STRIPE_PRICE_PRO
  if (!priceId) {
    logger.error('Missing Stripe price ID', { plan })
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: seats }],
      metadata: {
        user_id: user.clerk_user_id,
        plan,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://judgefinder.io'}/dashboard?billing=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://judgefinder.io'}/dashboard?billing=cancel`,
    })

    logger.apiResponse('POST', '/api/billing/checkout', 200, Date.now() - started, {
      session: session.id,
    })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    logger.apiResponse('POST', '/api/billing/checkout', 500, Date.now() - started, {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
