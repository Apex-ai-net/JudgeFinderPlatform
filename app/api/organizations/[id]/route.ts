import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import type { UpdateOrganizationRequest } from '@/types/organizations'

export const dynamic = 'force-dynamic'

/**
 * GET /api/organizations/[id]
 *
 * Get organization details including user's membership info
 *
 * Returns:
 * - 200: Organization details
 * - 401: Unauthorized
 * - 403: Forbidden (not a member)
 * - 404: Organization not found
 * - 500: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = await createClient()

    // Check if user is a member
    const { data: isMember } = await supabase.rpc('is_organization_member', {
      org_id: id,
      clerk_user_id: userId,
    })

    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Get user's role in this organization
    const { data: userRole } = await supabase.rpc('get_organization_role', {
      org_id: id,
      clerk_user_id: userId,
    })

    // Get member count
    const { data: memberCount } = await supabase.rpc('get_organization_member_count', {
      org_id: id,
    })

    return NextResponse.json({
      organization: org,
      user_role: userRole,
      member_count: memberCount,
    })
  } catch (error) {
    console.error('Organization GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/organizations/[id]
 *
 * Update organization details
 * Requires owner or admin role
 *
 * Request Body:
 * - name: string (optional) - Organization name
 * - contact_email: string (optional) - Contact email
 * - contact_phone: string (optional) - Contact phone
 * - website: string (optional) - Website URL
 * - logo_url: string (optional) - Logo URL
 * - description: string (optional) - Description
 * - specializations: string[] (optional) - Practice areas
 * - settings: object (optional) - Organization settings
 *
 * Returns:
 * - 200: Updated organization
 * - 401: Unauthorized
 * - 403: Forbidden (insufficient permissions)
 * - 404: Organization not found
 * - 500: Internal server error
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body: UpdateOrganizationRequest = await request.json()

    const supabase = await createClient()

    // Check if user can manage organization
    const { data: canManage } = await supabase.rpc('can_manage_organization', {
      org_id: id,
      clerk_user_id: userId,
    })

    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build update object (only include provided fields)
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.contact_email !== undefined) updateData.contact_email = body.contact_email
    if (body.contact_phone !== undefined) updateData.contact_phone = body.contact_phone
    if (body.website !== undefined) updateData.website = body.website
    if (body.logo_url !== undefined) updateData.logo_url = body.logo_url
    if (body.description !== undefined) updateData.description = body.description
    if (body.specializations !== undefined) updateData.specializations = body.specializations

    // Merge settings if provided
    if (body.settings !== undefined) {
      const { data: currentOrg } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', id)
        .single()

      if (currentOrg) {
        updateData.settings = {
          ...currentOrg.settings,
          ...body.settings,
        }
      }
    }

    // Update organization
    const { data: org, error: updateError } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update organization:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_organization_activity', {
      org_id: id,
      clerk_user_id: userId,
      evt_type: 'organization.updated',
      evt_category: 'settings',
      evt_data: {
        fields_updated: Object.keys(updateData).filter(k => k !== 'updated_at'),
      },
    })

    return NextResponse.json({ organization: org })
  } catch (error) {
    console.error('Organization PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/organizations/[id]
 *
 * Soft delete an organization
 * Requires owner role
 * Cancels active Stripe subscription
 *
 * Returns:
 * - 200: Organization deleted
 * - 401: Unauthorized
 * - 403: Forbidden (must be owner)
 * - 404: Organization not found
 * - 500: Internal server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = await createClient()

    // Check if user is the owner
    const { data: isOwner } = await supabase.rpc('has_organization_role', {
      org_id: id,
      clerk_user_id: userId,
      required_role: 'owner',
    })

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden. Only the owner can delete the organization.' },
        { status: 403 }
      )
    }

    // Get organization to check for active subscription
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_subscription_id')
      .eq('id', id)
      .single()

    // Cancel Stripe subscription if exists
    if (org?.stripe_subscription_id) {
      try {
        const { cancelSubscription } = await import('@/lib/stripe/organization-billing')
        await cancelSubscription({
          subscriptionId: org.stripe_subscription_id,
          cancelAtPeriodEnd: false, // Cancel immediately
          reason: 'Organization deleted',
        })
      } catch (error) {
        console.error('Failed to cancel Stripe subscription:', error)
        // Continue with deletion even if Stripe cancellation fails
      }
    }

    // Soft delete organization
    const { error: deleteError } = await supabase
      .from('organizations')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (deleteError) {
      console.error('Failed to delete organization:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_organization_activity', {
      org_id: id,
      clerk_user_id: userId,
      evt_type: 'organization.deleted',
      evt_category: 'settings',
      evt_data: {
        deleted_by: userId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Organization DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
