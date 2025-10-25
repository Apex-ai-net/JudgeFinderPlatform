# Analytics Cache Fix - Deployment Guide

## Problem

The analytics were showing "Analytics withheld for now" message even though the database has 442,691 cases. The issue was that old cached analytics entries had an incorrect data structure - they were missing the granular `sample_size_*` fields (like `sample_size_civil`, `sample_size_custody`, etc.) that the frontend needs to determine whether to display each metric.

## Root Cause

The old analytics cache entries had a structure like:
```json
{
  "analytics": {
    "sample_size": 880,
    "confidence_civil": 85,
    "confidence_family": 0,
    ...
  }
}
```

But the frontend component `AnalyticsSliders.tsx` expects:
```json
{
  "analytics": {
    "sample_size_civil": 45,
    "sample_size_custody": 12,
    "sample_size_alimony": 8,
    ...
    "confidence_civil": 85,
    ...
  }
}
```

When the frontend checked `shouldHideMetric(sampleSize)` for each metric, it was getting `undefined` for all the individual sample sizes, causing all metrics to be hidden.

## Solution

Two scripts have been added:

### 1. Clear Analytics Cache (`scripts/clear-analytics-cache.ts`)
Removes all old cached analytics entries so they can regenerate with the correct structure.

### 2. Regenerate All Analytics (`scripts/regenerate-all-analytics.ts`)
Optionally regenerates analytics for all judges in batches to warm the cache.

## Deployment Steps

### Step 1: Deploy the Code
✅ **COMPLETED** - Code has been pushed to main and will deploy automatically via Netlify.

### Step 2: Run Cache Clear in Production

After the Netlify deployment completes, you need to run the cache clear script in production. Here are your options:

#### Option A: Via Netlify CLI (Recommended)
```bash
# Install Netlify CLI if you don't have it
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link to your site
netlify link

# Run the cache clear script
netlify functions:invoke clear-analytics-cache
```

#### Option B: Direct Database Access
If you have direct access to the Supabase database:

```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-key"

# Run the script
npx tsx scripts/clear-analytics-cache.ts
```

#### Option C: Via Supabase SQL Editor
Run this SQL directly in the Supabase SQL editor:

```sql
-- Check count before deletion
SELECT COUNT(*) FROM judge_analytics_cache;

-- Delete all cached analytics
DELETE FROM judge_analytics_cache;

-- Verify deletion
SELECT COUNT(*) FROM judge_analytics_cache;
```

### Step 3: Verify the Fix

1. Navigate to any judge profile page
2. The analytics should now display correctly with proper metrics
3. Sample sizes should show for each category (e.g., "45 civil cases analyzed")

### Step 4: (Optional) Warm the Cache

If you want to pre-generate analytics for all judges rather than waiting for them to regenerate on demand:

```bash
# Test with a few judges first
npx tsx scripts/regenerate-all-analytics.ts --limit=10 --dry-run

# Then run for all judges
npx tsx scripts/regenerate-all-analytics.ts
```

**Note:** This is optional. Analytics will regenerate automatically when users visit judge pages.

## What Happens Next

- When a user visits a judge profile, the analytics API will check the cache
- If no cache exists (or cache was cleared), it will generate fresh analytics
- The new analytics will have the correct structure with all `sample_size_*` fields
- The frontend will properly display analytics based on actual sample sizes
- Future analytics generations will use the correct structure

## Monitoring

After deployment, monitor these metrics:

1. **Cache Hit Rate**: Should drop initially (cache is empty), then recover
2. **Analytics API Response Time**: May be higher initially as cache rebuilds
3. **User-Reported Issues**: Should see "withheld" message disappear
4. **Sample Size Display**: Each metric should show its sample size

## Rollback Plan

If issues occur:

1. The old analytics structure is still supported by the backend
2. To rollback, restore the database table from a backup
3. Or simply clear cache again and let it regenerate

## Technical Details

**Files Modified:**
- `scripts/clear-analytics-cache.ts` - New cache clearing script
- `scripts/regenerate-all-analytics.ts` - New bulk regeneration script

**Files Involved (Context):**
- `app/api/judges/[id]/analytics/route.ts` - Analytics API endpoint
- `lib/analytics/statistical.ts` - Analytics generation logic
- `lib/analytics/config.ts` - Sample size thresholds
- `components/judges/AnalyticsSliders.tsx` - Frontend display logic

**Database Tables:**
- `judge_analytics_cache` - Stores cached analytics

**Redis Cache:**
- Key pattern: `judge:analytics:{judgeId}`
- TTL: 90 days
- Cleared automatically when DB cache is cleared
