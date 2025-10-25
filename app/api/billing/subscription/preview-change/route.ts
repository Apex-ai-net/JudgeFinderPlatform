import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { previewSubscriptionChange } from '@/lib/billing/subscription-management'

export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/subscription/preview-change
 * Preview proration when changing subscription plans
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subscriptionId, newPriceId } = body

    if (!subscriptionId || !newPriceId) {
      return NextResponse.json(
        { error: 'subscriptionId and newPriceId are required' },
        { status: 400 }
      )
    }

    const preview = await previewSubscriptionChange(subscriptionId, newPriceId)

    return NextResponse.json({ preview })
  } catch (error) {
    console.error('Failed to preview subscription change:', error)
    return NextResponse.json({ error: 'Failed to preview subscription change' }, { status: 500 })
  }
}
