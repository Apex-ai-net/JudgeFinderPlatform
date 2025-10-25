import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/bar-verifications
 * List all bar verification requests (admin only)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerClient()

    // Check if user is admin
    const { data: user } = await supabase
      .from('app_users')
      .select('is_admin')
      .eq('clerk_user_id', userId)
      .single()

    if (!user || !user.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
    const offset = (page - 1) * limit

    // Query verifications with user details
    let query = supabase
      .from('bar_verifications')
      .select(
        `
        *,
        user:app_users!bar_verifications_user_id_fkey(
          clerk_user_id,
          email,
          full_name
        ),
        admin:app_users!bar_verifications_verified_by_fkey(
          clerk_user_id,
          full_name
        )
      `,
        { count: 'exact' }
      )
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: verifications, error, count } = await query

    if (error) {
      console.error('Error fetching bar verifications:', error)
      return NextResponse.json({ error: 'Failed to fetch verifications' }, { status: 500 })
    }

    return NextResponse.json({
      verifications: verifications || [],
      total: count || 0,
      page,
      limit,
      hasMore: count ? offset + limit < count : false,
    })
  } catch (error) {
    console.error('Admin bar verifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
