# JudgeFinder Security Improvements

## Overview

This document describes the critical security improvements implemented to enhance the JudgeFinder platform's database security through proper Row Level Security (RLS) implementation and service account architecture.

## Problem Statement

Previously, the platform over-relied on the Supabase service role key, which:

- Bypasses all Row Level Security (RLS) policies
- Creates potential security vulnerabilities
- Makes audit logging difficult
- Violates principle of least privilege

Several critical tables lacked RLS policies entirely, exposing sensitive data.

## Solution Architecture

### 1. Service Account RBAC (Migration 20251009_001)

**File:** `supabase/migrations/20251009_001_service_account_rbac.sql`

**What it does:**

- Creates a dedicated backend service user in `auth.users` with ID `00000000-0000-0000-0000-000000000001`
- Adds `is_service_account` column to `app_users` for tracking service accounts
- Implements helper functions for permission checks:
  - `is_service_account()` - Checks if current user is a service account
  - `is_admin()` - Checks if current user is an admin
  - `current_user_id()` - Returns current user's Clerk ID
  - `is_service_role()` - Checks if session uses service_role key
- Creates `service_account_audit` table for tracking backend operations
- Provides `log_service_account_activity()` function for audit logging

**Key Benefits:**

- Backend operations use authenticated context instead of bypassing security
- All service account operations can be audited
- Enables gradual migration away from service_role dependency

### 2. Complete RLS Coverage (Migration 20251009_002)

**File:** `supabase/migrations/20251009_002_complete_rls_coverage.sql`

**What it does:**

- Enables RLS on previously unprotected tables:
  - `judge_court_positions`
  - `sync_queue`
  - `profile_issues`
  - `ad_waitlist`
  - `ad_events`
  - `user_push_tokens`
- Creates appropriate policies for each table based on access patterns:
  - **Public read, service/admin write:** `judge_court_positions`, `performance_metrics`
  - **Service/admin only:** `sync_queue`, `sync_logs`
  - **Users manage own:** `user_push_tokens`, `ad_spots`
  - **Mixed access:** `ad_waitlist`, `profile_issues`

**Access Patterns:**

| Table                 | Anonymous | Authenticated | Owner | Admin | Service |
| --------------------- | --------- | ------------- | ----- | ----- | ------- |
| judges                | Read      | Read          | -     | All   | All     |
| courts                | Read      | Read          | -     | All   | All     |
| cases                 | Read      | Read          | -     | All   | All     |
| judge_court_positions | Read      | Read          | -     | All   | All     |
| sync_queue            | -         | -             | -     | All   | All     |
| sync_logs             | -         | -             | -     | Read  | All     |
| profile_issues        | -         | -             | Read  | All   | All     |
| ad_waitlist           | -         | Insert        | Read  | All   | All     |
| ad_spots              | Read      | Read          | CRUD  | All   | All     |
| ad_events             | Insert    | Insert        | Read  | Read  | All     |
| user_push_tokens      | -         | -             | CRUD  | Read  | All     |
| app_users             | -         | -             | Read  | All   | All     |

### 3. RLS Policy Standardization (Migration 20251009_003)

**File:** `supabase/migrations/20251009_003_standardize_rls_policies.sql`

**What it does:**

- Drops all existing policies to eliminate conflicts
- Recreates policies with consistent naming convention: `{table}_{role}_{operation}`
- Ensures every table has service role bypass
- Creates `verify_service_role_bypass()` function for validation

**Policy Naming Convention:**

```
{table}_{role}_{operation}

Examples:
- judges_service_all
- judges_admin_all
- judges_public_select
- ad_spots_user_update
```

**Hierarchy:**

1. Service role (bypasses all RLS)
2. Service account (authenticated admin-level access)
3. Admin users (platform administrators)
4. Regular users (authenticated users)
5. Public (anonymous access)

## Implementation Guide

### Step 1: Environment Configuration

Add the following to your `.env.local` (or production environment):

```bash
# Supabase JWT Secret (required for service account)
# Get from: https://app.supabase.com/project/_/settings/api
SUPABASE_JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters-long

# Encryption key (required in production)
# Generate with: openssl rand -base64 32
ENCRYPTION_KEY=your-random-32-char-encryption-key-here
```

**How to find SUPABASE_JWT_SECRET:**

1. Go to https://app.supabase.com
2. Select your project
3. Go to Settings → API
4. Scroll down to "JWT Secret"
5. Copy the value

### Step 2: Apply Migrations

```bash
# Run migrations in order
npx supabase db push

# Or apply manually via Supabase dashboard:
# 1. Copy contents of 20251009_001_service_account_rbac.sql
# 2. Run in SQL Editor
# 3. Repeat for 002 and 003
```

### Step 3: Update Application Code

Replace service role usage with service account client:

**Before:**

```typescript
import { createServiceRoleClient } from '@/lib/supabase/server'

const supabase = await createServiceRoleClient()
const { data } = await supabase.from('judges').select('*')
```

**After:**

```typescript
import { createServiceAccountClient } from '@/lib/supabase/service-account'

const supabase = await createServiceAccountClient()
const { data } = await supabase.from('judges').select('*')
```

**With Audit Logging:**

```typescript
import { withServiceAccount } from '@/lib/supabase/service-account'

const judges = await withServiceAccount(
  'sync_judge_data',
  async (client) => {
    const { data, error } = await client.from('judges').upsert(judgeData)

    if (error) throw error
    return data
  },
  'judges',
  null,
  { source: 'courtlistener', count: judgeData.length }
)
```

### Step 4: Validate RLS Policies

Run the testing script to verify all policies work correctly:

```bash
npx tsx scripts/test-rls-policies.ts
```

This will test:

- ✓ All tables have RLS enabled
- ✓ Service role bypass exists on all tables
- ✓ Public read access works for appropriate tables
- ✓ Public write is blocked
- ✓ Service account can access tables
- ✓ Admin-only tables are protected
- ✓ Helper functions exist

## Migration Checklist

- [ ] Set `SUPABASE_JWT_SECRET` in environment
- [ ] Set `ENCRYPTION_KEY` in production environment
- [ ] Apply migration 20251009_001_service_account_rbac.sql
- [ ] Apply migration 20251009_002_complete_rls_coverage.sql
- [ ] Apply migration 20251009_003_standardize_rls_policies.sql
- [ ] Run `npx tsx scripts/test-rls-policies.ts` to validate
- [ ] Update application code to use service account client
- [ ] Test critical user flows
- [ ] Monitor `service_account_audit` table for backend operations
- [ ] Gradually phase out service_role usage

## When to Use Each Client

### Service Account Client

**Use for:** 95% of backend operations

```typescript
import { createServiceAccountClient } from '@/lib/supabase/service-account'
```

**Use cases:**

- API routes
- Cron jobs
- Background processing
- Data synchronization
- Admin operations

**Benefits:**

- Respects RLS policies
- Can be audited
- Follows principle of least privilege
- Safer for production

### Service Role Client

**Use for:** Emergency/system operations only

```typescript
import { createServiceRoleClient } from '@/lib/supabase/server'
```

**Use cases:**

- Database migrations
- Emergency admin operations
- System maintenance
- Operations that explicitly need to bypass RLS

**Risks:**

- Bypasses all security
- No RLS protection
- Difficult to audit
- Should be used sparingly

### Regular Client (with Clerk Auth)

**Use for:** User-facing operations

```typescript
import { createClerkSupabaseServerClient } from '@/lib/supabase/server'
```

**Use cases:**

- User profile operations
- User-specific queries
- Operations in user context

## Monitoring & Auditing

### Service Account Audit Logs

Query the `service_account_audit` table to see backend operations:

```sql
-- Recent service account activity
SELECT
  action,
  resource_type,
  resource_id,
  success,
  created_at
FROM service_account_audit
ORDER BY created_at DESC
LIMIT 100;

-- Failed operations
SELECT *
FROM service_account_audit
WHERE success = false
ORDER BY created_at DESC;

-- Operations by resource type
SELECT
  resource_type,
  COUNT(*) as operation_count,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed
FROM service_account_audit
GROUP BY resource_type;
```

### Verify Policy Coverage

```sql
-- Check which tables have RLS enabled
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verify service role bypass exists
SELECT * FROM verify_service_role_bypass();

-- List all policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## Troubleshooting

### "Missing SUPABASE_JWT_SECRET" Error

**Problem:** Service account client cannot generate JWT tokens.

**Solution:**

1. Get JWT secret from Supabase dashboard (Settings → API → JWT Secret)
2. Add to environment: `SUPABASE_JWT_SECRET=your-secret-here`
3. Restart application

### "Permission denied for table" Error

**Problem:** RLS policy blocking legitimate access.

**Solution:**

1. Check if user has appropriate role (service account, admin, etc.)
2. Verify policy exists: `SELECT * FROM pg_policies WHERE tablename = 'your_table';`
3. Test with service role client to confirm data exists
4. Review policy `USING` and `WITH CHECK` clauses

### Service Account Not Working

**Problem:** `is_service_account()` returns false.

**Solution:**

1. Verify migration 20251009_001 was applied
2. Check service account user exists: `SELECT * FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001';`
3. Verify `app_users` record: `SELECT * FROM app_users WHERE is_service_account = true;`
4. Check JWT token is being generated correctly

### RLS Tests Failing

**Problem:** `npx tsx scripts/test-rls-policies.ts` shows failures.

**Solution:**

1. Apply all three migrations in order
2. Check error messages in test output
3. Verify environment variables are set
4. Check Supabase logs for policy errors

## Security Best Practices

1. **Never commit secrets:** Keep `.env.local` out of version control
2. **Rotate keys regularly:** Change `ENCRYPTION_KEY` and `SUPABASE_JWT_SECRET` periodically
3. **Monitor audit logs:** Review `service_account_audit` regularly
4. **Use service account:** Prefer service account over service_role
5. **Test policies:** Run RLS tests after any policy changes
6. **Principle of least privilege:** Only grant necessary permissions
7. **Review access patterns:** Periodically audit who can access what

## References

- **Supabase RLS Documentation:** https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL RLS Documentation:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **Service Account Pattern:** https://supabase.com/docs/guides/auth/server-side/creating-a-service-role-client

## Support

For issues or questions:

1. Check this documentation
2. Run `npx tsx scripts/test-rls-policies.ts` for diagnostics
3. Review Supabase logs in dashboard
4. Check `service_account_audit` table for errors
5. Contact platform team

---

**Last Updated:** 2025-10-09
**Migration Version:** 20251009_003
**Status:** Production Ready
