import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { buildRateLimiter, getClientIp } from '@/lib/security/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 26

/**
 * GET /api/advertising/campaigns/[id]
 *
 * Get single campaign details with performance metrics
 *
 * SECURITY: Requires authentication + ownership verification
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const authCtx = await auth()
    const userId = authCtx.userId

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get campaign with ownership verification
    const supabase = await createClient()
    const { data: campaign, error } = await supabase
      .from('ad_campaigns')
      .select('*, ad_orders(*)')
      .eq('id', id)
      .eq('user_id', userId) // Ownership verification
      .single()

    if (error || !campaign) {
      logger.warn('Campaign not found or unauthorized', { userId, campaignId: id })
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({ campaign })
  } catch (error) {
    logger.error('Error fetching campaign', {}, error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/advertising/campaigns/[id]
 *
 * Update campaign details
 *
 * SECURITY: Requires authentication + ownership verification
 *
 * Request body:
 * {
 *   name?: string
 *   status?: 'active' | 'paused' | 'completed'
 *   budget?: number
 *   end_date?: string | null
 *   notes?: string
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const authCtx = await auth()
    const userId = authCtx.userId

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const rateLimiter = buildRateLimiter({
      tokens: 20,
      window: '1 h',
      prefix: 'api:advertising:campaigns:update',
    })
    const clientIp = getClientIp(request)
    const { success } = await rateLimiter.limit(`${userId}:${clientIp}`)

    if (!success) {
      return NextResponse.json(
        { error: 'Too many update requests' },
        { status: 429 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, status, budget, end_date, notes } = body

    // Build update object
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Invalid campaign name' },
          { status: 400 }
        )
      }
      updates.name = name.trim()
    }

    if (status !== undefined) {
      const validStatuses = ['active', 'paused', 'completed']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
      updates.status = status
    }

    if (budget !== undefined) {
      if (typeof budget !== 'number' || budget <= 0) {
        return NextResponse.json(
          { error: 'Invalid budget (must be > 0)' },
          { status: 400 }
        )
      }
      updates.monthly_budget = budget
    }

    if (end_date !== undefined) {
      updates.end_date = end_date
    }

    if (notes !== undefined) {
      updates.notes = notes
    }

    // Update campaign (with ownership verification)
    const supabase = await createClient()
    const { error } = await supabase
      .from('ad_campaigns')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId) // Ownership verification

    if (error) {
      logger.error('Failed to update campaign', {
        userId,
        campaignId: id,
        error: error.message,
      })
      return NextResponse.json(
        { error: 'Failed to update campaign' },
        { status: 500 }
      )
    }

    logger.info('Campaign updated', { userId, campaignId: id, updates })

    return NextResponse.json({
      message: 'Campaign updated successfully',
    })
  } catch (error) {
    logger.error('Error updating campaign', {}, error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/advertising/campaigns/[id]
 *
 * Delete/cancel a campaign
 *
 * SECURITY: Requires authentication + ownership verification
 * NOTE: Soft delete - marks as 'cancelled', doesn't actually delete
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const authCtx = await auth()
    const userId = authCtx.userId

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const rateLimiter = buildRateLimiter({
      tokens: 10,
      window: '1 h',
      prefix: 'api:advertising:campaigns:delete',
    })
    const clientIp = getClientIp(request)
    const { success } = await rateLimiter.limit(`${userId}:${clientIp}`)

    if (!success) {
      return NextResponse.json(
        { error: 'Too many delete requests' },
        { status: 429 }
      )
    }

    // Soft delete: mark as cancelled (with ownership verification)
    const supabase = await createClient()
    const { error } = await supabase
      .from('ad_campaigns')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId) // Ownership verification

    if (error) {
      logger.error('Failed to delete campaign', {
        userId,
        campaignId: id,
        error: error.message,
      })
      return NextResponse.json(
        { error: 'Failed to delete campaign' },
        { status: 500 }
      )
    }

    logger.info('Campaign cancelled', { userId, campaignId: id })

    return NextResponse.json({
      message: 'Campaign cancelled successfully',
    })
  } catch (error) {
    logger.error('Error deleting campaign', {}, error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
