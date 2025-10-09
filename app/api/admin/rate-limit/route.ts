/**
 * Rate Limit Monitoring API
 *
 * Provides real-time rate limit statistics and management for admins
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { resolveAdminStatus } from '@/lib/auth/is-admin'
import { getGlobalRateLimiter } from '@/lib/courtlistener/global-rate-limiter'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/rate-limit
 *
 * Get current rate limit statistics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Admin authentication required
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const status = await resolveAdminStatus()
    if (!status.isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const limiter = getGlobalRateLimiter()

    // Get comprehensive statistics
    const [stats, remaining, resetTime, isLimited, report] = await Promise.all([
      limiter.getUsageStats(),
      limiter.getRemainingRequests(),
      limiter.getResetTime(),
      limiter.isRateLimited(),
      limiter.getStatusReport(),
    ])

    // Calculate health status
    const health = calculateHealthStatus(stats.utilizationPercent)

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalRequests: stats.totalRequests,
          limit: stats.limit,
          remaining: stats.remaining,
          utilizationPercent: parseFloat(stats.utilizationPercent.toFixed(2)),
          windowStart: stats.windowStart.toISOString(),
          windowEnd: stats.windowEnd.toISOString(),
          lastRequest: stats.lastRequest?.toISOString() ?? null,
          projectedHourly: stats.projectedHourly ?? null,
        },
        status: {
          isRateLimited: isLimited,
          health,
          resetAt: resetTime.toISOString(),
          minutesUntilReset: Math.ceil((resetTime.getTime() - Date.now()) / 60000),
        },
        report,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Failed to get rate limit stats', { error })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve rate limit statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/rate-limit
 *
 * Manage rate limiter (reset window, etc.)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Admin authentication required
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const status = await resolveAdminStatus()
    if (!status.isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing action parameter',
        },
        { status: 400 }
      )
    }

    const limiter = getGlobalRateLimiter()

    switch (action) {
      case 'reset': {
        await limiter.resetWindow()

        logger.info('Rate limit window manually reset', {
          resetBy: userId,
          timestamp: new Date().toISOString(),
        })

        const newStats = await limiter.getUsageStats()

        return NextResponse.json({
          success: true,
          message: 'Rate limit window reset successfully',
          stats: {
            totalRequests: newStats.totalRequests,
            limit: newStats.limit,
            remaining: newStats.remaining,
            windowStart: newStats.windowStart.toISOString(),
            windowEnd: newStats.windowEnd.toISOString(),
          },
        })
      }

      case 'check': {
        const result = await limiter.checkLimit()

        return NextResponse.json({
          success: true,
          result: {
            allowed: result.allowed,
            remaining: result.remaining,
            limit: result.limit,
            currentCount: result.currentCount,
            utilizationPercent: parseFloat(result.utilizationPercent.toFixed(2)),
            resetAt: result.resetAt.toISOString(),
          },
        })
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action',
            validActions: ['reset', 'check'],
          },
          { status: 400 }
        )
    }
  } catch (error) {
    logger.error('Rate limit management action failed', { error })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute rate limit action',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Calculate health status based on utilization
 */
function calculateHealthStatus(utilizationPercent: number): {
  status: 'healthy' | 'warning' | 'critical'
  color: string
  message: string
} {
  if (utilizationPercent < 70) {
    return {
      status: 'healthy',
      color: 'green',
      message: 'Rate limit usage is healthy',
    }
  } else if (utilizationPercent < 90) {
    return {
      status: 'warning',
      color: 'yellow',
      message: 'Approaching rate limit - monitor closely',
    }
  } else {
    return {
      status: 'critical',
      color: 'red',
      message: 'Critical - rate limit nearly exhausted',
    }
  }
}
