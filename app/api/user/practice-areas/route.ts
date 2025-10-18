import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { practice_areas } = body

    if (!Array.isArray(practice_areas)) {
      return NextResponse.json({ error: 'Invalid practice_areas format' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    // Get user ID from app_users
    const { data: userData, error: userError } = await supabase
      .from('app_users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update practice areas in metadata
    const { error: updateError } = await supabase
      .from('app_users')
      .update({
        practice_areas,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userData.id)

    if (updateError) {
      console.error('Error updating practice areas:', updateError)
      return NextResponse.json({ error: 'Failed to update practice areas' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      practice_areas,
    })
  } catch (error) {
    console.error('Error in POST /api/user/practice-areas:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServiceRoleClient()

    // Get user ID and practice areas from app_users
    const { data: userData, error: userError } = await supabase
      .from('app_users')
      .select('practice_areas')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      practice_areas: userData.practice_areas || [],
    })
  } catch (error) {
    console.error('Error in GET /api/user/practice-areas:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
