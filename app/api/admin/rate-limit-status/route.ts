import { NextRequest, NextResponse } from 'next/server'
import { getGlobalRateLimiter } from '@/lib/courtlistener/global-rate-limiter'
import { requireApiKey } from '@/lib/security/api-auth'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/rate-limit-status
 * Returns detailed rate limit status for CourtListener API
 *
 * This endpoint provides real-time rate limit information for monitoring
 * during bulk import operations.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Require API key authentication
    const auth = requireApiKey(request, { allow: ['SYNC_API_KEY'] })
    if (!('ok' in auth && auth.ok === true)) {
      return auth
    }

    const rateLimiter = getGlobalRateLimiter()

    // Get comprehensive stats
    const [stats, resetTime, isLimited] = await Promise.all([
      rateLimiter.getUsageStats(),
      rateLimiter.getResetTime(),
      rateLimiter.isRateLimited(),
    ])

    // Calculate additional metrics
    const timeToReset = resetTime.getTime() - Date.now()
    const minutesToReset = Math.ceil(timeToReset / (1000 * 60))

    // Determine status level
    let status: 'healthy' | 'warning' | 'critical' | 'blocked'
    if (isLimited) {
      status = 'blocked'
    } else if (stats.utilizationPercent >= 90) {
      status = 'critical'
    } else if (stats.utilizationPercent >= 75) {
      status = 'warning'
    } else {
      status = 'healthy'
    }

    // Calculate estimated time until rate limit at current pace
    let estimatedTimeUntilLimit: number | null = null
    if (stats.projectedHourly && stats.projectedHourly > stats.limit) {
      const requestsRemaining = stats.remaining
      const timeElapsed = Date.now() - stats.windowStart.getTime()
      if (timeElapsed > 0 && stats.totalRequests > 0) {
        const requestRate = stats.totalRequests / timeElapsed // requests per ms
        estimatedTimeUntilLimit = Math.ceil(requestsRemaining / requestRate)
      }
    }

    logger.info('[Rate Limit Status] Status retrieved', {
      status,
      utilization: stats.utilizationPercent.toFixed(2),
      remaining: stats.remaining,
    })

    return NextResponse.json({
      success: true,
      status,
      rateLimitInfo: {
        isRateLimited: isLimited,
        currentRequests: stats.totalRequests,
        limit: stats.limit,
        bufferLimit: 4500, // Safe limit
        hardLimit: 5000, // CourtListener's actual limit
        remaining: stats.remaining,
        utilizationPercent: parseFloat(stats.utilizationPercent.toFixed(2)),
      },
      window: {
        windowStart: stats.windowStart.toISOString(),
        windowEnd: stats.windowEnd.toISOString(),
        resetAt: resetTime.toISOString(),
        timeToResetMs: timeToReset,
        minutesToReset,
      },
      metrics: {
        lastRequest: stats.lastRequest?.toISOString() || null,
        projectedHourly: stats.projectedHourly || null,
        estimatedTimeUntilLimitMs: estimatedTimeUntilLimit,
      },
      recommendations: getRecommendations(status, stats),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('[Rate Limit Status] Error retrieving status', { error })
    return NextResponse.json(
      {
        error: 'Failed to retrieve rate limit status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Generate recommendations based on current rate limit status
 */
function getRecommendations(
  status: 'healthy' | 'warning' | 'critical' | 'blocked',
  stats: any
): string[] {
  const recommendations: string[] = []

  switch (status) {
    case 'healthy':
      recommendations.push('Rate limit is healthy. Continue normal operations.')
      if (stats.projectedHourly && stats.projectedHourly > 4000) {
        recommendations.push('Consider slowing down to stay under 4000 requests/hour.')
      }
      break

    case 'warning':
      recommendations.push('Approaching rate limit (75%+). Consider slowing down sync operations.')
      recommendations.push('Increase delays between batch operations.')
      recommendations.push('Monitor closely for next 15 minutes.')
      break

    case 'critical':
      recommendations.push('CRITICAL: Rate limit nearly exhausted (90%+).')
      recommendations.push('PAUSE sync operations immediately.')
      recommendations.push(`Wait at least 30 minutes before resuming.`)
      recommendations.push('Reduce batch sizes when resuming.')
      break

    case 'blocked':
      recommendations.push('BLOCKED: Rate limit exceeded.')
      recommendations.push(`Wait until ${stats.windowEnd} before making more requests.`)
      recommendations.push('Review sync configuration to prevent future overages.')
      recommendations.push('Consider spreading sync operations across multiple days.')
      break
  }

  return recommendations
}
