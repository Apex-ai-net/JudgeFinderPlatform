# 🚀 DEPLOY JUDGE ANALYTICS - SIMPLIFIED APPROACH

**Status**: ✅ Ready to Deploy (No Dependencies!)
**Time Required**: 2 minutes
**Risk Level**: LOW (Zero external dependencies)

---

## ⚡ QUICK START (Do This Now)

### Step 1: Check Your Database State (Optional - 30 seconds)

```sql
-- Run this in Supabase SQL Editor to see what you have
-- File: scripts/check-app-users-schema.sql
```

This will show you if `is_service_account` and `is_admin` columns exist.

### Step 2: Deploy the MINIMAL Migration (90 seconds)

**File**: `supabase/migrations/20251009_006_create_judge_analytics_cache_MINIMAL.sql`

```sql
1. Open Supabase SQL Editor
2. Copy ENTIRE contents of 20251009_006_create_judge_analytics_cache_MINIMAL.sql
3. Paste into SQL Editor
4. Click "Run"
```

**Expected Output**:

```
✓ Dropped existing policies (if any)
✓ Created judge_analytics_cache table
✓ Created 3 indexes
✓ Enabled RLS
✓ Created 3 policies
✓ Created updated_at trigger
✓ Created 3 helper functions
✓ Migration successful!
```

---

## 🎯 WHY THIS VERSION WORKS

### ✅ **Zero External Dependencies**

- No `is_service_account()` function needed
- No `is_admin()` function needed
- No foreign key to judges table
- No migration order requirements

### ✅ **Uses Only Native Supabase Functions**

- `auth.role()` - Always available
- `auth.uid()` - Always available
- `auth.jwt()` - Always available

### ✅ **Simple RLS Policies**

```sql
-- Service role: Full access
auth.role() = 'service_role'

-- Everyone: Read access (perfect for public analytics)
true
```

### ✅ **Idempotent**

- Safe to run multiple times
- Won't fail if table already exists
- Won't fail if policies already exist

---

## 📋 WHAT GETS CREATED

### **1. Table: judge_analytics_cache**

```sql
CREATE TABLE judge_analytics_cache (
    id UUID PRIMARY KEY,
    judge_id UUID UNIQUE NOT NULL,  -- One cache per judge
    analytics JSONB NOT NULL,        -- The analytics data
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### **2. Indexes (3 total)**

- `idx_jac_judge_id` - Fast lookup by judge
- `idx_jac_created_at` - Query by date
- `idx_jac_expired` - Find old entries

### **3. RLS Policies (3 total)**

- `jac_service_all` - Service role full access
- `jac_public_select` - Public read access
- `jac_auth_select` - Authenticated read access

### **4. Functions (3 total)**

- `get_cache_stats()` - Cache statistics
- `clear_judge_cache(uuid)` - Clear specific judge
- `clear_all_cache()` - Cleanup utility

---

## 🧪 TEST IT AFTER DEPLOYMENT

### **Verify Table Exists**:

```sql
SELECT COUNT(*) FROM judge_analytics_cache;
-- Expected: 0 (empty table)
```

### **Test Cache Functions**:

```sql
SELECT * FROM get_cache_stats();
-- Expected: Stats showing 0 cached judges
```

### **Check RLS Policies**:

```sql
SELECT
    schemaname, tablename, policyname,
    permissive, cmd
FROM pg_policies
WHERE tablename = 'judge_analytics_cache';
-- Expected: 3 policies listed
```

---

## 🔄 NEXT: TEST YOUR API

After deploying the migration, test the analytics API:

```bash
# Test analytics endpoint
curl "https://judgefinder.io/api/judges/{JUDGE_ID}/analytics?debug=true"
```

**Expected Response**:

```json
{
  "analytics": {
    "civil_plaintiff_favor": 0.52,
    "confidence_civil": 0.85,
    ...
  },
  "cached": false,
  "data_source": "case_analysis",
  "debug": {
    "steps": [
      {"step": "cache_check", "result": "miss"},
      {"step": "generate_analytics", "result": "success"},
      {"step": "cache_write", "result": "success"}
    ]
  }
}
```

---

## ⚠️ TROUBLESHOOTING

### Issue: "relation judge_analytics_cache already exists"

**Fix**: Table already created! You're done. Test the API.

### Issue: "permission denied for table judge_analytics_cache"

**Fix**: RLS policies issue. Run this:

```sql
-- Grant permissions
GRANT SELECT ON judge_analytics_cache TO anon, authenticated;
GRANT ALL ON judge_analytics_cache TO service_role;
```

### Issue: Analytics still not showing

**Check**:

1. Does the table have data? `SELECT COUNT(*) FROM judge_analytics_cache;`
2. Is the API working? Test with curl
3. Are environment variables set? Check Netlify dashboard
4. Run diagnostic: `npm run diagnose:analytics`

---

## 📚 FILES REFERENCE

- **Migration**: `supabase/migrations/20251009_006_create_judge_analytics_cache_MINIMAL.sql`
- **Diagnostic**: `scripts/check-app-users-schema.sql`
- **API Route**: `app/api/judges/[id]/analytics/route.ts`
- **Cache Logic**: `lib/analytics/cache.ts`

---

## ✨ AFTER DEPLOYMENT

Once the table is created, your analytics will:

✅ Cache in database (permanent until refresh)
✅ Cache in Redis (90 days)
✅ Generate from cases if cache miss
✅ Display on judge profile pages
✅ Support force refresh via API

**Analytics will work immediately for judges with 15+ cases!**

---

## 🎉 YOU'RE READY!

Open Supabase SQL Editor and deploy the MINIMAL migration now. It will work regardless of what other migrations you have or haven't run.

Good luck! 🚀
