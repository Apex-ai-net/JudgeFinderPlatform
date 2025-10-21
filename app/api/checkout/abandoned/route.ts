import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/checkout/abandoned
 *
 * Returns user's abandoned checkouts (last 7 days) for recovery UI
 *
 * SECURITY: Requires authentication
 *
 * Response:
 * {
 *   abandoned_checkouts: Array<{
 *     id: string
 *     organization_name: string
 *     email: string
 *     billing_cycle: 'monthly' | 'annual'
 *     notes: string | null
 *     promo_code: string | null
 *     judge_name: string | null
 *     court_name: string | null
 *     ad_type: string
 *     created_at: string
 *     days_ago: number
 *   }>
 * }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Require authentication
    const authCtx = await auth()
    const userId = authCtx.userId

    if (!userId) {
      logger.warn('Unauthorized access to abandoned checkouts endpoint')
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    // Get abandoned checkouts from database
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_user_abandoned_checkouts', {
      p_clerk_user_id: userId,
    })

    if (error) {
      logger.error('Failed to fetch abandoned checkouts', {
        userId,
        error: error.message,
      })
      return NextResponse.json(
        { error: 'Failed to fetch abandoned checkouts' },
        { status: 500 }
      )
    }

    logger.info('Fetched abandoned checkouts', {
      userId,
      count: data?.length || 0,
    })

    return NextResponse.json({
      abandoned_checkouts: data || [],
    })
  } catch (error) {
    logger.error('Error in abandoned checkouts endpoint', {}, error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/checkout/abandoned/recover
 *
 * Recovers an abandoned checkout by pre-filling form data
 *
 * SECURITY: Requires authentication + ownership verification
 *
 * Request body:
 * {
 *   checkout_id: string (UUID of pending checkout)
 * }
 *
 * Response:
 * {
 *   form_data: {
 *     organization_name: string
 *     email: string
 *     billing_cycle: 'monthly' | 'annual'
 *     notes: string | null
 *     promo_code: string | null
 *     judge_id: string | null
 *     judge_name: string | null
 *     court_name: string | null
 *     court_level: 'federal' | 'state' | null
 *     ad_position: 1 | 2 | null
 *     ad_type: string
 *   }
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Require authentication
    const authCtx = await auth()
    const userId = authCtx.userId

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request
    const body = await request.json()
    const { checkout_id } = body

    if (!checkout_id) {
      return NextResponse.json(
        { error: 'checkout_id is required' },
        { status: 400 }
      )
    }

    // Get checkout data (with ownership verification via RLS)
    const supabase = await createClient()
    const { data: checkout, error } = await supabase
      .from('pending_checkouts')
      .select('*')
      .eq('id', checkout_id)
      .eq('clerk_user_id', userId) // Ownership verification
      .single()

    if (error || !checkout) {
      logger.warn('Abandoned checkout not found or unauthorized', {
        userId,
        checkoutId: checkout_id,
      })
      return NextResponse.json(
        { error: 'Checkout not found or access denied' },
        { status: 404 }
      )
    }

    // Return form data for recovery
    const formData = {
      organization_name: checkout.organization_name,
      email: checkout.email,
      billing_cycle: checkout.billing_cycle,
      notes: checkout.notes,
      promo_code: checkout.promo_code,
      judge_id: checkout.judge_id,
      judge_name: checkout.judge_name,
      court_name: checkout.court_name,
      court_level: checkout.court_level,
      ad_position: checkout.ad_position,
      ad_type: checkout.ad_type,
    }

    logger.info('Recovered abandoned checkout', {
      userId,
      checkoutId: checkout_id,
    })

    return NextResponse.json({ form_data: formData })
  } catch (error) {
    logger.error('Error recovering checkout', {}, error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Failed to recover checkout' },
      { status: 500 }
    )
  }
}
