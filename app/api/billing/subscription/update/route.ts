import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { updateSubscription } from '@/lib/billing/subscription-management'

export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/subscription/update
 * Update subscription to a new plan
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subscriptionId, newPriceId, prorationBehavior } = body

    if (!subscriptionId || !newPriceId) {
      return NextResponse.json(
        { error: 'subscriptionId and newPriceId are required' },
        { status: 400 }
      )
    }

    const subscription = await updateSubscription({
      subscriptionId,
      newPriceId,
      prorationBehavior,
    })

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
      },
    })
  } catch (error) {
    console.error('Failed to update subscription:', error)
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
  }
}
