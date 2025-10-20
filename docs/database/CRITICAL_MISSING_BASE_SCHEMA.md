# 🚨 CRITICAL: Missing Base Schema Tables

**Status**: ⚠️ **PRODUCTION DATABASE IS INCOMPLETE**
**Discovered**: October 19, 2025
**Severity**: CRITICAL - Core application tables missing

---

## Problem Summary

The production Supabase database is **missing fundamental tables** required by the application:

### Missing Core Tables:
- ❌ **judges** - Core entity for the entire platform
- ❌ **courts** - Required by judges table (foreign key)
- ❌ **cases** - Legal case data
- ❌ **users** - User profiles (extends auth.users)
- ❌ **attorneys** - Attorney profiles
- ❌ **attorney_slots** - Original advertising system
- ❌ Plus many other tables...

### Error Chain:
1. Attempted to apply `20250119000000_judge_ad_products_and_bookings.sql`
2. **ERROR**: `relation "judges" does not exist`
3. Investigation revealed: Base schema never applied to production

---

## Root Cause

The base schema defined in [lib/database/schema.sql](../../lib/database/schema.sql) was **never applied to the production database**.

All migration files in `supabase/migrations/` assume these tables already exist:
- They use `ALTER TABLE judges...`
- They reference judges/courts in foreign keys
- They are incremental changes, not initial setup

---

## Impact Assessment

### Affected Features:
- ❌ **All judge-related features** - Can't work without judges table
- ❌ **Court searches** - No courts table
- ❌ **Case analytics** - No cases table
- ❌ **Advertising system** - Depends on judges/courts
- ❌ **User profiles** - No users table extension

### Current State:
The application is likely **completely non-functional** in production for core features.

---

## Solution: Apply Base Schema First

### Step 1: Verify What Exists

Run this query in Supabase SQL Editor to see what tables currently exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### Step 2: Apply Base Schema

**File**: [lib/database/schema.sql](../../lib/database/schema.sql)

**Method 1: Supabase Dashboard (Recommended)**
1. Open: https://supabase.com/dashboard/project/xstlnicbnzdxlgfiewmg/sql
2. Copy contents of `lib/database/schema.sql`
3. Paste into SQL Editor
4. Click "Run"

**Method 2: CLI**
```bash
cd /Users/tannerosterkamp/JudgeFinder/JudgeFinderPlatform

# Option A: Direct psql
psql "$SUPABASE_DB_URL" -f lib/database/schema.sql

# Option B: Via Supabase CLI
supabase db push lib/database/schema.sql
```

### Step 3: Apply Incremental Migrations

After base schema is applied, run migrations in chronological order:

```bash
# All migrations in order (oldest first)
supabase db push supabase/migrations/
```

Or manually via Dashboard:
1. `20250102_performance_indexes.sql`
2. `20250108_performance_metrics.sql`
3. `20250112_comprehensive_ca_judicial_schema.sql`
4. ... (continue with all migrations in date order)
5. `20250119000000_judge_ad_products_and_bookings.sql` (the one that failed)

---

## Base Schema Contents

The [lib/database/schema.sql](../../lib/database/schema.sql) file creates:

### Core Tables:
1. **courts** - Court information
2. **judges** - Judge profiles and data
3. **cases** - Legal case records
4. **users** - User profiles (extends Supabase auth)
5. **attorneys** - Attorney profiles
6. **attorney_slots** - Advertising slots (original system)
7. **bookmarks** - User bookmarks
8. **search_history** - User searches
9. **judge_analytics** - Analytics cache
10. **subscriptions** - User subscriptions

### Features:
- ✅ UUID primary keys
- ✅ Foreign key relationships
- ✅ Check constraints
- ✅ Indexes for performance
- ✅ Timestamps (created_at, updated_at)
- ✅ Extensions (uuid-ossp, pg_trgm)

---

## Verification Queries

After applying base schema, verify with these queries:

### 1. Check Core Tables Exist
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('judges', 'courts', 'cases', 'users', 'attorneys')
ORDER BY table_name;
```

**Expected**: 5 rows returned

### 2. Check judges Table Schema
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'judges'
ORDER BY ordinal_position;
```

**Expected Columns**:
- id (uuid)
- name (character varying)
- court_id (uuid)
- court_name (character varying)
- jurisdiction (character varying)
- appointed_date (date)
- education (text)
- profile_image_url (character varying)
- bio (text)
- total_cases (integer)
- reversal_rate (numeric)
- average_decision_time (integer)
- courtlistener_id (character varying)
- courtlistener_data (jsonb)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

### 3. Check Foreign Key Relationships
```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('judges', 'cases', 'attorney_slots')
ORDER BY tc.table_name, kcu.column_name;
```

---

## Migration Order (Critical!)

**Apply in this exact order:**

### Phase 1: Base Schema (First!)
```
lib/database/schema.sql
```

### Phase 2: Enhancements (In chronological order)
```
20250102_performance_indexes.sql
20250108_performance_metrics.sql
20250112_comprehensive_ca_judicial_schema.sql
20250125_add_judge_court_level.sql
20250817_001_add_courtlistener_fields.sql
20250817_002_create_judge_court_positions.sql
20250817_003_add_performance_indexes.sql
20250820_001_add_judge_slug_column.sql
20250821_001_add_court_slug_column.sql
20250821_002_add_rpc_function.sql
20250822_001_orphaned_judges_function.sql
20250822_002_add_cases_unique_constraint.sql
20250822_003_add_jurisdiction_column.sql
20250823_001_create_advertising_system.sql
... (continue with all migrations)
20250119000000_judge_ad_products_and_bookings.sql  ← This one failed
```

---

## Why This Happened

### Likely Causes:
1. **Development vs Production Mismatch**: Base schema applied locally but not to production
2. **Missing Initial Migration**: Schema file not converted to migration
3. **Manual Setup**: Production DB may have been partially set up manually
4. **Migration Sync Issue**: Supabase CLI not properly synced with production

### Prevention:
- Always use migration files, never manual schema changes
- Verify production schema matches local before deploying
- Use `supabase db diff` to detect schema drift
- Document all schema changes as migrations

---

## Next Steps

1. **IMMEDIATE**: Apply `lib/database/schema.sql` to production
2. **VERIFY**: Run verification queries to confirm tables exist
3. **MIGRATE**: Apply all incremental migrations in order
4. **TEST**: Verify application works with complete schema
5. **DOCUMENT**: Create migration history record

---

## Support Resources

- **Base Schema**: [lib/database/schema.sql](../../lib/database/schema.sql)
- **Migrations Directory**: [supabase/migrations/](../../supabase/migrations/)
- **Supabase Dashboard**: https://supabase.com/dashboard/project/xstlnicbnzdxlgfiewmg
- **Application Code**: Uses these tables extensively

---

## Checklist

Before proceeding:
- [ ] Backup current production database (if any data exists)
- [ ] Review base schema SQL
- [ ] Confirm Supabase project ID: `xstlnicbnzdxlgfiewmg`
- [ ] Have database credentials ready

During application:
- [ ] Apply base schema via Dashboard or CLI
- [ ] Check for errors in output
- [ ] Run verification queries
- [ ] Verify all 10+ core tables created

After application:
- [ ] Apply incremental migrations in order
- [ ] Test application functionality
- [ ] Document completion
- [ ] Create consolidated migration for future deployments

---

**CRITICAL**: Do not apply any other migrations until base schema is in place!

*Document created by Claude Code - Database Schema Investigation*
