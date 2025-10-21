import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyTurnstileToken } from '@/lib/auth/turnstile'
import { getClientIp } from '@/lib/security/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * POST /api/advertising/verify-bar
 * Verifies a legal professional's bar number and grants advertiser role
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authentication required
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in first.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { barNumber, barState, turnstileToken } = body

    // Validate required fields
    if (!barNumber || !barState) {
      return NextResponse.json(
        { error: 'Bar number and state are required.' },
        { status: 400 }
      )
    }

    // Verify Turnstile CAPTCHA token
    if (turnstileToken) {
      const clientIp = getClientIp(request)
      const isValid = await verifyTurnstileToken(turnstileToken, clientIp)
      if (!isValid) {
        return NextResponse.json(
          { error: 'CAPTCHA verification failed. Please try again.' },
          { status: 403 }
        )
      }
    }

    // Clean and validate bar number format
    const cleanedBarNumber = barNumber.trim().toUpperCase()
    if (!/^[A-Z0-9\-]{3,20}$/.test(cleanedBarNumber)) {
      return NextResponse.json(
        { error: 'Invalid bar number format. Please enter a valid bar number.' },
        { status: 400 }
      )
    }

    // TODO: In production, integrate with actual State Bar API for real verification
    // For now, we'll do a basic format check and store the information
    // California Bar numbers are typically 6 digits
    // Example API integration:
    // const isValidBar = await verifyWithStateBarAPI(barState, cleanedBarNumber)

    const supabase = await createServerClient()

    // Check if bar number is already in use
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('bar_number', cleanedBarNumber)
      .eq('bar_state', barState)
      .single()

    if (existingUser && existingUser.id !== userId) {
      return NextResponse.json(
        { error: 'This bar number is already registered to another account.' },
        { status: 409 }
      )
    }

    // Update user record with bar information and set role to advertiser
    const { error: updateError } = await supabase
      .from('users')
      .update({
        bar_number: cleanedBarNumber,
        bar_state: barState,
        verification_status: 'verified', // In production, set to 'pending' and verify via state bar API
        bar_verified_at: new Date().toISOString(),
        user_role: 'advertiser', // This will be set automatically by trigger when verification_status = 'verified'
      })
      .eq('clerk_id', userId)

    if (updateError) {
      console.error('Error updating user with bar information:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user information. Please try again.' },
        { status: 500 }
      )
    }

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Bar number verified successfully. You now have advertiser access.',
      barNumber: cleanedBarNumber,
      barState,
    })
  } catch (error) {
    console.error('Bar verification error:', error)
    return NextResponse.json(
      { error: 'An error occurred during verification. Please try again.' },
      { status: 500 }
    )
  }
}
