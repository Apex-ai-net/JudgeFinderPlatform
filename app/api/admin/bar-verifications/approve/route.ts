import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/bar-verifications/approve
 * Approve or reject a bar verification request (admin only)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
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

    const body = await request.json()
    const { verificationId, action, notes } = body

    if (!verificationId || !action) {
      return NextResponse.json({ error: 'verificationId and action are required' }, { status: 400 })
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 })
    }

    // Get the verification record
    const { data: verification, error: fetchError } = await supabase
      .from('bar_verifications')
      .select('*')
      .eq('id', verificationId)
      .single()

    if (fetchError || !verification) {
      return NextResponse.json({ error: 'Verification not found' }, { status: 404 })
    }

    if (verification.status !== 'pending') {
      return NextResponse.json({ error: 'Verification already processed' }, { status: 400 })
    }

    const newStatus = action === 'approve' ? 'verified' : 'rejected'
    const now = new Date().toISOString()

    // Update verification record
    const { error: updateVerificationError } = await supabase
      .from('bar_verifications')
      .update({
        status: newStatus,
        verified_at: now,
        verified_by: userId,
        admin_notes: notes || null,
      })
      .eq('id', verificationId)

    if (updateVerificationError) {
      console.error('Error updating verification:', updateVerificationError)
      return NextResponse.json({ error: 'Failed to update verification' }, { status: 500 })
    }

    // Update user record
    const userUpdate: any = {
      verification_status: newStatus,
    }

    if (action === 'approve') {
      userUpdate.bar_verified_at = now
      // The trigger set_advertiser_role_on_verification will automatically
      // set user_role to 'advertiser' when verification_status = 'verified'
    }

    const { error: updateUserError } = await supabase
      .from('app_users')
      .update(userUpdate)
      .eq('clerk_user_id', verification.user_id)

    if (updateUserError) {
      console.error('Error updating user:', updateUserError)
      // Rollback verification update
      await supabase
        .from('bar_verifications')
        .update({ status: 'pending', verified_at: null, verified_by: null })
        .eq('id', verificationId)

      return NextResponse.json({ error: 'Failed to update user record' }, { status: 500 })
    }

    // Log the action
    console.log('[ADMIN ACTION] Bar verification decision', {
      verificationId,
      action,
      adminUserId: userId,
      targetUserId: verification.user_id,
      barNumber: verification.bar_number,
      barState: verification.bar_state,
    })

    // TODO: Send email notification to user
    // - For approved: Welcome to advertising, here's how to get started
    // - For rejected: Explain reason and next steps

    return NextResponse.json({
      success: true,
      action,
      verificationId,
      status: newStatus,
      message:
        action === 'approve'
          ? 'Bar verification approved. User has been granted advertiser access.'
          : 'Bar verification rejected.',
    })
  } catch (error) {
    console.error('Bar verification approval error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
