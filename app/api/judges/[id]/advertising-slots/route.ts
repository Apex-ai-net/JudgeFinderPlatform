import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/judges/[id]/advertising-slots
 *
 * Returns advertising slots for a specific judge, including:
 * - Active bookings with advertiser information
 * - Available slots
 */
export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Judge ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch active bookings for this judge
    const { data: bookings, error: bookingsError } = await supabase
      .from('ad_spot_bookings')
      .select(
        `
        *,
        advertiser:advertiser_profiles(
          id,
          firm_name,
          description,
          website,
          phone,
          email,
          logo_url,
          specializations,
          bar_number
        )
      `
      )
      .eq('judge_id', id)
      .in('status', ['active', 'trialing'])
      .order('position')

    if (bookingsError) {
      console.error('Error fetching ad bookings:', bookingsError)
      return NextResponse.json({ error: 'Failed to fetch advertising slots' }, { status: 500 })
    }

    // Define max rotations (2 slots per judge)
    const MAX_ROTATIONS = 2

    // Transform bookings into slot format
    const activeSlots = (bookings || []).map((booking) => ({
      id: booking.id,
      position: booking.position,
      status: 'booked',
      base_price_monthly: booking.monthly_price,
      pricing_tier: booking.court_level,
      advertiser: booking.advertiser
        ? {
            id: booking.advertiser.id,
            firm_name: booking.advertiser.firm_name,
            description: booking.advertiser.description || '',
            website: booking.advertiser.website,
            phone: booking.advertiser.phone,
            email: booking.advertiser.email,
            logo_url: booking.advertiser.logo_url,
            specializations: booking.advertiser.specializations || [],
            bar_number: booking.advertiser.bar_number,
            badge: 'verified',
          }
        : null,
    }))

    // Create available slots for positions not booked
    const bookedPositions = new Set(activeSlots.map((slot) => slot.position))
    const availableSlots = Array.from({ length: MAX_ROTATIONS }, (_, i) => i + 1)
      .filter((position) => !bookedPositions.has(position))
      .map((position) => ({
        id: `available-${position}`,
        position,
        status: 'available',
        advertiser: null,
      }))

    // Combine and sort by position
    const allSlots = [...activeSlots, ...availableSlots].sort((a, b) => a.position - b.position)

    return NextResponse.json({
      slots: allSlots,
      max_rotations: MAX_ROTATIONS,
    })
  } catch (error) {
    console.error('Error in advertising-slots API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
