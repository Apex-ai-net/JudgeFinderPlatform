# Database Security Guide

## JudgeFinder Platform - RLS Best Practices

**Last Updated:** October 24, 2025
**Version:** 1.0

---

## Quick Reference

### Creating a New Table with RLS

```sql
-- 1. Create the table
CREATE TABLE IF NOT EXISTS my_new_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS IMMEDIATELY
ALTER TABLE my_new_table ENABLE ROW LEVEL SECURITY;

-- 3. Create policies (minimum 2: service role + specific access)

-- Service role bypass (ALWAYS include this)
CREATE POLICY "Service role full access to my_new_table" ON my_new_table
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Choose appropriate access pattern:
-- Option A: User manages own data
CREATE POLICY "Users manage own data" ON my_new_table
  FOR ALL TO authenticated
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- Option B: Public read, user writes
CREATE POLICY "Public can read my_new_table" ON my_new_table
  FOR SELECT USING (true);

CREATE POLICY "Users can create data" ON my_new_table
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_user_id());

-- Option C: Admin only
CREATE POLICY "Admins full access to my_new_table" ON my_new_table
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Add comments
COMMENT ON TABLE my_new_table IS 'Description of table purpose';
COMMENT ON POLICY "Service role full access to my_new_table" ON my_new_table IS
  'Service role bypass for backend operations';
```

---

## Policy Templates

### 1. User-Scoped Data (User Manages Own)

**Use For:** user profiles, bookmarks, search history, personal settings

```sql
-- Read own
CREATE POLICY "Users can read own {table}" ON public.{table}
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Create own
CREATE POLICY "Users can create {table}" ON public.{table}
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Update own
CREATE POLICY "Users can update own {table}" ON public.{table}
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Delete own
CREATE POLICY "Users can delete own {table}" ON public.{table}
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

### 2. Public Read, Restricted Write

**Use For:** judges, courts, cases, public data

```sql
-- Public read
CREATE POLICY "Public can read {table}" ON public.{table}
  FOR SELECT USING (true);

-- Admin write
CREATE POLICY "Admins can manage {table}" ON public.{table}
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Service role write (for backend sync)
CREATE POLICY "Service role can write {table}" ON public.{table}
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

### 3. Organization-Scoped Data

**Use For:** ad campaigns, organization resources, team data

```sql
-- Members can read organization data
CREATE POLICY "Org members can read {table}" ON public.{table}
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = public.current_user_id()
    ) OR public.is_admin()
  );

-- Members with permissions can write
CREATE POLICY "Org admins can manage {table}" ON public.{table}
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = public.current_user_id()
        AND role IN ('owner', 'admin')
    ) OR public.is_admin()
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = public.current_user_id()
        AND role IN ('owner', 'admin')
    ) OR public.is_admin()
  );
```

### 4. Admin/Service Only

**Use For:** sync queues, audit logs, internal operations

```sql
-- Service role only
CREATE POLICY "Service role full access to {table}" ON public.{table}
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Admins can read (for monitoring)
CREATE POLICY "Admins can read {table}" ON public.{table}
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Service accounts can write
CREATE POLICY "Service accounts can write {table}" ON public.{table}
  FOR ALL TO authenticated
  USING (
    auth.role() = 'service_role' OR
    public.is_service_account()
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    public.is_service_account()
  );
```

### 5. Public Insert, Restricted Read (Analytics)

**Use For:** ad impressions, analytics events, tracking

```sql
-- Anyone can insert (for tracking)
CREATE POLICY "Public can log {table} events" ON public.{table}
  FOR INSERT WITH CHECK (true);

-- Admins can read
CREATE POLICY "Admins can read {table}" ON public.{table}
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Owners can read own data
CREATE POLICY "Owners can read own {table}" ON public.{table}
  FOR SELECT TO authenticated
  USING (
    owner_id = public.current_user_id() OR
    public.is_admin()
  );
```

---

## Helper Functions

### Available Security Functions

```sql
-- Check if current user is admin
public.is_admin() -> boolean

-- Get current user's Clerk ID
public.current_user_id() -> text

-- Check if current user is service account
public.is_service_account() -> boolean

-- Check if current role is service_role
public.is_service_role() -> boolean
```

### Usage Examples

```sql
-- Admin-only access
USING (public.is_admin())

-- User-specific access (for app_users with clerk_user_id)
USING (clerk_user_id = public.current_user_id())

-- User-specific access (for auth.users)
USING (id = auth.uid())

-- Service account or service role
USING (auth.role() = 'service_role' OR public.is_service_account())
```

---

## Common Mistakes to Avoid

### ❌ DON'T: Forget to enable RLS

```sql
-- BAD: Table without RLS
CREATE TABLE my_table (...);
-- Anyone can access this!
```

### ✅ DO: Always enable RLS

```sql
-- GOOD: Table with RLS
CREATE TABLE my_table (...);
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
```

---

### ❌ DON'T: Create table without policies

```sql
-- BAD: RLS enabled but no policies
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
-- No one can access this (except superuser)!
```

### ✅ DO: Create policies immediately

```sql
-- GOOD: RLS with policies
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role access" ON my_table
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users read own" ON my_table
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

---

### ❌ DON'T: Use SECURITY DEFINER without search_path

```sql
-- BAD: Vulnerable to SQL injection
CREATE FUNCTION my_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Function body
END;
$$;
```

### ✅ DO: Always set search_path for SECURITY DEFINER

```sql
-- GOOD: Protected against SQL injection
CREATE FUNCTION my_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Function body
END;
$$;
```

---

### ❌ DON'T: Use SECURITY DEFINER for views

```sql
-- BAD: View bypasses RLS
CREATE VIEW my_view WITH (security_definer=true) AS
  SELECT * FROM sensitive_table;
```

### ✅ DO: Let views inherit RLS from underlying tables

```sql
-- GOOD: View respects RLS
CREATE VIEW my_view AS
  SELECT * FROM sensitive_table;
-- RLS policies from sensitive_table apply automatically
```

---

### ❌ DON'T: Forget service role bypass

```sql
-- BAD: No service role policy
CREATE POLICY "Users only" ON my_table
  FOR ALL TO authenticated
  USING (user_id = auth.uid());
-- Backend services can't access this!
```

### ✅ DO: Always include service role bypass

```sql
-- GOOD: Service role can always access
CREATE POLICY "Service role access" ON my_table
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users access own" ON my_table
  FOR ALL TO authenticated
  USING (user_id = auth.uid());
```

---

## Testing RLS Policies

### Test as Different Roles

```sql
-- Test as anonymous user
SET ROLE anon;
SELECT * FROM my_table; -- Should return limited/no data

-- Test as authenticated user
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "user_123"}';
SELECT * FROM my_table; -- Should return user's data only

-- Test as service role
SET ROLE service_role;
SELECT * FROM my_table; -- Should return all data

-- Reset to default
RESET ROLE;
```

### Verify Policy Logic

```sql
-- Check policy definitions
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'my_table';

-- Test policy with EXPLAIN
EXPLAIN (VERBOSE)
SELECT * FROM my_table WHERE user_id = 'test_user';
```

---

## Migration Checklist

When creating a new table migration:

- [ ] Create table schema
- [ ] Enable RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- [ ] Create service role bypass policy
- [ ] Create admin access policy (if appropriate)
- [ ] Create user/public access policies (based on access pattern)
- [ ] Add table and policy comments
- [ ] Test policies with different roles
- [ ] Document access pattern in migration header
- [ ] Add to security verification queries

---

## Monitoring & Verification

### Weekly Security Check

```bash
# Run verification script
psql -f scripts/verify_database_security.sql

# Check Supabase Dashboard
# Settings > Database > Advisors
```

### Monthly Security Audit

```sql
-- Check for tables without RLS
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;

-- Check for RLS tables without policies
SELECT t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND p.policyname IS NULL;

-- Check for SECURITY DEFINER functions without search_path
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND NOT EXISTS (
    SELECT 1 FROM unnest(p.proconfig) AS config
    WHERE config LIKE 'search_path=%'
  );
```

---

## Emergency Procedures

### If RLS is Accidentally Disabled

```sql
-- Re-enable RLS immediately
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- Verify policies still exist
SELECT * FROM pg_policies WHERE tablename = '{table_name}';

-- If policies missing, recreate from migration file
-- Check: supabase/migrations/*_create_rls_policies_*.sql
```

### If Policies are Too Restrictive

```sql
-- Temporarily grant access (service role only)
-- DO NOT disable RLS in production!

-- Option 1: Add temporary admin override
CREATE POLICY "temp_emergency_access" ON {table}
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Option 2: Use service role key for emergency operations
-- (service role bypasses all RLS)
```

---

## Resources

- **Security Audit Report:** `docs/security/SECURITY_AUDIT_REPORT.md`
- **Verification Script:** `scripts/verify_database_security.sql`
- **Existing Migrations:**
  - `20251017200000_enable_rls_all_tables.sql`
  - `20251017200100_create_rls_policies_part1.sql`
  - `20251017200200_create_rls_policies_part2.sql`
  - `20251017200300_create_rls_policies_part3.sql`
  - `20251017200400_create_rls_policies_advertising.sql`
  - `20251024_complete_base_schema_rls_policies.sql`
- **Supabase RLS Docs:** https://supabase.com/docs/guides/auth/row-level-security

---

## Contact

For security questions or to report vulnerabilities:

- Database Security Team
- Priority: P0 - CRITICAL for RLS issues
