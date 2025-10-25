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
      return NextResponse.json({ error: 'Bar number and state are required.' }, { status: 400 })
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

    const supabase = await createServerClient()

    // SECURITY: Create audit log for all bar verification attempts
    const auditLog = {
      user_id: userId,
      action: 'bar_verification_attempt',
      bar_number: cleanedBarNumber,
      bar_state: barState,
      ip_address: getClientIp(request),
      timestamp: new Date().toISOString(),
    }

    // Log the attempt (implement audit logging table separately)
    console.log('[SECURITY AUDIT] Bar verification attempt:', auditLog)

    // Check if bar number is already in use
    const { data: existingUser } = await supabase
      .from('app_users')
      .select('clerk_user_id')
      .eq('bar_number', cleanedBarNumber)
      .eq('bar_state', barState)
      .single()

    if (existingUser && existingUser.clerk_user_id !== userId) {
      return NextResponse.json(
        { error: 'This bar number is already registered to another account.' },
        { status: 409 }
      )
    }

    // Create verification record in bar_verifications table
    // This provides an audit trail and enables admin workflow
    const { data: verificationRecord, error: verificationError } = await supabase
      .from('bar_verifications')
      .insert({
        user_id: userId,
        bar_number: cleanedBarNumber,
        bar_state: barState,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (verificationError) {
      console.error('[ERROR] Failed to create verification record:', verificationError)
      return NextResponse.json(
        { error: 'Failed to submit verification request. Please try again.' },
        { status: 500 }
      )
    }

    // Update user record with bar information and pending status
    const { error: updateError } = await supabase
      .from('app_users')
      .update({
        bar_number: cleanedBarNumber,
        bar_state: barState,
        verification_status: 'pending',
        // Do NOT set bar_verified_at until actually verified
        // Do NOT set user_role - trigger will set when verification_status = 'verified'
      })
      .eq('clerk_user_id', userId)

    if (updateError) {
      console.error('[SECURITY] Error updating user with bar information:', updateError)
      return NextResponse.json(
        { error: 'Failed to submit verification request. Please try again.' },
        { status: 500 }
      )
    }

    // SECURITY: Log successful submission for admin review
    console.log('[SECURITY AUDIT] Bar verification submitted for admin review:', {
      user_id: userId,
      bar_number: cleanedBarNumber,
      bar_state: barState,
    })

    // Return success with pending status
    return NextResponse.json({
      success: true,
      message:
        'Bar number submitted for verification. An administrator will review your submission within 24-48 hours.',
      barNumber: cleanedBarNumber,
      barState,
      status: 'pending',
    })
  } catch (error) {
    console.error('Bar verification error:', error)
    return NextResponse.json(
      { error: 'An error occurred during verification. Please try again.' },
      { status: 500 }
    )
  }
}
