# Multi-Tenant Organizations Schema Documentation

## Overview

This document describes the comprehensive multi-tenant organization/workspace management system for JudgeFinder.io. The system supports law firms, legal services organizations, and individual practitioners managing their advertising campaigns through workspace-based collaboration.

## Schema Architecture

### Core Tables

#### 1. `organizations`
Primary tenant entity representing law firms or workspaces.

**Key Features:**
- URL-friendly slugs for organization identification
- Flexible subscription tiers (free, professional, enterprise)
- Seat-based member limits
- JSONB settings for extensibility
- Soft delete support
- Integration with Stripe for billing

**Important Fields:**
```sql
- id: UUID primary key
- name: Organization display name
- slug: URL-friendly identifier (unique, lowercase, alphanumeric + hyphens)
- owner_id: Clerk user ID of the organization owner
- subscription_tier: free | professional | enterprise
- max_members: Seat limit (default: 5)
- settings: JSONB for feature flags, notifications, branding
- status: active | suspended | inactive | pending
```

#### 2. `organization_members`
Junction table managing users within organizations.

**Key Features:**
- Role-based access control (RBAC)
- Granular permissions via JSONB
- Invitation tracking
- Activity timestamps

**Roles:**
- `owner`: Full control, cannot be removed, one per organization
- `admin`: Can manage members, campaigns, and settings
- `member`: Can create/edit campaigns, view analytics
- `viewer`: Read-only access
- `billing`: Can manage billing and view invoices

**Permission Structure:**
```json
{
  "advertising": {
    "create_campaigns": true,
    "edit_campaigns": true,
    "delete_campaigns": false,
    "view_analytics": true,
    "manage_billing": false
  },
  "organization": {
    "invite_members": false,
    "remove_members": false,
    "edit_settings": false,
    "view_billing": false
  },
  "admin": {
    "manage_roles": false,
    "full_access": false
  }
}
```

#### 3. `organization_invitations`
Manages pending invitations to join organizations.

**Key Features:**
- Token-based invitation system
- Automatic expiration (7 days default)
- Status tracking (pending, accepted, declined, expired, revoked)
- Support for invitation messages

**Security:**
- Unique token for each invitation
- Hashed token stored for validation
- Automatic expiration enforcement

#### 4. `organization_activity_log`
Audit trail for organization events.

**Event Categories:**
- `auth`: Authentication/authorization events
- `members`: Member management (invited, joined, removed)
- `billing`: Subscription changes, payments
- `settings`: Organization settings updates
- `advertising`: Campaign management events
- `security`: Security-related events

## Helper Functions

### Permission Checking

```sql
-- Check if user is a member
SELECT is_organization_member(
  'org-uuid',
  'clerk_user_id'
);

-- Check if user has specific role
SELECT has_organization_role(
  'org-uuid',
  'clerk_user_id',
  'admin'
);

-- Get user's role
SELECT get_organization_role(
  'org-uuid',
  'clerk_user_id'
);

-- Check if user can manage organization
SELECT can_manage_organization(
  'org-uuid',
  'clerk_user_id'
);
```

### Organization Management

```sql
-- Check member count
SELECT get_organization_member_count('org-uuid');

-- Check if at member limit
SELECT is_at_member_limit('org-uuid');

-- Log activity
SELECT log_organization_activity(
  'org-uuid',
  'clerk_user_id',
  'member.invited',
  'members',
  '{"email": "new@member.com"}'::jsonb
);

-- Expire old invitations
SELECT expire_old_invitations();
```

## Row Level Security (RLS) Policies

### Organizations
- **SELECT**: Users can view organizations they own or are members of
- **UPDATE**: Owners and admins can update organization details
- **INSERT**: Authenticated users can create new organizations
- **DELETE**: Only owners can delete (soft delete) organizations

### Organization Members
- **SELECT**: Users can view members of their organizations
- **INSERT**: Admins can add members (if under seat limit)
- **UPDATE**: Admins can modify member roles and permissions
- **DELETE**: Admins can remove members (except owner); members can remove themselves

### Organization Invitations
- **SELECT**: Members can view invitations for their organizations
- **INSERT**: Admins can create invitations (if under seat limit)
- **UPDATE**: Admins can update/revoke invitations
- **ACCEPT**: Handled via service function with token validation

### Organization Activity Log
- **SELECT**: Members can view activity for their organizations
- **INSERT**: Handled via service role (application code)

## Migration Strategy

### Phase 1: Schema Deployment
1. Deploy the migration file: `20251018_010_multi_tenant_organizations.sql`
2. Verify all tables, indexes, and functions are created
3. Test RLS policies with sample data

### Phase 2: Data Migration
Execute the migration function to convert existing advertiser profiles:

```sql
-- Run migration (returns statistics)
SELECT * FROM migrate_advertiser_profiles_to_organizations();

-- Verify migration results
SELECT
  COUNT(*) as total_orgs,
  COUNT(DISTINCT owner_id) as unique_owners,
  AVG(get_organization_member_count(id)) as avg_members
FROM organizations;
```

### Phase 3: Application Integration
1. Update TypeScript types
2. Create organization context/hooks
3. Implement organization switcher UI
4. Update API routes to use organization context
5. Migrate advertiser dashboard to organization dashboard

### Phase 4: Backward Compatibility
The `advertiser_profiles` table retains an `organization_id` column for backward compatibility:
- Existing queries continue to work
- Gradual migration to organization-based queries
- Can be deprecated after full migration

## Usage Examples

### Creating an Organization

```typescript
import { createClient } from '@/lib/supabase/client';

async function createOrganization(data: {
  name: string;
  slug: string;
  owner_id: string;
  contact_email: string;
}) {
  const supabase = createClient();

  const { data: org, error } = await supabase
    .from('organizations')
    .insert({
      name: data.name,
      slug: data.slug,
      owner_id: data.owner_id,
      contact_email: data.contact_email,
    })
    .select()
    .single();

  if (error) throw error;

  // Auto-create owner membership
  await supabase
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: data.owner_id,
      role: 'owner',
    });

  return org;
}
```

### Inviting a Member

```typescript
import { createClient } from '@/lib/supabase/client';
import { randomBytes } from 'crypto';

async function inviteMember(
  organizationId: string,
  email: string,
  role: 'admin' | 'member' | 'viewer',
  invitedBy: string
) {
  const supabase = createClient();

  // Generate secure token
  const token = randomBytes(32).toString('hex');
  const tokenHash = await hashToken(token); // Implement hashing

  const { data, error } = await supabase
    .from('organization_invitations')
    .insert({
      organization_id: organizationId,
      email,
      role,
      invited_by: invitedBy,
      token,
      token_hash: tokenHash,
    })
    .select()
    .single();

  if (error) throw error;

  // Send invitation email with token
  await sendInvitationEmail(email, token);

  return data;
}
```

### Accepting an Invitation

```typescript
async function acceptInvitation(token: string, userId: string) {
  const supabase = createClient();

  // Find invitation by token
  const { data: invitation } = await supabase
    .from('organization_invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!invitation) {
    throw new Error('Invalid or expired invitation');
  }

  // Add user as member
  await supabase
    .from('organization_members')
    .insert({
      organization_id: invitation.organization_id,
      user_id: userId,
      role: invitation.role,
      invited_by: invitation.invited_by,
      invitation_accepted_at: new Date().toISOString(),
    });

  // Mark invitation as accepted
  await supabase
    .from('organization_invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_by: userId,
    })
    .eq('id', invitation.id);
}
```

### Checking Permissions

```typescript
async function checkPermission(
  organizationId: string,
  userId: string,
  requiredRole: 'owner' | 'admin'
) {
  const supabase = createClient();

  const { data } = await supabase
    .rpc('can_manage_organization', {
      org_id: organizationId,
      clerk_user_id: userId,
    });

  return data === true;
}
```

## Subscription Tier Limits

| Tier | Max Members | Features |
|------|-------------|----------|
| Free | 5 | Basic advertising, analytics |
| Professional | 25 | Advanced analytics, API access, priority support |
| Enterprise | 1000 | Custom features, dedicated support, SSO |

## Best Practices

### 1. Always Check Seat Limits
Before inviting members, verify the organization hasn't reached its limit:

```typescript
const { data: atLimit } = await supabase.rpc(
  'is_at_member_limit',
  { org_id: organizationId }
);

if (atLimit) {
  throw new Error('Organization has reached member limit');
}
```

### 2. Log Important Events
Use the activity log for compliance and debugging:

```typescript
await supabase.rpc('log_organization_activity', {
  org_id: organizationId,
  clerk_user_id: userId,
  evt_type: 'settings.updated',
  evt_category: 'settings',
  evt_data: { changed_fields: ['name', 'logo'] }
});
```

### 3. Handle Invitation Expiration
Run periodic cleanup of expired invitations:

```typescript
// In a cron job or scheduled function
const { data: expiredCount } = await supabase.rpc(
  'expire_old_invitations'
);

console.log(`Expired ${expiredCount} old invitations`);
```

### 4. Soft Delete Organizations
Never hard delete organizations; use soft delete:

```typescript
await supabase
  .from('organizations')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', organizationId);
```

## Security Considerations

1. **Token Security**: Invitation tokens should be cryptographically random and hashed
2. **RLS Enforcement**: Always rely on RLS policies, not application logic
3. **Role Validation**: Verify user roles before performing sensitive operations
4. **Audit Logging**: Log all member changes and permission updates
5. **Expiration**: Ensure invitations expire and are cleaned up regularly

## Performance Optimization

### Indexes
All critical queries are indexed:
- Organization lookups by slug and owner
- Member queries by user and organization
- Invitation lookups by token and email
- Activity log queries by organization and time

### Caching Strategies
Consider caching:
- User's organization memberships
- Organization settings and metadata
- Permission checks for frequently accessed resources

## Future Enhancements

1. **SSO Integration**: Enterprise SAML/OAuth support
2. **Custom Roles**: Allow organizations to define custom roles
3. **Organization Templates**: Pre-configured settings for different firm types
4. **Workspace Switching**: Quick switcher for users in multiple organizations
5. **Organization Analytics**: Usage metrics and billing insights
6. **API Keys**: Organization-scoped API access

## Related Files

- Migration: `/supabase/migrations/20251018_010_multi_tenant_organizations.sql`
- Implementation Guide: `/docs/ORGANIZATIONS_IMPLEMENTATION.md`
- API Reference: `/docs/api/ORGANIZATIONS_API.md`
- TypeScript Types: `/types/organizations.ts` (to be created)

## Support

For questions or issues with the organization schema:
1. Review this documentation
2. Check RLS policy configurations
3. Verify Clerk user ID mapping in `app_users`
4. Test with sample data before production deployment
