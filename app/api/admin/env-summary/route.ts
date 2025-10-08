import { NextRequest, NextResponse } from 'next/server'
import { getEnvironmentSummary } from '@/lib/utils/env-validator'
import { auth } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/env-summary
 *
 * Returns environment configuration summary
 * (Admin only endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || []
    if (!adminUserIds.includes(userId)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get environment summary
    const summary = getEnvironmentSummary()

    return NextResponse.json(summary, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error) {
    console.error('Error getting environment summary:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
