import { NextRequest, NextResponse } from 'next/server'
import { getEnvironmentSummary } from '@/lib/utils/env-validator'
import { requireAdmin } from '@/lib/auth/is-admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/env-summary
 *
 * Returns environment configuration summary
 * (Admin only endpoint)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check admin authentication with database-backed authorization
    await requireAdmin()

    // Get environment summary
    const summary = getEnvironmentSummary()

    return NextResponse.json(summary, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error getting environment summary:', error)

    // Handle MFA requirement
    if (error instanceof Error && error.message === 'MFA_REQUIRED') {
      return NextResponse.json({ error: 'MFA required for admin access' }, { status: 403 })
    }

    // Handle authentication/authorization errors
    if (
      error instanceof Error &&
      (error.message === 'Authentication required' || error.message === 'Admin access required')
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
