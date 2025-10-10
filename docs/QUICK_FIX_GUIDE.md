# 🚨 JudgeFinder.io Quick Fix Guide

**Site Status**: ❌ NOT LOADING  
**Priority**: 🔴 CRITICAL  
**Fix Time**: 50 minutes to 2 hours

---

## 🎯 What Happened?

JudgeFinder.io is down due to:

1. **Database search function has type mismatch** → All searches return 500 errors
2. **Environment variables not configured** → APIs can't connect to database

---

## ⚡ FASTEST FIX (50 minutes)

Follow these 4 steps in order:

### Step 1: Fix Database (10 min) 🔴 CRITICAL

```bash
# Open Supabase SQL Editor
# URL: https://supabase.com/dashboard/project/xstlnicbnzdxlgfiewmg/editor

# Copy the contents of this file:
JudgeFinderPlatform/supabase/migrations/20251001_002_fix_search_function_return_type.sql

# Paste into SQL Editor and click "Run"

# Verify it worked:
SELECT * FROM search_judges_ranked('test', NULL, 5, 0.3);
# Should return judge results (not error)
```

### Step 2: Configure Environment Variables (20 min) 🔴 CRITICAL

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Link to site
netlify link --name=olms-4375-tw501-x421

# Set critical variables
netlify env:set NEXT_PUBLIC_SUPABASE_URL "your-supabase-url"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "your-anon-key"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "your-service-role-key"
netlify env:set SUPABASE_JWT_SECRET "your-jwt-secret"
netlify env:set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY "your-clerk-key"
netlify env:set CLERK_SECRET_KEY "your-clerk-secret"
netlify env:set UPSTASH_REDIS_REST_URL "your-redis-url"
netlify env:set UPSTASH_REDIS_REST_TOKEN "your-redis-token"
netlify env:set SYNC_API_KEY "your-sync-key"
netlify env:set CRON_SECRET "your-cron-secret"
netlify env:set ENCRYPTION_KEY "your-encryption-key"
netlify env:set NEXT_PUBLIC_SITE_URL "https://judgefinder.io"
```

**Where to find these values:**

- Supabase vars: https://supabase.com/dashboard/project/xstlnicbnzdxlgfiewmg/settings/api
- Clerk vars: https://dashboard.clerk.com
- Upstash vars: https://console.upstash.com
- Others: Check your local `.env.local` file

### Step 3: Rebuild Site (5 min) 🔴 CRITICAL

```bash
# Option A: Via Netlify Dashboard
# 1. Go to: https://app.netlify.com/sites/olms-4375-tw501-x421/deploys
# 2. Click "Trigger deploy"
# 3. Select "Clear cache and deploy site"

# Option B: Via CLI
netlify build --clear-cache
```

### Step 4: Verify It Works (15 min)

```bash
# Test critical endpoints
curl https://judgefinder.io/api/health | jq '.status'
# Expected: "healthy" or "degraded"

curl https://judgefinder.io/api/judges/list?limit=5 | jq '.total_count'
# Expected: 1903

curl https://judgefinder.io/api/judges/search?q=smith | jq '.total_count'
# Expected: >0

# Test homepage
curl https://judgefinder.io
# Expected: HTML (not error)
```

---

## 🤖 Using the Recovery Script

We've provided an automated script:

```bash
# Make it executable
chmod +x scripts/emergency-recovery.sh

# Run it
./scripts/emergency-recovery.sh
```

This script will:

- Test current status
- Guide you through database fix
- Check environment variables
- Help trigger rebuild
- Verify everything works

---

## ✅ Success Checklist

You'll know it's working when:

- [ ] `/api/health` returns `"status": "healthy"` or `"degraded"`
- [ ] `/api/judges/list` returns judge data (not error)
- [ ] `/api/judges/search?q=test` returns search results
- [ ] Homepage loads without errors
- [ ] You can search for judges
- [ ] Judge profiles load

---

## 🆘 If It Still Doesn't Work

### Check Netlify Function Logs

```bash
netlify functions:log
# Or via dashboard:
# https://app.netlify.com/sites/olms-4375-tw501-x421/logs/functions
```

### Check Supabase Database

```bash
# Test database connection
curl "https://xstlnicbnzdxlgfiewmg.supabase.co/rest/v1/"
# Should return 200 (not error)
```

### Common Issues

**Problem**: "Missing Supabase environment variables"

```bash
# Fix: Double-check env vars are set
netlify env:list | grep SUPABASE
```

**Problem**: "Structure of query does not match function result type"

```bash
# Fix: Database migration wasn't applied
# Re-run Step 1 above
```

**Problem**: "Rate limit exceeded"

```bash
# Fix: Wait 1 minute or check Redis config
netlify env:list | grep UPSTASH
```

---

## 📚 More Details

For comprehensive details, see:

- **Full Diagnostic Report**: `docs/SITE_DIAGNOSTIC_REPORT_2025_10_10.md`
- **Database Fix Details**: `docs/search/DATABASE_SEARCH_FIX_REQUIRED.md`
- **Production Config**: `docs/PRODUCTION_CONFIGURATION.md`

---

## 🔄 Rollback Plan

If recovery makes things worse:

```bash
# Via Netlify Dashboard:
# 1. Go to: https://app.netlify.com/sites/olms-4375-tw501-x421/deploys
# 2. Find deploy from before Oct 10, 2025
# 3. Click "Publish deploy"
```

---

## ⏱️ Timeline

| Step         | Time        | Status |
| ------------ | ----------- | ------ |
| Database fix | 10 min      | ⏳     |
| Env vars     | 20 min      | ⏳     |
| Rebuild      | 5 min       | ⏳     |
| Verify       | 15 min      | ⏳     |
| **Total**    | **~50 min** |        |

---

## 📞 Help

If you get stuck:

- Check the detailed diagnostic report
- Review Netlify function logs
- Check Supabase database health
- Verify all environment variables are set

**Last Updated**: October 10, 2025
