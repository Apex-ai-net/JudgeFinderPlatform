# ✅ JudgeFinder.io Recovery Checklist

**Date Started**: ******\_\_\_******  
**Completed By**: ******\_\_\_******

---

## 📋 Pre-Recovery Setup

- [ ] Installed Netlify CLI: `npm install -g netlify-cli`
- [ ] Have access to Supabase Dashboard
- [ ] Have access to Netlify Dashboard
- [ ] Have access to Clerk Dashboard
- [ ] Have access to Upstash Console
- [ ] Read `EXECUTE_RECOVERY_NOW.md`

---

## 🔴 STEP 1: Fix Database (10 min)

**Time Started**: ******\_\_\_******

- [ ] Opened Supabase Dashboard SQL Editor
- [ ] Copied migration file: `20251001_002_fix_search_function_return_type.sql`
- [ ] Pasted into SQL Editor
- [ ] Clicked "Run"
- [ ] Saw "Success" message
- [ ] Verified with test query: `SELECT * FROM search_judges_ranked('smith', NULL, 5, 0.3);`
- [ ] Test query returned judge records (not error)

**Time Completed**: ******\_\_\_******  
✅ **Step 1 Status**: [ ] COMPLETED

---

## 🔴 STEP 2: Configure Environment Variables (20 min)

**Time Started**: ******\_\_\_******

### 2.1 Login to Netlify

- [ ] Ran: `netlify login`
- [ ] Browser opened and authenticated
- [ ] Ran: `netlify link --name=olms-4375-tw501-x421`
- [ ] Successfully linked to site

### 2.2 Collected Credentials

#### Supabase Credentials

- [ ] Opened Supabase API Settings
- [ ] Copied **Project URL**: ************\_************
- [ ] Copied **anon public key**: (starts with eyJh...)
- [ ] Copied **service_role key**: (starts with eyJh...)
- [ ] Copied **JWT Secret**: ************\_************

#### Clerk Credentials

- [ ] Opened Clerk Dashboard
- [ ] Copied **Publishable Key**: (pk*live*...)
- [ ] Copied **Secret Key**: (sk*live*...)

#### Upstash Credentials

- [ ] Opened Upstash Console
- [ ] Copied **REST URL**: ************\_************
- [ ] Copied **REST Token**: ************\_************

#### Generated Security Keys

- [ ] Generated **SYNC_API_KEY**: ************\_************
- [ ] Generated **CRON_SECRET**: ************\_************
- [ ] Generated **ENCRYPTION_KEY**: ************\_************

### 2.3 Set All Variables

- [ ] Set `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Set `SUPABASE_JWT_SECRET`
- [ ] Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] Set `CLERK_SECRET_KEY`
- [ ] Set `UPSTASH_REDIS_REST_URL`
- [ ] Set `UPSTASH_REDIS_REST_TOKEN`
- [ ] Set `SYNC_API_KEY`
- [ ] Set `CRON_SECRET`
- [ ] Set `ENCRYPTION_KEY`
- [ ] Set `NEXT_PUBLIC_SITE_URL` = "https://judgefinder.io"

### 2.4 Verified Variables

- [ ] Ran: `netlify env:list`
- [ ] All 12 critical variables shown

**Time Completed**: ******\_\_\_******  
✅ **Step 2 Status**: [ ] COMPLETED

---

## 🔴 STEP 3: Rebuild & Deploy (5 min)

**Time Started**: ******\_\_\_******

- [ ] Opened Netlify Dashboard Deploys page
- [ ] Clicked "Trigger deploy"
- [ ] Selected "Clear cache and deploy site"
- [ ] Build started successfully
- [ ] Monitored build progress
- [ ] Build completed with "Published" status
- [ ] Waited 1-2 minutes for CDN propagation

**Time Completed**: ******\_\_\_******  
✅ **Step 3 Status**: [ ] COMPLETED

---

## ✅ STEP 4: Verify Recovery (15 min)

**Time Started**: ******\_\_\_******

### 4.1 Automated Testing

- [ ] Ran: `.\scripts\test-recovery.ps1`
- [ ] All tests passed (or noted failures below)

### 4.2 API Endpoint Tests

- [ ] Health Check: ****\_\_**** (200 = OK)
- [ ] Judge List: ****\_\_**** (200 = OK)
- [ ] Search: ****\_\_**** (200 = OK)
- [ ] Courts: ****\_\_**** (200 = OK)
- [ ] Homepage: ****\_\_**** (200 = OK)

### 4.3 Manual Browser Testing

- [ ] Opened https://judgefinder.io
- [ ] Homepage loaded without errors
- [ ] Searched for "Smith"
- [ ] Search results displayed
- [ ] Clicked on a judge profile
- [ ] Profile page loaded with data
- [ ] No console errors (F12 → Console tab)

**Time Completed**: ******\_\_\_******  
✅ **Step 4 Status**: [ ] COMPLETED

---

## 📊 STEP 5: Analytics Cache (Optional, 30 min)

**Time Started**: ******\_\_\_******

- [ ] Ran: `npm run analytics:generate`
- [ ] Process started successfully
- [ ] Completed without errors (takes ~13-14 minutes)
- [ ] Tested profile load time (should be <1 second)

**Time Completed**: ******\_\_\_******  
✅ **Step 5 Status**: [ ] COMPLETED / [ ] SKIPPED

---

## 🎯 Final Success Verification

- [ ] ✅ https://judgefinder.io loads without errors
- [ ] ✅ Search for judges works
- [ ] ✅ Judge profiles display correctly
- [ ] ✅ `/api/health` returns "healthy" or "degraded"
- [ ] ✅ No 500 errors in browser console
- [ ] ✅ Homepage displays judge data

---

## ⏱️ Time Tracking

| Step            | Estimated  | Actual     |
| --------------- | ---------- | ---------- |
| 1. Database Fix | 10 min     | **\_**     |
| 2. Env Vars     | 20 min     | **\_**     |
| 3. Rebuild      | 5 min      | **\_**     |
| 4. Verify       | 15 min     | **\_**     |
| **Total**       | **50 min** | ****\_**** |

---

## 🚨 Issues Encountered

**Problems during recovery:**

1. ***

2. ***

3. ***

**Solutions applied:**

1. ***

2. ***

3. ***

---

## 📝 Notes

---

---

---

---

---

## ✅ Sign-Off

**Recovery Status**: [ ] SUCCESSFUL / [ ] PARTIAL / [ ] FAILED

**Site Status**: [ ] FULLY OPERATIONAL / [ ] PARTIALLY WORKING / [ ] STILL DOWN

**Completed By**: ********\_********

**Date/Time**: ********\_********

**Next Actions**:

1. ***

2. ***

3. ***

---

**Generated**: October 10, 2025  
**For**: JudgeFinder.io Production Recovery  
**Version**: 1.0

---

## 🎉 If Successful

Congratulations! Your site is back online!

**Post-Recovery Tasks**:

- [ ] Monitor error rates for 24 hours
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure Sentry alerts
- [ ] Schedule post-mortem meeting
- [ ] Update runbooks with lessons learned
- [ ] Document any customizations or workarounds used

---

## 🆘 If Recovery Failed

Don't panic! Try these steps:

1. **Review Netlify Function Logs**:

   ```powershell
   netlify functions:log
   ```

2. **Check Environment Variables**:

   ```powershell
   netlify env:list
   ```

3. **Verify Database Connection**:
   - Go to Supabase Dashboard
   - Check project is not paused
   - Test SQL query manually

4. **Rollback if Needed**:
   - Go to Netlify Deploys
   - Find last working deploy
   - Click "Publish deploy"

5. **Contact Support**:
   - Review full diagnostic report
   - Document error messages
   - Check Netlify/Supabase status pages

---

**Emergency Contacts**:

- Netlify Support: https://www.netlify.com/support/
- Supabase Support: https://supabase.com/support
- Clerk Support: https://clerk.com/support
