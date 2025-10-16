# Migration Application Instructions

## Overview

This document provides instructions for applying 2 pending migrations to your Supabase production database.

## Migrations to Apply

1. **20251008_001_audit_logs.sql** - Audit logging system for PII access and security events
2. **20250108_performance_metrics.sql** - Performance monitoring table and analytics

## Option 1: Apply via Supabase Dashboard SQL Editor (Recommended)

This is the safest and most straightforward method.

### Steps:

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/xstlnicbnzdxlgfiewmg/sql/new

2. **Apply Migration 1: Audit Logs**
   - Copy the entire contents of: `supabase/migrations/20251008_001_audit_logs.sql`
   - Paste into the SQL Editor
   - Click "Run" button
   - Verify success message appears

3. **Apply Migration 2: Performance Metrics**
   - Copy the entire contents of: `supabase/migrations/20250108_performance_metrics.sql`
   - Paste into the SQL Editor
   - Click "Run" button
   - Verify success message appears

4. **Verify Migrations**
   - Run: `npx tsx scripts/verify-migrations.ts`
   - This will confirm all tables were created and are accessible

## Option 2: Apply via Command Line (Advanced)

If you have your database password and prefer command-line tools:

### Prerequisites:

- Database connection string from Supabase Dashboard
- Location: Project Settings → Database → Connection string

### Steps:

1. **Set Environment Variable**

   ```bash
   export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xstlnicbnzdxlgfiewmg.supabase.co:5432/postgres"
   ```

2. **Run Migration Script**

   ```bash
   npx tsx scripts/apply-migrations-direct.ts
   ```

3. **Verify Migrations**
   ```bash
   npx tsx scripts/verify-migrations.ts
   ```

## What Gets Created

### Migration 1: Audit Logs (20251008_001_audit_logs.sql)

**Tables:**

- `audit_logs` - Main audit log table with RLS policies
- `pii_access_summary` - View for PII access tracking

**Functions:**

- `cleanup_old_audit_logs()` - Removes logs older than 2 years
- `get_audit_log_stats()` - Returns audit statistics
- `get_recent_security_events()` - Returns recent security events

**Indexes:**

- Performance indexes on user_id, action_type, severity, created_at
- Composite index for admin queries

### Migration 2: Performance Metrics (20250108_performance_metrics.sql)

**Tables:**

- `performance_metrics` - Application performance data
- `performance_summary` - View for aggregated statistics

**Functions:**

- `cleanup_old_performance_metrics()` - Removes metrics older than 30 days
- `get_endpoint_performance()` - Returns performance stats for specific endpoints

**Indexes:**

- Indexes on metric_type, operation, recorded_at
- GIN index for JSONB metadata queries

## Expected Results

After successful migration:

✅ `audit_logs` table created
✅ `pii_access_summary` view created
✅ `performance_metrics` table created
✅ `performance_summary` view created
✅ All tables accessible via REST API
✅ RLS policies enabled
✅ Helper functions created

## Troubleshooting

### "Table already exists" Error

- This is normal if you've run the migration before
- The migrations use `CREATE TABLE IF NOT EXISTS`
- Safe to re-run

### "Permission denied" Error

- Make sure you're using the service role key or database password
- Check that you're connected as postgres user

### "View already exists" Error

- Run: `DROP VIEW IF EXISTS [view_name];` before re-running migration
- Or use: `CREATE OR REPLACE VIEW` in the SQL

## Verification

After applying migrations, verify with:

```bash
npx tsx scripts/verify-migrations.ts
```

Expected output:

```
✅ 20251008_001_audit_logs.sql
   ✅ audit_logs
   ✅ pii_access_summary

✅ 20250108_performance_metrics.sql
   ✅ performance_metrics
   ✅ performance_summary

Summary:
  Tables existing: 4/4
  Tables accessible: 4/4

✅ All migrations have been successfully applied!
```

## Next Steps

After successful migration:

1. Test audit logging in your application
2. Monitor performance metrics collection
3. Set up cron jobs to cleanup old data:
   - `SELECT cleanup_old_audit_logs();`
   - `SELECT cleanup_old_performance_metrics();`

## Support

If you encounter issues:

1. Check Supabase Dashboard logs
2. Verify service role key permissions
3. Review RLS policies if table access fails
4. Contact support with specific error messages
