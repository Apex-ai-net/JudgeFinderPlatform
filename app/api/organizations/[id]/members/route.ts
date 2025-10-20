import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import type { OrganizationRole, MemberPermissions } from '@/types/organizations'
import {
  OWNER_PERMISSIONS,
  ADMIN_PERMISSIONS,
  MEMBER_PERMISSIONS,
  VIEWER_PERMISSIONS,
  BILLING_PERMISSIONS,
} from '@/types/organizations'

export const dynamic = 'force-dynamic'

/**
 * GET /api/organizations/[id]/members
 *
 * List all members of an organization
 * Requires membership in the organization
 *
 * Returns:
 * - 200: Array of members with user details
 * - 401: Unauthorized
 * - 403: Forbidden (not a member)
 * - 500: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Check if user is a member
    const { data: isMember } = await supabase.rpc('is_organization_member', {
      org_id: id,
      clerk_user_id: userId,
    })

    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get members with user details from app_users
    const { data: members, error } = await supabase
      .from('organization_members')
      .select(`
        id,
        user_id,
        role,
        permissions,
        joined_at,
        last_active_at,
        invited_by,
        user:app_users!inner(clerk_user_id, email, full_name)
      `)
      .eq('organization_id', id)
      .order('joined_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch members:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ members })
  } catch (error) {
    console.error('Members GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/organizations/[id]/members
 *
 * Add a new member to the organization (direct add, not invitation)
 * Requires admin or owner role
 *
 * Request Body:
 * - user_id: string (required) - Clerk user ID to add
 * - role: string (required) - Role to assign (admin, member, viewer, billing)
 *
 * Returns:
 * - 201: Created member
 * - 400: Bad request (at seat limit, invalid role, etc.)
 * - 401: Unauthorized
 * - 403: Forbidden (insufficient permissions)
 * - 500: Internal server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: { user_id: string; role: OrganizationRole } = await request.json()

    // Validate required fields
    if (!body.user_id || !body.role) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, role' },
        { status: 400 }
      )
    }

    // Validate role (cannot directly add as owner)
    if (body.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot directly add a member as owner' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if user can manage organization
    const { data: canManage } = await supabase.rpc('can_manage_organization', {
      org_id: id,
      clerk_user_id: userId,
    })

    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check member limit
    const { data: atLimit } = await supabase.rpc('is_at_member_limit', {
      org_id: id,
    })

    if (atLimit) {
      return NextResponse.json(
        { error: 'Organization has reached member limit. Upgrade your plan to add more members.' },
        { status: 400 }
      )
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', id)
      .eq('user_id', body.user_id)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 400 }
      )
    }

    // Get default permissions for role
    const permissions: MemberPermissions =
      body.role === 'admin'
        ? ADMIN_PERMISSIONS
        : body.role === 'billing'
          ? BILLING_PERMISSIONS
          : body.role === 'viewer'
            ? VIEWER_PERMISSIONS
            : MEMBER_PERMISSIONS

    // Add member
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: id,
        user_id: body.user_id,
        role: body.role,
        permissions,
        invited_by: userId,
        joined_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (memberError) {
      console.error('Failed to add member:', memberError)
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_organization_activity', {
      org_id: id,
      clerk_user_id: userId,
      evt_type: 'member.added',
      evt_category: 'members',
      evt_data: {
        member_user_id: body.user_id,
        role: body.role,
      },
    })

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    console.error('Members POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/organizations/[id]/members
 *
 * Update a member's role or permissions
 * Requires admin or owner role
 *
 * Query Parameters:
 * - member_id: string (required) - Member ID to update
 *
 * Request Body:
 * - role: string (optional) - New role
 * - permissions: object (optional) - Custom permissions
 *
 * Returns:
 * - 200: Updated member
 * - 400: Bad request
 * - 401: Unauthorized
 * - 403: Forbidden (insufficient permissions)
 * - 500: Internal server error
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const memberId = searchParams.get('member_id')

    if (!memberId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: member_id' },
        { status: 400 }
      )
    }

    const body: { role?: OrganizationRole; permissions?: Partial<MemberPermissions> } =
      await request.json()

    const supabase = await createClient()

    // Check if user can manage organization
    const { data: canManage } = await supabase.rpc('can_manage_organization', {
      org_id: id,
      clerk_user_id: userId,
    })

    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get current member info
    const { data: currentMember } = await supabase
      .from('organization_members')
      .select('*')
      .eq('id', memberId)
      .eq('organization_id', id)
      .single()

    if (!currentMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Cannot change owner role
    if (currentMember.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot change owner role' },
        { status: 400 }
      )
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (body.role) {
      if (body.role === 'owner') {
        return NextResponse.json(
          { error: 'Cannot promote member to owner' },
          { status: 400 }
        )
      }
      updateData.role = body.role
    }

    if (body.permissions) {
      updateData.permissions = {
        ...currentMember.permissions,
        ...body.permissions,
      }
    }

    // Update member
    const { data: member, error: updateError } = await supabase
      .from('organization_members')
      .update(updateData)
      .eq('id', memberId)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update member:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_organization_activity', {
      org_id: id,
      clerk_user_id: userId,
      evt_type: 'member.updated',
      evt_category: 'members',
      evt_data: {
        member_user_id: currentMember.user_id,
        changes: updateData,
      },
    })

    return NextResponse.json({ member })
  } catch (error) {
    console.error('Members PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/organizations/[id]/members
 *
 * Remove a member from the organization
 * Requires admin or owner role
 * Cannot remove the owner
 * Members can remove themselves
 *
 * Query Parameters:
 * - member_id: string (required) - Member ID to remove
 *
 * Returns:
 * - 200: Member removed
 * - 400: Bad request (trying to remove owner)
 * - 401: Unauthorized
 * - 403: Forbidden (insufficient permissions)
 * - 404: Member not found
 * - 500: Internal server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const memberId = searchParams.get('member_id')

    if (!memberId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: member_id' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get member info
    const { data: member } = await supabase
      .from('organization_members')
      .select('*')
      .eq('id', memberId)
      .eq('organization_id', id)
      .single()

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Cannot remove owner
    if (member.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot remove the organization owner' },
        { status: 400 }
      )
    }

    // Check if user is removing themselves or if they have permission
    const isSelf = member.user_id === userId

    if (!isSelf) {
      const { data: canManage } = await supabase.rpc('can_manage_organization', {
        org_id: id,
        clerk_user_id: userId,
      })

      if (!canManage) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Remove member
    const { error: deleteError } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId)

    if (deleteError) {
      console.error('Failed to remove member:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Log activity
    await supabase.rpc('log_organization_activity', {
      org_id: id,
      clerk_user_id: userId,
      evt_type: isSelf ? 'member.left' : 'member.removed',
      evt_category: 'members',
      evt_data: {
        member_user_id: member.user_id,
        removed_by: userId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Members DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
