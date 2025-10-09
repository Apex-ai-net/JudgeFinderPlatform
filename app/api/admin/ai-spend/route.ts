/**
 * Admin API: AI Spending Monitoring
 * Provides real-time visibility into AI costs and budget usage
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCostTracker, AI_BUDGETS } from '@/lib/ai/cost-tracker'
import { requireAdmin } from '@/lib/auth/is-admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/ai-spend
 * Returns current AI spending and budget status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Admin authentication check using database-backed authorization
    await requireAdmin()

    // Get cost tracker instance
    const costTracker = getCostTracker()

    // Get comprehensive cost breakdown
    const breakdown = await costTracker.getCostBreakdown()
    const budgetStatus = await costTracker.checkBudget(0)

    // Calculate budget utilization percentages
    const dailyUtilization = (breakdown.daily / AI_BUDGETS.DAILY_LIMIT) * 100
    const monthlyUtilization = (breakdown.monthly / AI_BUDGETS.MONTHLY_LIMIT) * 100

    // Determine health status
    let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (dailyUtilization >= 100 || monthlyUtilization >= 100) {
      healthStatus = 'critical'
    } else if (dailyUtilization >= 80 || monthlyUtilization >= 80) {
      healthStatus = 'warning'
    }

    // Calculate projected monthly spend based on daily average
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const dayOfMonth = new Date().getDate()
    const dailyAverage = breakdown.monthly / dayOfMonth
    const projectedMonthly = dailyAverage * daysInMonth

    const response = {
      timestamp: new Date().toISOString(),
      healthStatus,

      daily: {
        spent: breakdown.daily,
        limit: AI_BUDGETS.DAILY_LIMIT,
        remaining: Math.max(0, AI_BUDGETS.DAILY_LIMIT - breakdown.daily),
        utilization: dailyUtilization,
        requestCount: breakdown.requestCount,
        averageCostPerRequest: breakdown.averageCostPerRequest,
      },

      monthly: {
        spent: breakdown.monthly,
        limit: AI_BUDGETS.MONTHLY_LIMIT,
        remaining: Math.max(0, AI_BUDGETS.MONTHLY_LIMIT - breakdown.monthly),
        utilization: monthlyUtilization,
        projected: projectedMonthly,
        daysElapsed: dayOfMonth,
        daysRemaining: daysInMonth - dayOfMonth,
      },

      budgetLimits: {
        daily: AI_BUDGETS.DAILY_LIMIT,
        monthly: AI_BUDGETS.MONTHLY_LIMIT,
        perRequest: AI_BUDGETS.PER_REQUEST_MAX,
        warningThreshold: AI_BUDGETS.WARNING_THRESHOLD,
      },

      canProceed: budgetStatus.canProceed,
      warningLevel: budgetStatus.warningLevel,
      message: budgetStatus.message,

      recentActivity: breakdown.recentRecords.map((record) => ({
        amount: record.amount,
        judgeName: record.metadata.judgeName || 'Unknown',
        model: record.metadata.model,
        caseCount: record.metadata.caseCount,
        timestamp: record.recordedAt,
      })),

      recommendations: generateRecommendations(
        dailyUtilization,
        monthlyUtilization,
        projectedMonthly,
        breakdown.averageCostPerRequest
      ),
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Error fetching AI spend data:', error)

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

    return NextResponse.json(
      {
        error: 'Failed to fetch AI spending data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/ai-spend/reset
 * Reset daily costs (for testing/admin purposes)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Admin authentication check using database-backed authorization
    await requireAdmin()

    const body = await request.json()
    const { action } = body

    if (action !== 'reset-daily') {
      return NextResponse.json({ error: 'Invalid action. Use: reset-daily' }, { status: 400 })
    }

    const costTracker = getCostTracker()
    await costTracker.resetDailyCosts()

    return NextResponse.json({
      success: true,
      message: 'Daily AI costs reset successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error resetting AI costs:', error)

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

    return NextResponse.json(
      {
        error: 'Failed to reset AI costs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Generate actionable recommendations based on spending patterns
 */
function generateRecommendations(
  dailyUtilization: number,
  monthlyUtilization: number,
  projectedMonthly: number,
  avgCostPerRequest: number
): string[] {
  const recommendations: string[] = []

  // Critical budget warnings
  if (dailyUtilization >= 100) {
    recommendations.push('🚫 CRITICAL: Daily budget exceeded - AI analytics temporarily disabled')
  } else if (monthlyUtilization >= 100) {
    recommendations.push(
      '🚫 CRITICAL: Monthly budget exceeded - AI analytics disabled until next month'
    )
  }

  // Warning level recommendations
  if (dailyUtilization >= 80 && dailyUtilization < 100) {
    recommendations.push('⚠️  Approaching daily limit - consider reducing batch size')
  }

  if (monthlyUtilization >= 80 && monthlyUtilization < 100) {
    recommendations.push('⚠️  Approaching monthly limit - prioritize high-value judges only')
  }

  // Projection warnings
  if (projectedMonthly > AI_BUDGETS.MONTHLY_LIMIT * 1.2) {
    recommendations.push(
      `📊 Projected monthly spend ($${projectedMonthly.toFixed(2)}) exceeds budget - reduce generation frequency`
    )
  }

  // Cost efficiency recommendations
  if (avgCostPerRequest > 0.06) {
    recommendations.push(
      '💡 Average cost high - consider reducing case document limit per analysis'
    )
  }

  // Positive feedback
  if (monthlyUtilization < 50 && dailyUtilization < 50) {
    recommendations.push('✅ Budget usage healthy - current pace sustainable')
  }

  // Cache optimization
  recommendations.push('💾 Enable indefinite caching to prevent regeneration costs')
  recommendations.push('🎯 Use batch processing with limits to control daily spend')

  return recommendations
}
