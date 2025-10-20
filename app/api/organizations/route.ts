import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateStripeCustomer } from '@/lib/stripe/organization-billing'
import type { CreateOrganizationRequest } from '@/types/organizations'
import { DEFAULT_ORGANIZATION_SETTINGS, OWNER_PERMISSIONS } from '@/types/organizations'

export const dynamic = 'force-dynamic'

/**
 * GET /api/organizations
 *
 * List all organizations the current user is a member of
 *
 * Query Parameters:
 * - include_members: boolean - Include member count
 *
 * Returns:
 * - 200: Array of organizations
 * - 401: Unauthorized
 * - 500: Internal server error
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const includeMembers = searchParams.get('include_members') === 'true'

    const supabase = await createClient()

    // Get organizations where user is a member
    const query = supabase
      .from('organization_members')
      .select(`
        organization_id,
        role,
        joined_at,
        organization:organizations!inner(
          id,
          name,
          slug,
          organization_type,
          subscription_tier,
          logo_url,
          status,
          created_at,
          max_members,
          ${includeMembers ? '(SELECT COUNT(*) FROM organization_members WHERE organization_id = organizations.id) as member_count' : ''}
        )
      `)
      .eq('user_id', userId)
      .is('organization.deleted_at', null)
      .order('joined_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch organizations:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform data to return organizations with user's membership info
    const organizations = data.map((item: any) => ({
      ...item.organization,
      user_role: item.role,
      user_joined_at: item.joined_at,
    }))

    return NextResponse.json({ organizations })
  } catch (error) {
    console.error('Organizations GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/organizations
 *
 * Create a new organization
 *
 * Request Body:
 * - name: string (required) - Organization name
 * - slug: string (required) - URL-friendly identifier
 * - contact_email: string (required) - Primary contact email
 * - organization_type: string (optional) - Type of organization
 * - contact_phone: string (optional) - Contact phone
 * - website: string (optional) - Website URL
 * - description: string (optional) - Description
 * - specializations: string[] (optional) - Practice areas
 *
 * Returns:
 * - 201: Created organization
 * - 400: Bad request (validation errors)
 * - 401: Unauthorized
 * - 500: Internal server error
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateOrganizationRequest = await request.json()

    // Validate required fields
    if (!body.name || !body.slug || !body.contact_email) {
      return NextResponse.json(
        { error: 'Missing required fields: name, slug, contact_email' },
        { status: 400 }
      )
    }

    // Validate slug format (alphanumeric and hyphens only)
    if (!/^[a-z0-9-]+$/.test(body.slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if slug is already taken
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', body.slug)
      .is('deleted_at', null)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Slug is already taken' },
        { status: 400 }
      )
    }

    // Create Stripe customer for the organization
    let stripeCustomerId: string | null = null
    try {
      stripeCustomerId = await getOrCreateStripeCustomer({
        organizationId: 'pending', // Will be updated after org creation
        organizationName: body.name,
        billingEmail: body.contact_email,
        metadata: {
          created_by: userId,
        },
      })
    } catch (error) {
      console.error('Failed to create Stripe customer:', error)
      // Continue without Stripe customer - can be added later
    }

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: body.name,
        slug: body.slug,
        owner_id: userId,
        organization_type: body.organization_type || 'law_firm',
        contact_email: body.contact_email,
        contact_phone: body.contact_phone,
        website: body.website,
        description: body.description,
        specializations: body.specializations,
        stripe_customer_id: stripeCustomerId,
        billing_email: body.contact_email,
        settings: DEFAULT_ORGANIZATION_SETTINGS,
        subscription_tier: 'free',
        max_members: 5, // Free tier default
        status: 'active',
        verification_status: 'unverified',
      })
      .select()
      .single()

    if (orgError) {
      console.error('Failed to create organization:', orgError)
      return NextResponse.json({ error: orgError.message }, { status: 400 })
    }

    // Update Stripe customer with organization ID
    if (stripeCustomerId) {
      try {
        await getOrCreateStripeCustomer({
          organizationId: org.id,
          organizationName: body.name,
          billingEmail: body.contact_email,
        })
      } catch (error) {
        console.error('Failed to update Stripe customer:', error)
      }
    }

    // Add creator as owner member
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: userId,
        role: 'owner',
        permissions: OWNER_PERMISSIONS,
        joined_at: new Date().toISOString(),
      })

    if (memberError) {
      console.error('Failed to create owner membership:', memberError)
      // Rollback organization creation
      await supabase
        .from('organizations')
        .delete()
        .eq('id', org.id)

      return NextResponse.json(
        { error: 'Failed to create organization membership' },
        { status: 500 }
      )
    }

    // Log activity
    await supabase.rpc('log_organization_activity', {
      org_id: org.id,
      clerk_user_id: userId,
      evt_type: 'organization.created',
      evt_category: 'settings',
      evt_data: {
        organization_name: org.name,
        organization_slug: org.slug,
      },
    })

    return NextResponse.json({ organization: org }, { status: 201 })
  } catch (error) {
    console.error('Organizations POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
