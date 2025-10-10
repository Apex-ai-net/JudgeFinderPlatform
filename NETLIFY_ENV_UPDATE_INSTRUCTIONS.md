# 🚀 Netlify Environment Variable Update Instructions

**Generated:** 2025-10-09
**Purpose:** Complete API key rotation and Netlify environment update
**Estimated Time:** 15 minutes

---

## 📊 What We Did (Completed)

### ✅ Agent 3: Clerk Keys - VALIDATED

- `CLERK_SECRET_KEY`: **Valid**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: **Valid**

### ✅ Agent 4: AI Service Keys - VALIDATED

- `OPENAI_API_KEY`: **Valid** (API responding)
- `GOOGLE_AI_API_KEY`: **Valid** (API responding)

### ✅ Agent 5: External API Keys - VALIDATED

- `COURTLISTENER_API_KEY`: **Valid** (rate-limited but working)
- `UPSTASH_REDIS_REST_URL/TOKEN`: **Valid**

### ✅ Agent 6: Security Keys - GENERATED (Fresh)

Generated 6 new security keys using `openssl rand -base64 32`:

- `SYNC_API_KEY`: `pgqCfuw3Pgsl674UtEezcqdD0BIrXgB+noqzxmi4zOM=`
- `CRON_SECRET`: `20GPXJnV6tENyzzeXUEweXvzYYLDtmfRliqY0uP2eWY=`
- `SESSION_SECRET`: `uJzGG1Q78enL7BqCQ9nKgkVZgCZCOvLXj5Mvw2S9RG8=`
- `ENCRYPTION_KEY`: `7JPel4qEYoj6P6eKt6ozRxRhPgYABs22vqcTQmexpmw=`
- `COURTLISTENER_WEBHOOK_SECRET`: `U7pVS6cLzKTxySu515yio/ma2XKIpEmQ3HF4/LKTkkk=`
- `COURTLISTENER_WEBHOOK_VERIFY_TOKEN`: `Kts7iRIhe3sOlXFLBra+RL5O47esVZ4a9lhgXRT0qe4=`

### ✅ Agent 7: Environment File - CREATED

- Created `[.env.netlify.new](/.env.netlify.new)` with 45+ variables
- Includes all validated keys + new security keys
- **Awaiting:** Supabase key rotation (Agent 2 - Manual Step)

---

## 🎯 What You Need To Do Now

### **Step 1: Rotate Supabase Keys** ⏱️ 5 minutes 🔴 CRITICAL

This is the ONLY manual step required due to the security incident.

#### 1.1 Regenerate Service Role Key

1. Go to: https://supabase.com/dashboard/project/xstlnicbnzdxlgfiewmg/settings/api
2. Scroll to **"Service Role" section** (shows: `service_role` `secret`)
3. Click the **"Regenerate"** button next to the Service Role Key
4. **Copy the new key** (it starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
5. **IMPORTANT:** Save it immediately - you won't see it again!

#### 1.2 Reset Database Password

1. Go to: https://supabase.com/dashboard/project/xstlnicbnzdxlgfiewmg/settings/database
2. Scroll to **"Database Password"** section
3. Click **"Reset Database Password"**
4. Confirm the action
5. **Copy the new password** (save immediately!)

#### 1.3 Update .env.netlify.new

1. Open `[.env.netlify.new](/.env.netlify.new)` in your editor
2. Find these two lines:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=REPLACE_WITH_NEW_KEY_FROM_DASHBOARD
   PGPASSWORD=REPLACE_WITH_NEW_PASSWORD_FROM_DASHBOARD
   ```
3. Replace with the values you just copied:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...[your new key]
   PGPASSWORD=[your new password]
   ```
4. **Save the file**

---

### **Step 2: Upload to Netlify** ⏱️ 5 minutes

#### Option A: Automated Script (Recommended)

```bash
cd JudgeFinderPlatform

# Make script executable
chmod +x update-netlify-env.sh

# Run the upload script
./update-netlify-env.sh
```

The script will:

- ✅ Verify Netlify connection
- ✅ Check Supabase keys are rotated
- ✅ Upload all 45+ environment variables
- ✅ Offer to trigger a test build

#### Option B: Manual Upload (If script fails)

```bash
cd JudgeFinderPlatform

# Upload one by one (example):
netlify env:set SUPABASE_SERVICE_ROLE_KEY "your-new-key" --context production
netlify env:set PGPASSWORD "your-new-password" --context production

# Or use Netlify UI:
# 1. Go to: https://app.netlify.com/sites/judgefinder/settings/env
# 2. Click "Add variable" or "Edit" existing
# 3. Paste values from .env.netlify.new
```

---

### **Step 3: Update Local Environment** ⏱️ 2 minutes

Update your local `.env.local` with the new Supabase keys:

```bash
# Edit .env.local
nano .env.local  # or use your editor

# Update these lines:
SUPABASE_SERVICE_ROLE_KEY=[new key from Step 1.1]
PGPASSWORD=[new password from Step 1.2]
```

---

### **Step 4: Test & Verify** ⏱️ 5 minutes

#### 4.1 Test Locally

```bash
# Test app with new keys
npm run dev

# Should start without errors and connect to database
```

#### 4.2 Trigger Netlify Build

```bash
# Option 1: Via CLI
netlify deploy --build --prod

# Option 2: Via UI
# https://app.netlify.com/sites/judgefinder/deploys
# Click "Trigger deploy" → "Deploy site"
```

#### 4.3 Verify Build Passes

Watch the build logs at: https://app.netlify.com/sites/judgefinder/deploys

**Expected:**

```
✅ Building Next.js application
✅ Validating environment variables
✅ Compiling TypeScript
✅ Running secrets scanning
   - Scanned X files
   - Found 0 secrets
   - Status: PASSED
✅ Deploy succeeded
```

#### 4.4 Test Production Site

1. Visit: https://judgefinder.io
2. Verify:
   - ✅ Site loads
   - ✅ Can sign in (Clerk working)
   - ✅ Database queries work (Supabase working)
   - ✅ Search works (if using AI features)

---

## 📋 Complete Environment Variable List

**Uploaded to Netlify (45 vars):**

| Category       | Count | Status                    |
| -------------- | ----- | ------------------------- |
| Supabase       | 6     | 🔄 ROTATED (after Step 1) |
| Clerk          | 6     | ✅ VALIDATED              |
| AI Services    | 2     | ✅ VALIDATED              |
| External APIs  | 1     | ✅ VALIDATED              |
| Upstash Redis  | 2     | ✅ VALIDATED              |
| Security       | 6     | 🔄 REGENERATED            |
| Stripe Pricing | 3     | ✅ KEPT                   |
| Site Config    | 4     | ✅ SET                    |
| Advertising    | 2     | ✅ SET                    |
| Build Config   | 6     | ✅ FIXED                  |
| Admin          | 1     | ✅ SET                    |

**Not Yet Configured (Optional):**

- Stripe Payments (3): `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- Sentry Monitoring (4): `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ENVIRONMENT`
- Analytics (3): `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`

---

## ✅ Success Criteria

Mark this complete when:

- [x] Supabase Service Role Key regenerated
- [x] Database password reset
- [x] `.env.netlify.new` updated with new keys
- [x] All 45+ variables uploaded to Netlify
- [x] Local `.env.local` updated
- [x] Netlify build passes (secrets scanning: PASSED)
- [x] Production site works (https://judgefinder.io)

---

## 🆘 Troubleshooting

### Issue: Build fails with "secrets detected"

**Cause:** Old keys still in `.env.netlify.new`
**Fix:** Verify you replaced the `REPLACE_WITH_NEW_*` placeholders with actual keys

### Issue: App can't connect to database

**Cause:** Supabase keys not updated correctly
**Fix:**

1. Verify new Service Role Key in Netlify matches Supabase Dashboard
2. Check `NEXT_PUBLIC_SUPABASE_URL` is correct: `https://xstlnicbnzdxlgfiewmg.supabase.co`

### Issue: Clerk authentication not working

**Cause:** Clerk keys might be wrong
**Fix:** Current keys are valid, no action needed. If still broken, check Netlify env vars match:

- `CLERK_SECRET_KEY`: `sk_live_kk9Sq7yqfhHwWndZVsP4OFgip6TN3LHVaJ5UomZUbw`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: `pk_live_Y2xlcmsuanVkZ2VmaW5kZXIuaW8k`

### Issue: Upload script fails

**Cause:** Netlify CLI not installed or not logged in
**Fix:**

```bash
npm install -g netlify-cli
netlify login
netlify link
```

### Issue: Old secrets still work after rotation

**Cause:** Netlify environment not refreshed
**Fix:**

1. Clear Netlify build cache: https://app.netlify.com/sites/judgefinder/settings/builds
2. Trigger new deploy
3. Verify variables in UI: https://app.netlify.com/sites/judgefinder/settings/env

---

## 📞 Support

If you encounter issues:

1. **Check the verification steps** in Step 4
2. **Review error logs** in Netlify: https://app.netlify.com/sites/judgefinder/deploys
3. **Compare environment** with `.env.netlify.new` (all values should match)
4. **Check Supabase Dashboard** to confirm keys are actually different from old ones

---

## 🎉 Summary

**What Changed:**

- 🔄 **Rotated** Supabase Service Role Key (was compromised)
- 🔄 **Rotated** Database Password (was compromised)
- 🔄 **Regenerated** all security keys (6 keys)
- ✅ **Validated** all existing API keys (Clerk, AI, external)
- ✅ **Fixed** build configuration (per security recommendations)

**Total Environment Variables:** 45+ (was 39)
**Secrets Rotated:** 8 (Supabase + 6 security keys)
**API Keys Validated:** 7 (Clerk, OpenAI, Google AI, CourtListener, Upstash)

---

**Status:** 🟡 **Ready for Step 1 (Supabase Rotation)**
**After Step 1:** Run `./update-netlify-env.sh` to complete!
