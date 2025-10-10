# Analytics Diagnostics - Quick Start Guide

## TL;DR

```bash
npm run diagnose:analytics
```

This single command will check everything and tell you exactly what's wrong.

---

## When to Use

Run diagnostics if you experience:

- Judge profile pages showing "No analytics available"
- Analytics taking forever to load
- Empty or incomplete bias metrics
- Production deployment issues with analytics
- "Insufficient data" warnings everywhere

---

## Quick Commands

```bash
# Check overall health
npm run diagnose:analytics

# Deep dive into specific judge
npm run diagnose:analytics -- --judge-id abc123-def456-ghi789

# Sample 25 judges instead of default 10
npm run diagnose:analytics -- --sample-size 25
```

---

## What You'll See

### Good Output (Everything Working)

```
✓ NEXT_PUBLIC_SUPABASE_URL: https://xy...z123
✓ SUPABASE_SERVICE_ROLE_KEY: eyJhbGci...NiIs
✓ Successfully connected to Supabase
✓ Table 'judge_analytics_cache': EXISTS
✓ Redis write test: PASSED

Overall Statistics
------------------
Total judges analyzed: 10
Judges with cached analytics: 10 (100.0%)
Judges with sufficient data: 10

✓ No issues detected! System appears healthy.
```

### Problem Output (Issues Found)

```
✗ OPENAI_API_KEY: NOT SET
⚠ Redis connection failed: Invalid token

Judge Analysis Results
----------------------
Hon. John Doe (def67890) |    80 |      12 |      8 |    No |      2

Issues:
  ✗ Only 12 cases with decision_date (need ≥15)
  ✗ Should have analytics but cache is missing

RECOMMENDATIONS
---------------
1. [HIGH] 5 judges missing analytics cache
   Solution: Run: npm run analytics:generate -- --limit 50
```

---

## Common Fixes

| Problem                 | Quick Fix                                       |
| ----------------------- | ----------------------------------------------- |
| Missing analytics cache | `npm run analytics:generate`                    |
| Few decided cases       | `npm run sync:decisions`                        |
| Redis unavailable       | Add Redis env vars in Netlify                   |
| Missing fields          | `npm run sync:judges && npm run sync:decisions` |
| Environment vars        | Check `.env.local` or Netlify dashboard         |

---

## Reading the Output

### Colors Mean Things

- **Green (✓)**: Everything's working
- **Yellow (⚠)**: Warning, feature may be limited
- **Red (✗)**: Error, needs fixing

### Priority Levels

- **HIGH**: Fix immediately, affects users
- **MEDIUM**: Fix soon, impacts quality
- **LOW**: Optional, nice to have

---

## Integration with Other Tools

```bash
# 1. Diagnose the issue
npm run diagnose:analytics

# 2. Check overall data status
npm run data:status

# 3. Fix data issues
npm run sync:decisions

# 4. Regenerate analytics
npm run analytics:generate -- --limit 20

# 5. Verify the fix
npm run diagnose:analytics -- --judge-id [specific-id]
```

---

## Production Debugging Checklist

- [ ] Run `npm run diagnose:analytics`
- [ ] Check Netlify environment variables
- [ ] Review Supabase logs for errors
- [ ] Verify API endpoints in browser network tab
- [ ] Check Sentry for runtime exceptions
- [ ] Test Redis connectivity
- [ ] Validate case data has `decision_date`
- [ ] Confirm AI budget hasn't been exceeded

---

## Help & Support

**Full documentation**: See [DIAGNOSTICS.md](./DIAGNOSTICS.md)

**Script location**: `scripts/diagnose-analytics-issues.js` (775 lines)

**Package.json command**: `"diagnose:analytics": "node scripts/diagnose-analytics-issues.js"`

**Get help**:

```bash
npm run diagnose:analytics -- --help
```

---

## Example Session

```bash
$ npm run diagnose:analytics

> judge-finder-platform@0.1.0 diagnose:analytics
> node scripts/diagnose-analytics-issues.js

╔════════════════════════════════════════════════════════════════════════════╗
║                   JUDGE ANALYTICS DIAGNOSTIC TOOL                          ║
║                                                                            ║
║  Comprehensive diagnostics for judge analytics issues                     ║
╚════════════════════════════════════════════════════════════════════════════╝

ℹ Sample Size: 10 judges

================================================================================
ENVIRONMENT VARIABLES CHECK
================================================================================

Required Variables
------------------
✓ NEXT_PUBLIC_SUPABASE_URL: https://abcd...supabase.co
✓ SUPABASE_SERVICE_ROLE_KEY: eyJhbGci...xyz123
✓ SUPABASE_JWT_SECRET: your-sup...long

Optional Variables (AI & Caching)
----------------------------------
✓ GOOGLE_AI_API_KEY: AIzaSyYO...HERE
✓ UPSTASH_REDIS_REST_URL: https://example.upstash.io
✓ UPSTASH_REDIS_REST_TOKEN: AYourUp...Here
⚠ OPENAI_API_KEY: NOT SET (feature may be disabled)

================================================================================
DATABASE CONNECTIVITY
================================================================================

✓ Successfully connected to Supabase
ℹ Database URL: https://abcd...supabase.co

[... continues with detailed analysis ...]

================================================================================
RECOMMENDATIONS
================================================================================

Action Items
------------

1. [HIGH] 3 judges missing analytics cache
   Solution: Run: npm run analytics:generate -- --limit 50
   Details: Or use API: POST /api/judges/[id]/analytics?force=true for each judge

General Debugging Tips

  1. Check application logs in Netlify dashboard for runtime errors
  2. Verify analytics API endpoints: GET /api/judges/[id]/analytics
  3. Test force regeneration: POST /api/judges/[id]/analytics?force=true
  4. Monitor AI cost tracker: Check lib/ai/cost-tracker.ts for budget limits
  5. Validate case data quality: Run 'npm run data:status' for overview
  6. Check browser console and network tab for client-side errors
  7. Review Supabase logs for database query performance

================================================================================
Diagnostic complete!
================================================================================
```

---

## Technical Details

**Technology Stack:**

- Node.js script with colored console output
- Supabase client for database queries
- Upstash Redis for cache testing
- Zero AI costs (read-only diagnostics)

**Performance:**

- Typical run time: 10-30 seconds
- Configurable sample size
- Parallel database queries
- Minimal resource usage

**Requirements:**

- Node.js 20+
- `.env.local` configured or Netlify environment variables
- Database access (service role key)
- Optional: Redis credentials for cache testing

---

## Pro Tips

1. **Run after deployments** to catch environment issues early
2. **Use specific judge ID** when debugging user reports
3. **Increase sample size** (--sample-size 50) for production health checks
4. **Check cost tracker** before running batch analytics generation
5. **Save output** to file for later review: `npm run diagnose:analytics > diagnostic-$(date +%Y%m%d).txt`
6. **Run periodically** as part of maintenance routine
7. **Share output** with team when reporting issues

---

**Last Updated**: January 2025
**Maintainer**: JudgeFinder Platform Team
