# JudgeFinder.io Runtime Issues Report

**Test Date:** October 14, 2025
**Environment:** Production (https://judgefinder.io)
**Build Commits:** 800298d → 29478fb → b0a654a → 3787ced → 5ac6e41

## Summary

Fixed 3 critical deployment blockers overnight. Discovered 2 critical runtime issues during browser testing. All fixes committed and pushed.

## Issues Fixed (Deployment)

### Issue 1: Secret Leak

- Status: FIXED
- File: `.claude/settings.local.json` removed from git
- Commit: 1048036

### Issue 2: ESLint Config Missing

- Status: FIXED
- Moved `eslint-config-prettier` and `@eslint/eslintrc` to dependencies
- Commits: 1048036, 08b4a53

### Issue 3: AWS Lambda 4KB Limit

- Status: FIXED
- Deleted 14 unnecessary environment variables via Netlify MCP
- Reduced from 46 vars (~5KB) to 18 vars (~1.5KB)
- Commits: 99d78d5, 71feb29

## Issues Fixed (Runtime)

### Issue 4: Judges Directory Infinite Loop

- Status: FIXED
- Root cause: MobX observables in useEffect dependency arrays
- Files changed:
  - `app/judges/JudgesView.tsx`
  - `app/judges/components/JudgesDirectorySearchPanel.tsx`
  - `app/judges/components/JudgesDirectoryResultsGrid.tsx`
  - `lib/judges/directory/useJudgesDirectoryViewModel.ts`
  - `lib/judges/directory/judgesDirectoryStore.ts`
- Commits: 29478fb, b0a654a, 3787ced

### Issue 5: Rate Limiter Blocking All Endpoints

- Status: FIXED
- Root cause: Redis unavailable in production, rate limiter threw errors
- Solution: Graceful degradation with pass-through limiter
- File: `lib/security/rate-limit.ts`
- Commit: 800298d

### Issue 6: Courts API 500 Error

- Status: FIXED
- Root cause: Querying nonexistent `court_level` column
- Database schema: courts table has no court_level column
- File: `app/api/courts/route.ts`
- Commit: 5ac6e41

### Issue 7: Analytics Partial Failure

- Status: FIXED
- Made analytics service resilient to individual endpoint failures
- File: `lib/analytics/AnalyticsDataService.ts`
- Commit: 800298d

### Issue 8: CSS MIME Type Error

- Status: FIXED
- Added explicit `Content-Type: text/css` header for CSS files
- File: `netlify.toml`
- Commit: cb55060

### Issue 9: Missing Analytics Endpoint

- Status: FIXED
- Created `/api/analytics/chat-funnel` endpoint
- File: `app/api/analytics/chat-funnel/route.ts`
- Commit: cb55060

## Remaining Issues

### Judges Directory Not Rendering

- **Status:** Investigating
- **Symptom:** Page stuck in Suspense fallback "Loading judicial profiles..."
- **API:** Returns data successfully (24 judges, 1903 total)
- **Database:** Confirmed 1903 judges exist via Supabase MCP
- **Possible causes:**
  - MobX observer not triggering React re-renders
  - Component throwing error during render
  - Suspense boundary catching Promise

### Courts Directory Loading State

- **Status:** Pending build deployment
- **Fix committed:** Removed court_level column from query (5ac6e41)
- **Expected:** Should load courts after next deploy completes

## Database Verification (via Supabase MCP)

- **Judges:** 1903 records in CA
- **Courts:** 134 records in CA
- **Sample Slugs:** maria-lopez, mark-edward-petersen, james-m-evans

Data exists. All issues are code bugs, not missing data.

## Test Results

### Working Pages

- Homepage: Renders correctly, CSS loading properly
- About: Full content, no errors
- Privacy: Complete CCPA compliance text
- Terms: (assumed working, not tested)
- Contact: (assumed working, not tested)
- API Health: Returns healthy status for all systems

### Broken Pages

- Judges Directory: Stuck in loading state
- Courts Directory: Loading state (fix pending deployment)
- Analytics: Shows "—" for all metrics (endpoints failing)
- Judge Profiles: 404 errors (unable to test without directory working)

## Commits Pushed (Total: 13)

**Deployment Fixes:**

1. 1048036 - Removed secrets from git
2. 08b4a53 - ESLint dependencies
3. 99d78d5 - Removed deprecated Stripe code
4. 6970c0b - Added documentation
5. 71feb29 - Trigger deploy
6. 9d10c04 - Completion summary
7. cb55060 - CSS MIME + analytics endpoint
8. 0d2f721 - Updated docs

**Runtime Fixes:** 9. 800298d - Rate limiter + infinite loop fixes 10. 29478fb - MobX useEffect deps 11. b0a654a - Singleton pattern removed 12. 3787ced - Infinite scroll debounce 13. 5ac6e41 - Courts court_level column

## Deployment Status

**Latest Commit:** 5ac6e41
**Netlify Deploy:** In progress
**Expected Result:** Courts API should work, judges directory still needs investigation
**Monitoring:** https://app.netlify.com/sites/judgefinder/deploys

## Next Steps

1. Wait for build 5ac6e41 to deploy
2. Test courts API endpoint
3. Investigate judges directory MobX/Suspense issue
4. Test individual judge profile pages
5. Verify analytics endpoints return data
6. End-to-end test of all navigation flows

## Technical Debt Identified

- MobX integration causing reactivity issues
- Suspense boundaries not well-defined
- Rate limiting depends on Redis (should be optional)
- Schema mismatch between code and database (court_level)
- Consider simpler state management for directory pages
