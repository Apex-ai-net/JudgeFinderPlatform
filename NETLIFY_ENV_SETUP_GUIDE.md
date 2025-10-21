# Netlify Environment Variables Setup Guide

## Overview

The `.env.local` file has been created with environment variables from your Netlify production deployment. However, some sensitive values are masked by the Netlify CLI for security reasons. This guide will help you retrieve the full values.

## Current Status

### Successfully Retrieved (Full Values)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_DATABASE_URL`
- `SUPABASE_JWT_SECRET`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `STRIPE_PRICE_MONTHLY`
- `STRIPE_PRICE_YEARLY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_ENABLE_ADS`
- `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT`
- `ENCRYPTION_KEY`
- `NODE_ENV`

### Masked Values (Need Manual Retrieval)

The following variables are masked and need to be retrieved manually from the Netlify dashboard:

1. **SUPABASE_SERVICE_ROLE_KEY** - Ends with: `bXRY`
2. **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY** - Ends with: `aW8k`
3. **CLERK_SECRET_KEY** - Ends with: `ZUbw`
4. **OPENAI_API_KEY** - Ends with: `2UQA`
5. **GOOGLE_AI_API_KEY** - Ends with: `ehw8`
6. **COURTLISTENER_API_KEY** - Ends with: `ea34`
7. **COURTLISTENER_WEBHOOK_VERIFY_TOKEN** - Ends with: `qe4=`
8. **UPSTASH_REDIS_REST_URL** - Ends with: `h.io`
9. **UPSTASH_REDIS_REST_TOKEN** - Ends with: `xODM`
10. **STRIPE_SECRET_KEY** - Ends with: `Iegk`
11. **STRIPE_WEBHOOK_SECRET** - Ends with: `28qY`
12. **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY** - Ends with: `7wxP`
13. **NEXT_PUBLIC_SITE_URL** - Ends with: `r.io` (likely `https://judgefinder.io`)
14. **ADMIN_USER_IDS** - Ends with: `qrMx`
15. **SYNC_API_KEY** - Ends with: `zOM=`
16. **CRON_SECRET** - Ends with: `eWY=`
17. **SESSION_SECRET** - Ends with: `RG8=`

### Not Set (Optional)
- `NEXT_PUBLIC_SENTRY_DSN` - Optional for local dev
- `SENTRY_DSN` - Optional for local dev

## How to Retrieve Masked Values

### Option 1: Netlify Dashboard (Recommended)

1. Go to https://app.netlify.com
2. Navigate to your site: **judgefinder** (https://judgefinder.io)
3. Go to **Site settings** → **Environment variables**
4. Click on each masked variable to reveal its full value
5. Copy each value and paste it into `.env.local`

### Option 2: Use Original Sources

If you have access to the original API keys/secrets, you can retrieve them from:

#### Supabase
- Go to: https://app.supabase.com/project/xstlnicbnzdxlgfiewmg/settings/api
- Copy `service_role` secret key for `SUPABASE_SERVICE_ROLE_KEY`

#### Clerk
- Go to: https://dashboard.clerk.com
- Navigate to your JudgeFinder application
- **API Keys** section:
  - Copy Publishable Key for `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - Copy Secret Key for `CLERK_SECRET_KEY`

#### OpenAI
- Go to: https://platform.openai.com/api-keys
- Copy or regenerate key for `OPENAI_API_KEY`

#### Google AI (Gemini)
- Go to: https://makersuite.google.com/app/apikey
- Copy key for `GOOGLE_AI_API_KEY`

#### CourtListener
- Go to: https://www.courtlistener.com/help/api/
- Find your API key for `COURTLISTENER_API_KEY`

#### Upstash Redis
- Go to: https://console.upstash.com/
- Navigate to your Redis database
- Copy REST URL and token for `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

#### Stripe
- Go to: https://dashboard.stripe.com/apikeys
- Copy keys for:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET` (from Webhooks section)
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## Quick Fix for Most Common Issues

### If you can access Netlify dashboard:
Run this helper script to identify which values still need updating:

```bash
grep -E '\*{10,}|No value set' .env.local
```

### NEXT_PUBLIC_SITE_URL
This is likely just `https://judgefinder.io` (matches `NEXT_PUBLIC_APP_URL`)

You can update it directly:
```bash
sed -i '' 's|NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=https://judgefinder.io|' .env.local
```

## Verification

After updating all masked values, verify your environment:

```bash
# Check that all critical values are set (no asterisks)
npm run dev

# OR run environment validation
node -e "require('dotenv').config({ path: '.env.local' }); console.log('CLERK_SECRET_KEY set:', !!process.env.CLERK_SECRET_KEY);"
```

## Security Reminders

1. **NEVER commit .env.local** - It's already in `.gitignore`
2. **Keep this file secure** - It contains production secrets
3. **Rotate secrets if exposed** - If you accidentally commit or share these values
4. **Use different values for production** - Consider using development-specific keys where possible

## Backup

A backup of your previous `.env.local` was created:
- `.env.local.backup.TIMESTAMP`

You can restore it with:
```bash
cp .env.local.backup.TIMESTAMP .env.local
```

## Next Steps

1. Open `.env.local` in your editor
2. Replace all `****************` values with full values from Netlify dashboard or original sources
3. Save the file
4. Run `npm run dev` to start development server
5. Verify the application loads without authentication errors

## Troubleshooting

### Error: "Authentication not configured"
- Check that `CLERK_SECRET_KEY` is set and not masked
- Verify the key format (should start with `sk_`)

### Error: "Missing judge data"
- Run `npm run sync:judges` to populate local database
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly

### Error: "Rate limit errors"
- Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- The app will continue with degraded rate limiting if Redis is unavailable

## Support

If you encounter issues:
1. Check the Netlify function logs for detailed errors
2. Verify all critical environment variables are set (not masked)
3. Ensure you're using the same values as production (from Netlify dashboard)

For more information, see:
- `/Users/tanner-osterkamp/JudgeFinderPlatform/CLAUDE.md` - Project documentation
- `/Users/tanner-osterkamp/JudgeFinderPlatform/.env.example` - Full list of all environment variables
