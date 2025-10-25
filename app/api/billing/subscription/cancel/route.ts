import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  cancelSubscriptionAtPeriodEnd,
  cancelSubscriptionImmediately,
  reactivateSubscription,
} from '@/lib/billing/subscription-management'

export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/subscription/cancel
 * Cancel or reactivate a subscription
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subscriptionId, action, immediately } = body

    if (!subscriptionId || !action) {
      return NextResponse.json({ error: 'subscriptionId and action are required' }, { status: 400 })
    }

    let subscription

    if (action === 'cancel') {
      subscription = immediately
        ? await cancelSubscriptionImmediately(subscriptionId)
        : await cancelSubscriptionAtPeriodEnd(subscriptionId)
    } else if (action === 'reactivate') {
      subscription = await reactivateSubscription(subscriptionId)
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "cancel" or "reactivate"' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: subscription.current_period_end,
      },
    })
  } catch (error) {
    console.error('Failed to cancel/reactivate subscription:', error)
    return NextResponse.json({ error: 'Failed to process subscription action' }, { status: 500 })
  }
}
