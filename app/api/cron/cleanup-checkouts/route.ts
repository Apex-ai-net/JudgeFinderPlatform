import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 1 minute max (Netlify function timeout)

/**
 * POST /api/cron/cleanup-checkouts
 *
 * Scheduled cron job to cleanup expired pending checkouts (older than 7 days)
 *
 * SECURITY: Requires CRON_SECRET header
 *
 * Netlify cron schedule: Daily at 2:00 AM UTC
 *
 * Response:
 * {
 *   success: boolean
 *   expired_count: number
 *   message: string
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret) {
      logger.error('CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Cron job not configured' },
        { status: 503 }
      )
    }

    if (authHeader !== `Bearer ${expectedSecret}`) {
      logger.warn('Unauthorized cron job attempt - invalid secret')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    logger.info('Starting pending checkouts cleanup job')

    // Call cleanup function
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('cleanup_expired_pending_checkouts')

    if (error) {
      logger.error('Checkout cleanup failed', { error: error.message })
      return NextResponse.json(
        {
          success: false,
          expired_count: 0,
          message: 'Cleanup failed',
          error: error.message,
        },
        { status: 500 }
      )
    }

    const expiredCount = data || 0
    const duration = Date.now() - startTime

    logger.info('Checkout cleanup completed', {
      expired_count: expiredCount,
      duration_ms: duration,
    })

    return NextResponse.json({
      success: true,
      expired_count: expiredCount,
      message: `Marked ${expiredCount} pending checkouts as expired`,
      duration_ms: duration,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error(
      'Unexpected error in checkout cleanup',
      { duration_ms: duration },
      error instanceof Error ? error : undefined
    )

    return NextResponse.json(
      {
        success: false,
        expired_count: 0,
        message: 'Unexpected error during cleanup',
      },
      { status: 500 }
    )
  }
}
