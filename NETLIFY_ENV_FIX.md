# 🚨 CRITICAL: Netlify Environment Variables Exceeded AWS Lambda 4KB Limit

## ERROR SUMMARY

**Build Status:** ✅ SUCCESS  
**Deployment Status:** ❌ FAILED  
**Error:** Your environment variables exceed the 4KB limit imposed by AWS Lambda

## ROOT CAUSE

You have **46 environment variables** configured in Netlify, and the total size exceeds AWS Lambda's hard limit of 4KB.

The biggest culprits are:

1. **SECRETS_SCAN_OMIT_KEYS** - Massive string (~1-2KB) - Should only be in `netlify.toml`
2. **SECRETS_SCAN_OMIT_PATHS** - Massive string (~1-2KB) - Should only be in `netlify.toml`
3. **PGPASSWORD** - Database password duplicated from connection string

---

## 🔧 IMMEDIATE FIX REQUIRED

Go to Netlify Dashboard and **DELETE** these 13 environment variables:

### DELETE FROM NETLIFY UI (Site Settings → Environment Variables)

#### 1. Build Configuration (Auto-set by Netlify or in netlify.toml)

- ❌ **SECRETS_SCAN_OMIT_KEYS** - Already in netlify.toml, causes 1-2KB bloat
- ❌ **SECRETS_SCAN_OMIT_PATHS** - Already in netlify.toml, causes 1-2KB bloat
- ❌ **NODE_ENV** - Auto-set by Netlify based on context
- ❌ **NODE_VERSION** - Already in netlify.toml
- ❌ **NPM_FLAGS** - Already in netlify.toml
- ❌ **CI** - Auto-set by Netlify
- ❌ **NEXT_TELEMETRY_DISABLED** - Already in netlify.toml

#### 2. Duplicate Variables

- ❌ **SUPABASE_ANON_KEY** - Duplicate of NEXT_PUBLIC_SUPABASE_ANON_KEY

#### 3. Deprecated Stripe Price IDs (No longer used)

- ❌ **STRIPE_PRICE_ADSPACE** - Replaced by STRIPE_PRICE_MONTHLY
- ❌ **STRIPE_PRICE_AD_SLOT** - Not used in codebase
- ❌ **STRIPE_PRICE_PRO** - Not used in codebase
- ❌ **STRIPE_PRICE_TEAM** - Not used in codebase

#### 4. Database Credentials (Embedded in connection string)

- ❌ **PGPASSWORD** - Already in SUPABASE_DATABASE_URL

---

## ✅ KEEP THESE VARIABLES (REQUIRED - 33 total)

### Core Application (4)

✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_ROLE_KEY
✅ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

### Production & Database (3)

✅ CLERK_SECRET_KEY
✅ SUPABASE_DATABASE_URL
✅ SUPABASE_JWT_SECRET

### Authentication & Session (3)

✅ SESSION_SECRET
✅ ENCRYPTION_KEY
✅ ADMIN_USER_IDS

### Stripe Payments (4)

✅ STRIPE_SECRET_KEY
✅ STRIPE_WEBHOOK_SECRET
✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
✅ STRIPE_PRICE_MONTHLY
✅ STRIPE_PRICE_YEARLY

### External APIs (4)

✅ COURTLISTENER_API_KEY
✅ COURTLISTENER_WEBHOOK_VERIFY_TOKEN
✅ GOOGLE_GENERATIVE_AI_API_KEY (or GOOGLE_AI_API_KEY - pick one)
✅ OPENAI_API_KEY

### Sync & Cron (2)

✅ SYNC_API_KEY
✅ CRON_SECRET

### Cache (2)

✅ UPSTASH_REDIS_REST_URL
✅ UPSTASH_REDIS_REST_TOKEN

### Public URLs (7)

✅ NEXT_PUBLIC_APP_NAME
✅ NEXT_PUBLIC_APP_URL
✅ NEXT_PUBLIC_SITE_URL
✅ NEXT_PUBLIC_CLERK_SIGN_IN_URL
✅ NEXT_PUBLIC_CLERK_SIGN_UP_URL
✅ NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
✅ NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL

### Optional (2)

✅ NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT
✅ NEXT_PUBLIC_ENABLE_ADS

### Monitoring (Optional - 2)

✅ NEXT_PUBLIC_SENTRY_DSN
⚠️ SENTRY_AUTH_TOKEN (only if using Sentry uploads)

---

## 📋 STEP-BY-STEP FIX INSTRUCTIONS

### Step 1: Access Netlify Dashboard

```
1. Go to: https://app.netlify.com/sites/judgefinder/settings/deploys
2. Navigate to: Site Settings → Environment Variables
```

### Step 2: Delete These Variables (ONE BY ONE)

**Build Config (7 variables):**

```
❌ Delete: SECRETS_SCAN_OMIT_KEYS
❌ Delete: SECRETS_SCAN_OMIT_PATHS
❌ Delete: NODE_ENV
❌ Delete: NODE_VERSION
❌ Delete: NPM_FLAGS
❌ Delete: CI
❌ Delete: NEXT_TELEMETRY_DISABLED
```

**Duplicates & Database (2 variables):**

```
❌ Delete: SUPABASE_ANON_KEY
❌ Delete: PGPASSWORD
```

**Deprecated Stripe (4 variables):**

```
❌ Delete: STRIPE_PRICE_ADSPACE
❌ Delete: STRIPE_PRICE_AD_SLOT
❌ Delete: STRIPE_PRICE_PRO
❌ Delete: STRIPE_PRICE_TEAM
```

### Step 3: Optional - Consolidate Duplicate AI Keys

**Choose ONE:**

- Keep `GOOGLE_GENERATIVE_AI_API_KEY` (recommended)
- OR keep `GOOGLE_AI_API_KEY`
- Delete the other one

### Step 4: Verify Final Count

After deletions, you should have **~33 environment variables** (down from 46).

### Step 5: Trigger New Deploy

```bash
# Option A: Push empty commit to trigger deploy
git commit --allow-empty -m "chore: trigger deploy after env cleanup"
git push origin main

# Option B: Use Netlify UI
# Site Settings → Deploys → Trigger Deploy
```

---

## 🎯 EXPECTED SIZE REDUCTION

| Category                | Before          | After                 | Savings                |
| ----------------------- | --------------- | --------------------- | ---------------------- |
| SECRETS_SCAN_OMIT_KEYS  | ~2000 bytes     | 0 bytes               | ~2000 bytes            |
| SECRETS_SCAN_OMIT_PATHS | ~1500 bytes     | 0 bytes               | ~1500 bytes            |
| Other deleted vars      | ~500 bytes      | 0 bytes               | ~500 bytes             |
| **TOTAL REDUCTION**     | **~4000 bytes** | **~4000 bytes saved** | **✅ Under 4KB limit** |

---

## 🔍 VERIFICATION CHECKLIST

After removing variables:

1. ✅ Check environment variable count in Netlify UI (should show ~33)
2. ✅ Verify `netlify.toml` still contains SECRETS*SCAN*\* settings
3. ✅ Trigger new deployment
4. ✅ Watch for "Functions bundling completed" without errors
5. ✅ Verify site deploys successfully

---

## ⚠️ IMPORTANT NOTES

### Why These Variables Are Safe to Delete:

**Build Config Variables:**

- These are automatically set by Netlify or read from `netlify.toml`
- Having them as env vars creates duplication and waste

**SECRETS*SCAN_OMIT*\***:\*\*

- These are configuration for Netlify's secret scanner
- They belong in `netlify.toml` [build.environment] section ONLY
- DO NOT put them as environment variables (causes massive bloat)

**Deprecated Stripe Prices:**

- Your codebase only uses STRIPE_PRICE_MONTHLY and STRIPE_PRICE_YEARLY
- The other price IDs are from old pricing tiers that no longer exist

**PGPASSWORD:**

- This is embedded in SUPABASE_DATABASE_URL connection string
- Example: `postgresql://user:PASSWORD@host/db`
- No need to have it separate

**Duplicate SUPABASE_ANON_KEY:**

- You already have NEXT_PUBLIC_SUPABASE_ANON_KEY
- These are the same value, causing duplication

---

## 🚀 AFTER FIX - EXPECTED RESULT

```
12:36:21 AM: Secrets scanning complete. 793 file(s) scanned.
             No secrets detected! ✅

12:36:22 AM: Calculating files to upload
12:36:22 AM: 2 new file(s) to upload
12:36:22 AM: 5 new function(s) to upload ✅ (should succeed now)
12:36:23 AM: Section completed: deploying ✅
12:36:23 AM: Site is live! 🎉
```

---

## 📞 NEED HELP?

If you're unsure which Google AI key to keep, run this:

```bash
grep -r "GOOGLE_AI_API_KEY\|GOOGLE_GENERATIVE_AI_API_KEY" lib/ app/ --include="*.ts" --include="*.tsx" | wc -l
```

This will show you which one is actually used in the codebase.

---

## ✨ FINAL VARIABLE COUNT

**Before Fix:** 46 variables (~5KB)  
**After Fix:** 33 variables (~2-3KB)  
**Status:** ✅ Under AWS Lambda 4KB limit
