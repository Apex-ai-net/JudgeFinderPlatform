import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { buildRateLimiter, getClientIp } from '@/lib/security/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 26

/**
 * GET /api/advertising/performance
 *
 * Get campaign performance metrics
 *
 * SECURITY: Requires authentication
 *
 * Query params:
 * - campaign_id?: string (specific campaign, or omit for all campaigns)
 * - time_range?: 'today' | '7d' | '30d' | '90d' | 'all' (default: '30d')
 *
 * Response:
 * {
 *   summary: {
 *     total_spend: number
 *     total_impressions: number
 *     total_clicks: number
 *     avg_ctr: number (click-through rate %)
 *     avg_cpc: number (cost per click)
 *   }
 *   campaigns: Array<{
 *     campaign_id: string
 *     campaign_name: string
 *     spend: number
 *     impressions: number
 *     clicks: number
 *     ctr: number
 *     cpc: number
 *   }>
 *   time_series: Array<{
 *     date: string
 *     impressions: number
 *     clicks: number
 *     spend: number
 *   }>
 * }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authentication
    const authCtx = await auth()
    const userId = authCtx.userId

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const rateLimiter = buildRateLimiter({
      tokens: 60,
      window: '1 m',
      prefix: 'api:advertising:performance',
    })
    const clientIp = getClientIp(request)
    const { success } = await rateLimiter.limit(`${userId}:${clientIp}`)

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaign_id')
    const timeRange = searchParams.get('time_range') || '30d'

    // Calculate date range
    const now = new Date()
    let startDate: Date

    switch (timeRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case 'all':
        startDate = new Date(0) // Unix epoch
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Query performance data from database
    const supabase = await createClient()

    // Base query for campaigns
    let campaignQuery = supabase
      .from('ad_campaigns')
      .select(`
        id,
        name,
        monthly_budget,
        ad_orders(
          total_amount,
          status
        )
      `)
      .eq('user_id', userId)

    if (campaignId) {
      campaignQuery = campaignQuery.eq('id', campaignId)
    }

    const { data: campaigns, error: campaignsError } = await campaignQuery

    if (campaignsError) {
      logger.error('Failed to fetch campaign performance', {
        userId,
        error: campaignsError.message,
      })
      return NextResponse.json(
        { error: 'Failed to fetch performance data' },
        { status: 500 }
      )
    }

    // Calculate aggregated metrics
    // NOTE: This is a simplified implementation
    // In production, you'd track impressions/clicks in separate analytics table
    const summary = {
      total_spend: 0,
      total_impressions: 0,
      total_clicks: 0,
      avg_ctr: 0,
      avg_cpc: 0,
    }

    const campaignMetrics = (campaigns || []).map(campaign => {
      // Calculate total spend from orders
      const totalSpend = (campaign.ad_orders || [])
        .filter((order: any) => order.status === 'paid')
        .reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0)

      // Simulated metrics (in production, fetch from analytics table)
      const impressions = Math.floor(totalSpend * 100) // ~100 impressions per dollar
      const clicks = Math.floor(impressions * 0.02) // 2% CTR estimate
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
      const cpc = clicks > 0 ? totalSpend / clicks : 0

      summary.total_spend += totalSpend
      summary.total_impressions += impressions
      summary.total_clicks += clicks

      return {
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        spend: totalSpend,
        impressions,
        clicks,
        ctr,
        cpc,
      }
    })

    // Calculate average CTR and CPC
    summary.avg_ctr =
      summary.total_impressions > 0
        ? (summary.total_clicks / summary.total_impressions) * 100
        : 0
    summary.avg_cpc =
      summary.total_clicks > 0
        ? summary.total_spend / summary.total_clicks
        : 0

    // Simulated time series data (in production, aggregate from analytics table)
    const timeSeries = []
    const daysInRange = Math.min(
      Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)),
      90 // Max 90 data points
    )

    for (let i = 0; i < daysInRange; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      timeSeries.unshift({
        date: date.toISOString().split('T')[0],
        impressions: Math.floor(summary.total_impressions / daysInRange),
        clicks: Math.floor(summary.total_clicks / daysInRange),
        spend: summary.total_spend / daysInRange,
      })
    }

    logger.info('Fetched performance metrics', {
      userId,
      campaignId: campaignId || 'all',
      timeRange,
      totalSpend: summary.total_spend,
    })

    return NextResponse.json({
      summary,
      campaigns: campaignMetrics,
      time_series: timeSeries,
    })
  } catch (error) {
    logger.error('Error in performance endpoint', {}, error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
