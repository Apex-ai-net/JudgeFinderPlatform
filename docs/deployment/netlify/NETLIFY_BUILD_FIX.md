# Netlify Build Fix - Sentry Compatibility Issue

## Problem

The production build is failing with the following error:

```
Error: <Html> should not be imported outside of pages/_document.
Read more: https://nextjs.org/docs/messages/no-document-import-in-page
```

**Root Cause:** Sentry's Next.js SDK (v8.20.0) has a compatibility issue with Next.js 15 where it automatically injects error pages that use the Pages Router `<Html>` component, which is incompatible with the App Router.

## Solution

### Option 1: Build Without SENTRY_DSN (Recommended)

Configure Netlify to NOT set `SENTRY_DSN` during the build phase. Sentry will still work at runtime.

**In Netlify Dashboard:**

1. Go to Site Settings → Environment Variables
2. Find `SENTRY_DSN` variable
3. Set it to **only** apply to "Deploys" (runtime), NOT "Builds"
4. OR temporarily remove it completely during build troubleshooting

**Manual Build Command:**

```bash
unset SENTRY_DSN && npm run build
```

### Option 2: Update Sentry (Future)

When Sentry releases Next.js 15 App Router support:

```bash
npm update @sentry/nextjs
```

## What Was Fixed

### 1. LA County Page Build Error ✅ (RESOLVED)

- **File:** `app/counties/los-angeles/page.tsx`
- **Issue:** Tried to access `laMarketIntel.revenue_projections.tier_1_total.conservative_monthly` but the JSON file was empty
- **Fix:** Added optional chaining: `laMarketIntel?.revenue_projections?.tier_1_total?.conservative_monthly`
- **Status:** Fully resolved

### 2. Sentry Lazy Loading ⚠️ (PARTIAL)

- **File:** `components/providers/Providers.tsx`
- **Change:** Lazy-loaded Sentry to prevent build-time import
- **Status:** Helped but not sufficient

### 3. Sentry Webpack Config ⚠️ (PARTIAL)

- **File:** `next.config.js`
- **Change:** Added Sentry configuration with `autoInstrumentServerFunctions: false`
- **Status:** Helped but not sufficient

## Remaining Issues

Sentry is still imported at build-time in these files:

- `lib/judges/directory/judgesDirectoryStore.ts` (line 2)
- `lib/monitoring/metrics.ts`

These imports trigger Sentry's auto-instrumentation even with our mitigations.

## Verification

After configuring Netlify, the build should complete successfully:

```bash
npm run build
```

Expected output:

```
✓ Compiled successfully
✓ Generating static pages (44/44)
✓ Finalizing page optimization
```

## Related

- Judicial Election Feature: Successfully implemented and ready to deploy
- All election feature code is production-ready
- This build error is a pre-existing infrastructure issue unrelated to the election feature

## Timeline

- **2025-01-22:** Election feature completed
- **2025-01-23:** Identified LA County page bug (fixed)
- **2025-01-23:** Identified Sentry compatibility issue (workaround provided)

## Support

For questions:

- Check Sentry Next.js 15 compatibility: https://github.com/getsentry/sentry-javascript/issues
- Netlify environment variables: https://docs.netlify.com/environment-variables/overview/
