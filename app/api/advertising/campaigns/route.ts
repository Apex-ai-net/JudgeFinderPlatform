import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { buildRateLimiter, getClientIp } from '@/lib/security/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 26

/**
 * GET /api/advertising/campaigns
 *
 * List user's advertising campaigns
 *
 * SECURITY: Requires authentication
 *
 * Query params:
 * - status?: 'active' | 'paused' | 'completed' | 'all' (default: 'active')
 * - limit?: number (default: 20, max: 100)
 * - offset?: number (default: 0)
 *
 * Response:
 * {
 *   campaigns: Array<{
 *     id: string
 *     name: string
 *     status: string
 *     budget: number
 *     spent: number
 *     impressions: number
 *     clicks: number
 *     judge_id?: string
 *     judge_name?: string
 *     court_name?: string
 *     created_at: string
 *     updated_at: string
 *   }>
 *   total_count: number
 *   has_more: boolean
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
      prefix: 'api:advertising:campaigns',
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
    const status = searchParams.get('status') || 'active'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Query campaigns from database
    const supabase = await createClient()

    // Base query
    let query = supabase
      .from('ad_campaigns')
      .select('*, ad_orders(total_amount, stripe_subscription_id)', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by status if not 'all'
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: campaigns, error, count } = await query

    if (error) {
      logger.error('Failed to fetch campaigns', { userId, error: error.message })
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      )
    }

    logger.info('Fetched campaigns', {
      userId,
      count: campaigns?.length || 0,
      status,
    })

    return NextResponse.json({
      campaigns: campaigns || [],
      total_count: count || 0,
      has_more: (count || 0) > offset + limit,
    })
  } catch (error) {
    logger.error('Error in campaigns endpoint', {}, error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/advertising/campaigns
 *
 * Create a new advertising campaign
 *
 * SECURITY: Requires authentication
 *
 * Request body:
 * {
 *   name: string
 *   judge_id?: string (for judge-specific campaigns)
 *   judge_name?: string
 *   court_name?: string
 *   budget: number (monthly budget in dollars)
 *   start_date?: string (ISO date)
 *   end_date?: string (ISO date, optional)
 *   notes?: string
 * }
 *
 * Response:
 * {
 *   campaign_id: string
 *   message: string
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authentication
    const authCtx = await auth()
    const userId = authCtx.userId

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const rateLimiter = buildRateLimiter({
      tokens: 10,
      window: '1 h',
      prefix: 'api:advertising:campaigns:create',
    })
    const clientIp = getClientIp(request)
    const { success } = await rateLimiter.limit(`${userId}:${clientIp}`)

    if (!success) {
      return NextResponse.json(
        { error: 'Too many campaign creation requests' },
        { status: 429 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      name,
      judge_id,
      judge_name,
      court_name,
      budget,
      start_date,
      end_date,
      notes,
    } = body

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Campaign name is required' },
        { status: 400 }
      )
    }

    if (!budget || typeof budget !== 'number' || budget <= 0) {
      return NextResponse.json(
        { error: 'Valid budget is required (must be > 0)' },
        { status: 400 }
      )
    }

    // Create campaign in database
    const supabase = await createClient()
    const { data: campaign, error } = await supabase
      .from('ad_campaigns')
      .insert({
        user_id: userId,
        name: name.trim(),
        judge_id: judge_id || null,
        judge_name: judge_name || null,
        court_name: court_name || null,
        monthly_budget: budget,
        status: 'pending', // Will activate after payment
        start_date: start_date || new Date().toISOString(),
        end_date: end_date || null,
        notes: notes || null,
      })
      .select('id')
      .single()

    if (error || !campaign) {
      logger.error('Failed to create campaign', { userId, error: error?.message })
      return NextResponse.json(
        { error: 'Failed to create campaign' },
        { status: 500 }
      )
    }

    logger.info('Campaign created', {
      userId,
      campaignId: campaign.id,
      budget,
    })

    return NextResponse.json({
      campaign_id: campaign.id,
      message: 'Campaign created successfully',
    }, { status: 201 })
  } catch (error) {
    logger.error('Error creating campaign', {}, error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
