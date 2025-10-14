# 🔑 Environment Variables Quick Reference

This is your quick reference for setting up all required environment variables in Netlify.

---

## 🚨 CRITICAL VARIABLES (Must Set - Site Won't Work Without These)

### 1. Supabase Database (4 variables)

```powershell
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://xstlnicbnzdxlgfiewmg.supabase.co"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
netlify env:set SUPABASE_SERVICE_ROLE_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
netlify env:set SUPABASE_JWT_SECRET "your-jwt-secret-from-supabase"
```

**Where to get**:

- Go to: https://supabase.com/dashboard/project/xstlnicbnzdxlgfiewmg/settings/api
- Copy: URL, anon key, service_role key
- JWT Secret: Settings → API → JWT Settings

### 2. Clerk Authentication (2 variables)

```powershell
netlify env:set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY "YOUR_CLERK_PUBLISHABLE_KEY_HERE"
netlify env:set CLERK_SECRET_KEY "YOUR_CLERK_SECRET_KEY_HERE"
```

**Where to get**:

- Go to: https://dashboard.clerk.com
- Select your application
- Go to: API Keys
- Use LIVE keys for production

### 3. Upstash Redis (2 variables)

```powershell
netlify env:set UPSTASH_REDIS_REST_URL "https://your-instance.upstash.io"
netlify env:set UPSTASH_REDIS_REST_TOKEN "AYourTokenHere..."
```

**Where to get**:

- Go to: https://console.upstash.com
- Select your Redis database
- Go to: REST API tab
- Copy: URL and Token

### 4. Security Keys (3 variables)

```powershell
# Generate random keys using PowerShell:
# -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})

netlify env:set SYNC_API_KEY "your-random-32-char-string"
netlify env:set CRON_SECRET "your-random-32-char-string"
netlify env:set ENCRYPTION_KEY "your-random-32-char-string"
```

**How to generate**: Run the PowerShell command above 3 times

### 5. Site Configuration (1 variable)

```powershell
netlify env:set NEXT_PUBLIC_SITE_URL "https://judgefinder.io"
```

---

## ⚠️ RECOMMENDED VARIABLES (Strongly Recommended for Production)

### 6. Sentry Error Tracking (2 variables)

```powershell
netlify env:set SENTRY_DSN "https://xxx@xxx.ingest.sentry.io/xxx"
netlify env:set NEXT_PUBLIC_SENTRY_DSN "https://xxx@xxx.ingest.sentry.io/xxx"
```

**Where to get**:

- Create project at: https://sentry.io
- Get DSN from: Settings → Client Keys

### 7. CourtListener API (1 variable)

```powershell
netlify env:set COURTLISTENER_API_KEY "your-courtlistener-api-key"
```

**Where to get**:

- Register at: https://www.courtlistener.com
- Go to: Account → API Access
- Generate new token

### 8. AI Services (1-2 variables, choose one)

```powershell
# Option A: Google AI
netlify env:set GOOGLE_AI_API_KEY "AIzaSyYOUR_KEY_HERE"

# Option B: OpenAI
netlify env:set OPENAI_API_KEY "sk-proj-YOUR_KEY_HERE"
```

**Where to get**:

- Google AI: https://makersuite.google.com/app/apikey
- OpenAI: https://platform.openai.com/api-keys

---

## 📊 OPTIONAL VARIABLES (Nice to Have)

### 9. Analytics (2 variables)

```powershell
netlify env:set NEXT_PUBLIC_GA_MEASUREMENT_ID "G-XXXXXXXXXX"
netlify env:set NEXT_PUBLIC_POSTHOG_KEY "phc_YOUR_KEY_HERE"
```

### 10. Stripe Payment (3 variables)

```powershell
netlify env:set STRIPE_SECRET_KEY "YOUR_STRIPE_SECRET_KEY_HERE"
netlify env:set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY "YOUR_STRIPE_PUBLISHABLE_KEY_HERE"
netlify env:set STRIPE_WEBHOOK_SECRET "whsec_YOUR_WEBHOOK_SECRET"
```

### 11. Admin Configuration (1 variable)

```powershell
netlify env:set ADMIN_USER_IDS "user_2abc123def,user_2xyz456ghi"
```

---

## 📋 Verification Checklist

After setting variables, verify:

```powershell
# Check all variables are set
netlify env:list

# Should show:
# ✓ NEXT_PUBLIC_SUPABASE_URL
# ✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
# ✓ SUPABASE_SERVICE_ROLE_KEY
# ✓ SUPABASE_JWT_SECRET
# ✓ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# ✓ CLERK_SECRET_KEY
# ✓ UPSTASH_REDIS_REST_URL
# ✓ UPSTASH_REDIS_REST_TOKEN
# ✓ SYNC_API_KEY
# ✓ CRON_SECRET
# ✓ ENCRYPTION_KEY
# ✓ NEXT_PUBLIC_SITE_URL
```

---

## 🔐 Security Best Practices

1. ✅ **Never commit** `.env` or `.env.local` to git
2. ✅ **Use different keys** for development and production
3. ✅ **Rotate secrets** quarterly (every 3 months)
4. ✅ **Mark sensitive vars** as "Secret" in Netlify dashboard
5. ✅ **Use strong random values** for API keys (32+ characters)

---

## 🔄 Copy-Paste Template

Save this template, fill in your values, then paste into PowerShell:

```powershell
# === CRITICAL VARIABLES (MUST SET) ===

# Supabase Database
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://xstlnicbnzdxlgfiewmg.supabase.co"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "YOUR_ANON_KEY_HERE"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "YOUR_SERVICE_ROLE_KEY_HERE"
netlify env:set SUPABASE_JWT_SECRET "YOUR_JWT_SECRET_HERE"

# Clerk Authentication
netlify env:set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY "YOUR_CLERK_PUBLISHABLE_KEY_HERE"
netlify env:set CLERK_SECRET_KEY "YOUR_CLERK_SECRET_KEY_HERE"

# Upstash Redis
netlify env:set UPSTASH_REDIS_REST_URL "YOUR_UPSTASH_URL_HERE"
netlify env:set UPSTASH_REDIS_REST_TOKEN "YOUR_UPSTASH_TOKEN_HERE"

# Security Keys (Generate random 32-char strings)
netlify env:set SYNC_API_KEY "YOUR_GENERATED_KEY_1"
netlify env:set CRON_SECRET "YOUR_GENERATED_KEY_2"
netlify env:set ENCRYPTION_KEY "YOUR_GENERATED_KEY_3"

# Site Configuration
netlify env:set NEXT_PUBLIC_SITE_URL "https://judgefinder.io"

# === RECOMMENDED VARIABLES ===

# Sentry (Optional but recommended)
# netlify env:set SENTRY_DSN "YOUR_SENTRY_DSN"
# netlify env:set NEXT_PUBLIC_SENTRY_DSN "YOUR_SENTRY_DSN"

# CourtListener (Optional but recommended)
# netlify env:set COURTLISTENER_API_KEY "YOUR_COURTLISTENER_KEY"

# AI Services (Optional - choose one)
# netlify env:set GOOGLE_AI_API_KEY "YOUR_GOOGLE_AI_KEY"
# OR
# netlify env:set OPENAI_API_KEY "YOUR_OPENAI_KEY"
```

---

## 🆘 Troubleshooting

### Problem: "netlify env:set" says "Not linked to a site"

**Solution**:

```powershell
netlify link --name=olms-4375-tw501-x421
```

### Problem: Don't have Supabase/Clerk/Upstash accounts

**Solution**: You must have these accounts set up first. The site can't function without them.

### Problem: Forgot where to find JWT Secret

**Solution**:

- Supabase: Settings → API → JWT Settings → JWT Secret
- It's different from the anon key and service role key

### Problem: How do I know if I set variables correctly?

**Solution**:

```powershell
# List all variables
netlify env:list

# Should show all 12 critical variables
```

---

## 📞 Quick Links

| Service      | Dashboard URL                                               |
| ------------ | ----------------------------------------------------------- |
| **Supabase** | https://supabase.com/dashboard/project/xstlnicbnzdxlgfiewmg |
| **Clerk**    | https://dashboard.clerk.com                                 |
| **Upstash**  | https://console.upstash.com                                 |
| **Netlify**  | https://app.netlify.com/sites/olms-4375-tw501-x421          |
| **Sentry**   | https://sentry.io                                           |

---

**Last Updated**: October 10, 2025
**Total Required Variables**: 12 (critical)
**Total Recommended Variables**: 7
**Site Won't Work Without**: The 12 critical variables

🔐 **Remember**: Never share these values publicly or commit them to git!
