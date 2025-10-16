# 🚀 START RECOVERY NOW

## Your Site is DOWN - Let's Fix It (50 minutes)

---

## ⚡ FASTEST PATH TO RECOVERY

### STEP 1: Fix Database (10 min)

1. Open: https://supabase.com/dashboard/project/xstlnicbnzdxlgfiewmg/editor
2. Go to: **SQL Editor**
3. Open file: `supabase\migrations\20251001_002_fix_search_function_return_type.sql`
4. Copy all content → Paste in SQL Editor → Click **"Run"**
5. Verify: `SELECT * FROM search_judges_ranked('test', NULL, 5, 0.3);` (should return results)

### STEP 2: Set Environment Variables (20 min)

```powershell
# Login to Netlify
netlify login
netlify link --name=olms-4375-tw501-x421

# Get credentials and set variables
# See ENV_VARS_REFERENCE.md for complete list
# You need 12 critical variables:
# - 4 from Supabase (URL, anon key, service role key, JWT secret)
# - 2 from Clerk (publishable key, secret key)
# - 2 from Upstash (URL, token)
# - 3 generated security keys
# - 1 site URL
```

### STEP 3: Rebuild (5 min)

1. Open: https://app.netlify.com/sites/olms-4375-tw501-x421/deploys
2. Click: **"Trigger deploy"** → **"Clear cache and deploy site"**
3. Wait for build to complete (~3-5 minutes)

### STEP 4: Test (15 min)

```powershell
# Run automated tests
.\scripts\test-recovery.ps1

# Or test manually in browser
# https://judgefinder.io
# Search for "Smith"
# Click on a judge profile
```

---

## 📁 FILES TO USE

| File                               | Purpose                     | When to Use                |
| ---------------------------------- | --------------------------- | -------------------------- |
| **EXECUTE_RECOVERY_NOW.md**        | Complete step-by-step guide | Main guide - read this!    |
| **ENV_VARS_REFERENCE.md**          | Environment variables list  | Step 2 - setting variables |
| **RECOVERY_CHECKLIST.md**          | Printable checklist         | Track your progress        |
| **scripts/emergency-recovery.ps1** | Automated script            | Run for guided recovery    |
| **scripts/test-recovery.ps1**      | Testing script              | Step 4 - verify recovery   |
| **AGENT_SWARM_SUMMARY.md**         | Complete overview           | Understand what was done   |

---

## 🎯 SUCCESS CHECKLIST

After completing steps 1-4, verify:

- [ ] https://judgefinder.io loads
- [ ] Search works
- [ ] Judge profiles display
- [ ] No 500 errors

---

## 🆘 QUICK HELP

**Problem**: "netlify: command not found"  
**Fix**: `npm install -g netlify-cli`

**Problem**: Database error  
**Fix**: Re-run Step 1 migration

**Problem**: Still getting 500 errors  
**Fix**: Check `netlify env:list` shows all 12 variables

**Problem**: Need to rollback  
**Fix**: Netlify dashboard → Deploys → Previous deploy → Publish

---

## 📞 DASHBOARDS YOU'LL NEED

- **Supabase**: https://supabase.com/dashboard/project/xstlnicbnzdxlgfiewmg
- **Netlify**: https://app.netlify.com/sites/olms-4375-tw501-x421
- **Clerk**: https://dashboard.clerk.com
- **Upstash**: https://console.upstash.com

---

## ⏱️ TIME: ~50 MINUTES TOTAL

Ready? **GO TO**: `EXECUTE_RECOVERY_NOW.md` **NOW!**

Or run automated script:

```powershell
.\scripts\emergency-recovery.ps1
```

---

🚨 **Your site will be back online in less than 1 hour!**
