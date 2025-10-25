import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getAvailablePlans } from '@/lib/billing/subscription-management'

export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/subscription/available-plans
 * Get available plans for upgrade/downgrade
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPriceId } = body

    if (!currentPriceId) {
      return NextResponse.json({ error: 'currentPriceId is required' }, { status: 400 })
    }

    const plans = await getAvailablePlans(currentPriceId)

    return NextResponse.json({ plans })
  } catch (error) {
    console.error('Failed to get available plans:', error)
    return NextResponse.json({ error: 'Failed to get available plans' }, { status: 500 })
  }
}
