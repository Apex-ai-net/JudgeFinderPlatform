# Organizations Implementation Guide

## Quick Start

This guide helps you implement the multi-tenant organization system in JudgeFinder.io.

## Pre-requisites

- Supabase database access
- Clerk authentication configured
- Understanding of Row Level Security (RLS)

## Step 1: Deploy the Schema

```bash
# Deploy the migration
supabase db push

# Or via SQL editor
psql $DATABASE_URL -f supabase/migrations/20251018_010_multi_tenant_organizations.sql
```

Verify tables were created:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE 'organization%';
```

Expected output:
- organizations
- organization_members
- organization_invitations
- organization_activity_log

## Step 2: Migrate Existing Data

Run the migration function to convert advertiser profiles to organizations:

```sql
-- Dry run: check what will be migrated
SELECT COUNT(*) as profiles_to_migrate
FROM advertiser_profiles
WHERE organization_id IS NULL;

-- Execute migration
SELECT * FROM migrate_advertiser_profiles_to_organizations();

-- Verify results
SELECT
  o.name,
  o.slug,
  (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id) as member_count
FROM organizations o
LIMIT 10;
```

## Step 3: Create API Routes

### Organization CRUD

Create `/app/api/organizations/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs';
import type { CreateOrganizationRequest } from '@/types/organizations';

// GET /api/organizations - List user's organizations
export async function GET(req: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organizations')
    .select(`
      *,
      members:organization_members!inner(
        id,
        role,
        joined_at
      )
    `)
    .eq('organization_members.user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ organizations: data });
}

// POST /api/organizations - Create new organization
export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: CreateOrganizationRequest = await req.json();
  const supabase = await createClient();

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
    })
    .select()
    .single();

  if (orgError) {
    return NextResponse.json({ error: orgError.message }, { status: 400 });
  }

  // Add owner as member
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: userId,
      role: 'owner',
    });

  if (memberError) {
    // Rollback organization creation
    await supabase.from('organizations').delete().eq('id', org.id);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ organization: org }, { status: 201 });
}
```

### Organization Members

Create `/app/api/organizations/[id]/members/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs';

// GET /api/organizations/:id/members
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  // Check if user is member
  const { data: isMember } = await supabase.rpc('is_organization_member', {
    org_id: params.id,
    clerk_user_id: userId,
  });

  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get members with user details
  const { data: members, error } = await supabase
    .from('organization_members')
    .select(`
      *,
      user:app_users!organization_members_user_id_fkey(
        clerk_user_id,
        email,
        full_name
      )
    `)
    .eq('organization_id', params.id)
    .order('joined_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ members });
}

// DELETE /api/organizations/:id/members/:memberId
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const memberId = req.nextUrl.searchParams.get('memberId');
  if (!memberId) {
    return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Check if user can manage members
  const { data: canManage } = await supabase.rpc('can_manage_organization', {
    org_id: params.id,
    clerk_user_id: userId,
  });

  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Remove member
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', memberId)
    .eq('organization_id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

### Invitations

Create `/app/api/organizations/[id]/invitations/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs';
import { randomBytes } from 'crypto';
import type { InviteMemberRequest } from '@/types/organizations';

// POST /api/organizations/:id/invitations
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: InviteMemberRequest = await req.json();
  const supabase = await createClient();

  // Check if user can manage members
  const { data: canManage } = await supabase.rpc('can_manage_organization', {
    org_id: params.id,
    clerk_user_id: userId,
  });

  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check member limit
  const { data: atLimit } = await supabase.rpc('is_at_member_limit', {
    org_id: params.id,
  });

  if (atLimit) {
    return NextResponse.json(
      { error: 'Organization has reached member limit' },
      { status: 400 }
    );
  }

  // Generate token
  const token = randomBytes(32).toString('hex');

  // Create invitation
  const { data: invitation, error } = await supabase
    .from('organization_invitations')
    .insert({
      organization_id: params.id,
      email: body.email,
      role: body.role,
      invited_by: userId,
      token,
      token_hash: token, // In production, hash this!
      invitation_message: body.invitation_message,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // TODO: Send invitation email
  // await sendInvitationEmail(body.email, token);

  return NextResponse.json({ invitation }, { status: 201 });
}
```

## Step 4: Create React Hooks

### useOrganization Hook

Create `/hooks/useOrganization.ts`:

```typescript
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import type { Organization, OrganizationMember } from '@/types/organizations';

export function useOrganization(organizationId?: string) {
  const { userId } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [member, setMember] = useState<OrganizationMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !organizationId) {
      setLoading(false);
      return;
    }

    async function fetchOrganization() {
      try {
        const response = await fetch(`/api/organizations/${organizationId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch organization');
        }

        const data = await response.json();
        setOrganization(data.organization);
        setMember(data.member);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchOrganization();
  }, [userId, organizationId]);

  return { organization, member, loading, error };
}
```

### useOrganizations Hook

Create `/hooks/useOrganizations.ts`:

```typescript
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import type { Organization } from '@/types/organizations';

export function useOrganizations() {
  const { userId } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function fetchOrganizations() {
      try {
        const response = await fetch('/api/organizations');
        if (!response.ok) {
          throw new Error('Failed to fetch organizations');
        }

        const data = await response.json();
        setOrganizations(data.organizations);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchOrganizations();
  }, [userId]);

  return { organizations, loading, error };
}
```

## Step 5: Create UI Components

### Organization Switcher

Create `/components/organizations/OrganizationSwitcher.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useOrganizations } from '@/hooks/useOrganizations';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

export function OrganizationSwitcher() {
  const { organizations, loading } = useOrganizations();
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(
    organizations[0]?.id ?? null
  );

  const currentOrg = organizations.find((org) => org.id === currentOrgId);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-64 justify-between">
          <span className="truncate">{currentOrg?.name ?? 'Select Organization'}</span>
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => setCurrentOrgId(org.id)}
          >
            {org.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Member List

Create `/components/organizations/MemberList.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import type { OrganizationMemberWithUser } from '@/types/organizations';
import { ROLE_DISPLAY_NAMES } from '@/types/organizations';

interface MemberListProps {
  organizationId: string;
}

export function MemberList({ organizationId }: MemberListProps) {
  const [members, setMembers] = useState<OrganizationMemberWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMembers() {
      const response = await fetch(`/api/organizations/${organizationId}/members`);
      const data = await response.json();
      setMembers(data.members);
      setLoading(false);
    }

    fetchMembers();
  }, [organizationId]);

  if (loading) {
    return <div>Loading members...</div>;
  }

  return (
    <div className="space-y-4">
      {members.map((member) => (
        <div key={member.id} className="flex items-center justify-between p-4 border rounded">
          <div>
            <div className="font-medium">{member.user.full_name || member.user.email}</div>
            <div className="text-sm text-gray-500">{member.user.email}</div>
          </div>
          <div className="text-sm text-gray-600">
            {ROLE_DISPLAY_NAMES[member.role]}
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Step 6: Update Advertising System

Update advertiser-related queries to use organizations:

```typescript
// Before: Filter by advertiser profile
const { data: campaigns } = await supabase
  .from('ad_campaigns')
  .select('*')
  .eq('advertiser_id', advertiserProfileId);

// After: Filter by organization
const { data: campaigns } = await supabase
  .from('ad_campaigns')
  .select('*')
  .eq('advertiser_id', (
    SELECT id FROM advertiser_profiles WHERE organization_id = organizationId
  ));
```

## Step 7: Set Up Scheduled Jobs

Create a cron job to expire old invitations:

```typescript
// In Vercel cron or Supabase Edge Function
export async function expireInvitations() {
  const supabase = createClient();

  const { data } = await supabase.rpc('expire_old_invitations');

  console.log(`Expired ${data} invitations`);
}
```

## Step 8: Testing

### Test Organization Creation

```typescript
// Create test organization
const response = await fetch('/api/organizations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Test Law Firm',
    slug: 'test-law-firm',
    contact_email: 'test@lawfirm.com',
  }),
});

const { organization } = await response.json();
console.log('Created organization:', organization);
```

### Test Member Invitation

```typescript
// Invite member
const response = await fetch(`/api/organizations/${orgId}/invitations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'newmember@lawfirm.com',
    role: 'member',
  }),
});

const { invitation } = await response.json();
console.log('Created invitation:', invitation);
```

## Common Patterns

### Check if User Can Perform Action

```typescript
async function checkPermission(organizationId: string, action: string) {
  const supabase = createClient();
  const { userId } = auth();

  const { data: canManage } = await supabase.rpc('can_manage_organization', {
    org_id: organizationId,
    clerk_user_id: userId,
  });

  return canManage;
}
```

### Log Activity

```typescript
async function logActivity(
  organizationId: string,
  eventType: string,
  eventData: Record<string, any>
) {
  const supabase = createClient();
  const { userId } = auth();

  await supabase.rpc('log_organization_activity', {
    org_id: organizationId,
    clerk_user_id: userId,
    evt_type: eventType,
    evt_category: 'members',
    evt_data: eventData,
  });
}
```

## Troubleshooting

### RLS Policy Errors

If you get "permission denied" errors:

1. Verify user is authenticated
2. Check user is member of organization
3. Ensure `request.jwt.claims` is properly set
4. Test with service role client for debugging

### Invitation Not Working

1. Check invitation hasn't expired
2. Verify token is correct
3. Ensure organization isn't at member limit
4. Check invitation status is 'pending'

## Next Steps

1. Implement email notifications for invitations
2. Add organization analytics dashboard
3. Create organization settings page
4. Implement API key management
5. Add organization billing integration
6. Build organization activity feed

## Related Documentation

- [Schema Documentation](/docs/ORGANIZATIONS_SCHEMA.md)
- [TypeScript Types](/types/organizations.ts)
- [Migration File](/supabase/migrations/20251018_010_multi_tenant_organizations.sql)
