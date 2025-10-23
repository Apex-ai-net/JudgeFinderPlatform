# Judicial Elections Feature - Implementation Guide

**Version**: 1.0.0
**Last Updated**: 2025-10-22
**Audience**: Developers, DevOps Engineers, Database Administrators

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Environment Configuration](#environment-configuration)
4. [Data Sync Procedures](#data-sync-procedures)
5. [Component Integration](#component-integration)
6. [API Deployment](#api-deployment)
7. [Testing Checklist](#testing-checklist)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Rollback Procedures](#rollback-procedures)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Skills

- PostgreSQL database administration
- Next.js/React development
- TypeScript
- Supabase CLI usage
- Git version control

### Required Tools

```bash
# Node.js (v20 or higher)
node --version  # Should be >= 20.0.0

# npm (v10 or higher)
npm --version   # Should be >= 10.0.0

# Supabase CLI (optional but recommended)
npx supabase --version

# Git
git --version
```

### Required Access

- Supabase project admin access
- CourtListener API key ([courtlistener.com](https://www.courtlistener.com))
- Repository write access (for deployments)
- Netlify admin access (for production deployments)

---

## Database Setup

### Step 1: Run Base Migration

The election tables migration is located at:
`/supabase/migrations/20250122_001_add_election_tables.sql`

#### Option A: Via Supabase Dashboard

1. Navigate to SQL Editor in Supabase dashboard
2. Open the migration file:
   ```bash
   cat supabase/migrations/20250122_001_add_election_tables.sql
   ```
3. Copy entire contents
4. Paste into SQL Editor
5. Click "RUN"
6. Verify success (should see "Success. No rows returned")

#### Option B: Via Supabase CLI

```bash
# Navigate to project root
cd /path/to/JudgeFinderPlatform

# Link to your Supabase project (if not already linked)
npx supabase link --project-ref your-project-ref

# Push migration
npx supabase db push

# Verify migration applied
npx supabase db list
```

### Step 2: Run Political Affiliation Migration

Migration file: `/supabase/migrations/20251122_001_add_political_affiliation.sql`

```bash
# Via dashboard: Copy and paste SQL
# Via CLI:
npx supabase db push
```

This adds:
- `political_affiliation` column to `judges` table
- Index on `political_affiliation`
- `political_affiliation_stats` view for analytics

### Step 3: Verify Schema

Run verification queries to ensure tables created successfully:

```sql
-- Check judges table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'judges'
  AND column_name IN (
    'selection_method',
    'current_term_end_date',
    'next_election_date',
    'is_elected',
    'current_political_party',
    'political_affiliation'
  )
ORDER BY column_name;

-- Should return 6 rows

-- Check new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'judge_elections',
    'judge_election_opponents',
    'judge_political_affiliations'
  )
ORDER BY table_name;

-- Should return 3 rows

-- Check RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN (
  'judge_elections',
  'judge_election_opponents',
  'judge_political_affiliations'
)
ORDER BY tablename, policyname;

-- Should return 6 rows (2 policies per table)
```

### Step 4: Verify Indexes

```sql
-- Check performance indexes
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'judges',
    'judge_elections',
    'judge_election_opponents',
    'judge_political_affiliations'
  )
  AND indexname LIKE '%election%' OR indexname LIKE '%political%'
ORDER BY tablename, indexname;

-- Verify at least 15 indexes created
```

### Step 5: Test Helper Functions

```sql
-- Test get_latest_election function (should return NULL for judges without elections)
SELECT * FROM get_latest_election('00000000-0000-0000-0000-000000000000');

-- Test get_current_political_affiliation (should return 'unknown')
SELECT get_current_political_affiliation('00000000-0000-0000-0000-000000000000');

-- Both should complete without errors
```

---

## Environment Configuration

### Step 1: CourtListener API Key

1. Sign up at [courtlistener.com](https://www.courtlistener.com)
2. Navigate to Account Settings > API Access
3. Generate new API token
4. Copy token (it won't be shown again)

### Step 2: Add Environment Variables

#### Local Development (`.env.local`)

```bash
# Add to .env.local (create if doesn't exist)
COURTLISTENER_API_KEY=your_api_key_here
```

#### Production (Netlify)

1. Navigate to Netlify dashboard
2. Site Settings > Environment variables
3. Add variable:
   - **Key**: `COURTLISTENER_API_KEY`
   - **Value**: Your API key
   - **Scopes**: All (Production, Deploy Previews, Branch deploys)
4. Click "Save"

### Step 3: Verify Environment

```bash
# Local test
npm run test:political-api

# Expected output:
# ✓ CourtListener API connection successful
# ✓ Sample political affiliation data retrieved
# Sample response: {...}
```

---

## Data Sync Procedures

### Initial Political Affiliation Sync

#### Step 1: Test with Small Batch

```bash
# Sync first 10 judges only (safety check)
npm run sync:political -- --limit=10

# Monitor output for errors
# Expected duration: ~30 seconds
```

**Expected Output**:
```
🎉 Political Affiliation Sync
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mode: Only missing data
Judges to process: 10
Estimated time: 0.5 minutes

Processing batch 1/1...
  ✓ Judge Smith: Republican Party (2020-present)
  ✓ Judge Jones: Democratic Party (2018-present)
  ⏭ Judge Brown: No affiliation data
  ...

📊 SYNC COMPLETE
✅ Success: true
📝 Processed: 10 judges
✏️  Updated: 7 judges
⏭️  Skipped: 3 judges (no data)
```

#### Step 2: Full Sync (Production)

**Important**: Schedule during off-peak hours (2-4 AM PT recommended)

```bash
# Full sync of all judges with missing political affiliation data
npm run sync:political

# Estimated duration: 60-90 minutes for ~1,600 judges
# Rate: ~24 judges/minute (well under CourtListener's 5,000/hour limit)
```

**Monitoring**:
- Keep terminal window open to monitor progress
- Watch for repeated errors (may indicate API issues)
- Note final statistics for documentation

**Production Tip**: Use `screen` or `tmux` for long-running syncs:
```bash
# Start screen session
screen -S political-sync

# Run sync
npm run sync:political

# Detach with Ctrl+A, D
# Re-attach later with: screen -r political-sync
```

#### Step 3: Verify Sync Results

```sql
-- Check how many judges now have political affiliation
SELECT
  COUNT(*) FILTER (WHERE political_affiliation IS NOT NULL) as with_affiliation,
  COUNT(*) FILTER (WHERE political_affiliation IS NULL) as without_affiliation,
  COUNT(*) as total
FROM judges
WHERE courtlistener_id IS NOT NULL;

-- View party distribution
SELECT * FROM political_affiliation_stats
ORDER BY judge_count DESC;

-- Sample judges with affiliation
SELECT name, court_name, political_affiliation
FROM judges
WHERE political_affiliation IS NOT NULL
LIMIT 10;
```

### Ongoing Sync Schedule

#### Weekly Incremental Sync

For new judges added to the system:

```bash
# Cron job (runs every Sunday at 2 AM)
0 2 * * 0 cd /path/to/JudgeFinderPlatform && npm run sync:political >> /var/log/political-sync.log 2>&1
```

**Netlify Scheduled Function** (recommended):

1. Create `/app/api/cron/weekly-political-sync/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { PoliticalAffiliationSyncManager } from '@/lib/courtlistener/political-affiliation-sync'
import { CourtListenerClient } from '@/lib/courtlistener/client'

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const clClient = new CourtListenerClient()
  const syncManager = new PoliticalAffiliationSyncManager(supabase, clClient)

  const result = await syncManager.syncPoliticalAffiliations({
    skipIfExists: true,  // Only new judges
    batchSize: 10,
    delayMs: 2000
  })

  return NextResponse.json(result)
}
```

2. Configure Netlify scheduled deploy:
   - Dashboard > Site Settings > Build & Deploy > Build hooks
   - Create build hook: "Weekly Political Sync"
   - Add to cron service (e.g., cron-job.org) to trigger weekly

#### Monthly Full Re-sync

To catch party affiliation changes:

```bash
# First Sunday of each month at 3 AM
0 3 1-7 * 0 cd /path/to/JudgeFinderPlatform && npm run sync:political -- --all >> /var/log/political-resync.log 2>&1
```

---

## Component Integration

### Step 1: Add to Judge Profile Pages

Edit `/app/judges/[slug]/page.tsx`:

```typescript
// Add import
import { ElectionInformation } from '@/components/judges/ElectionInformation'
import { SelectionMethod, PoliticalParty } from '@/types/elections'

// In your page component, add to query:
const { data: judge } = await supabase
  .from('judges')
  .select(`
    *,
    selection_method,
    current_term_end_date,
    next_election_date,
    is_elected,
    current_political_party,
    political_affiliation
  `)
  .eq('slug', params.slug)
  .single()

// Fetch election history
const { data: elections } = await supabase
  .from('judge_elections')
  .select('*')
  .eq('judge_id', judge.id)
  .order('election_date', { ascending: false })

// Add to page layout (after bio section, before case statistics):
<ElectionInformation
  judgeId={judge.id}
  selectionMethod={judge.selection_method as SelectionMethod}
  currentTermEndDate={judge.current_term_end_date}
  nextElectionDate={judge.next_election_date}
  electionHistory={elections || []}
  showPoliticalAffiliation={true}
  currentAffiliation={judge.current_political_party as PoliticalParty}
  className="mb-8"
/>
```

### Step 2: Add to Search Results

Edit search result component:

```typescript
import { ElectionBadge } from '@/components/judges/ElectionBadge'

// In judge card component:
<ElectionBadge
  selectionMethod={judge.selection_method}
  nextElectionDate={judge.next_election_date}
  variant="compact"
  className="mt-2"
/>
```

### Step 3: Deploy Elections Landing Page

The `/elections` page is already implemented at `/app/elections/page.tsx`.

**Verify deployment**:
1. Build locally: `npm run build`
2. Start production server: `npm start`
3. Visit: `http://localhost:3000/elections`
4. Check for:
   - Page loads without errors
   - Upcoming elections appear (if any in database)
   - Educational content visible
   - SEO meta tags present (view page source)

---

## API Deployment

### Step 1: Verify API Endpoints

Test locally before deploying:

```bash
# Start dev server
npm run dev

# Test upcoming elections endpoint
curl "http://localhost:3000/api/v1/elections/upcoming?limit=10"

# Should return JSON with structure:
# {
#   "total_count": 0,
#   "elections": [],
#   "next_30_days": 0,
#   "next_90_days": 0,
#   "next_180_days": 0
# }

# Test election statistics
curl "http://localhost:3000/api/v1/elections/statistics"

# Test judge elections endpoint (replace with real UUID)
curl "http://localhost:3000/api/v1/judges/YOUR-JUDGE-UUID/elections"
```

### Step 2: Enable API Key Authentication (Optional)

If you want to require API keys:

```bash
# Add to .env.local and Netlify environment variables
REQUIRE_API_KEY=true
API_KEYS=key1,key2,key3  # Comma-separated list
```

Update API route:
```typescript
// In route.ts files
import { requireApiKeyIfEnabled } from '@/lib/security/api-auth'

export async function GET(request: NextRequest) {
  const auth = requireApiKeyIfEnabled(request.headers, request.url)
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... rest of handler
}
```

### Step 3: Deploy to Production

```bash
# Commit changes
git add .
git commit -m "feat: add judicial elections feature"
git push origin main

# Netlify auto-deploys on push to main
# Monitor deployment: https://app.netlify.com/sites/YOUR-SITE/deploys
```

### Step 4: Verify Production Deployment

```bash
# Test production API
curl "https://judgefinder.io/api/v1/elections/upcoming?limit=5"

# Test elections page
curl -I "https://judgefinder.io/elections"
# Should return 200 OK

# Test judge profile with elections
# (Visit a judge page in browser and verify ElectionInformation component appears)
```

---

## Testing Checklist

### Database Tests

- [ ] All migrations applied successfully
- [ ] No migration errors in Supabase logs
- [ ] All 3 new tables exist
- [ ] All 3 enums created
- [ ] RLS policies active (6 policies total)
- [ ] Indexes created (15+ election-related indexes)
- [ ] Helper functions work without errors
- [ ] Sample data insertion succeeds

### Data Sync Tests

- [ ] CourtListener API connection successful
- [ ] Test sync with 10 judges completes
- [ ] Political affiliation data populates correctly
- [ ] Sync handles missing data gracefully
- [ ] Sync respects rate limits
- [ ] Sync statistics accurate
- [ ] Re-sync doesn't duplicate data
- [ ] Error logging functional

### Component Tests

- [ ] ElectionInformation renders without errors
- [ ] ElectionBadge displays correctly
- [ ] All variants render (minimal, compact, detailed)
- [ ] Political affiliation displays when available
- [ ] Educational content expands/collapses
- [ ] Voter resource links work
- [ ] Tooltips show on hover
- [ ] Keyboard navigation functional
- [ ] Screen reader announces content
- [ ] Responsive on mobile devices

### API Tests

- [ ] `/upcoming` endpoint returns valid JSON
- [ ] Pagination works (`limit`, `offset`)
- [ ] Filters work (jurisdiction, election_type, dates)
- [ ] Rate limiting enforced
- [ ] Cache headers set correctly
- [ ] Error responses formatted properly
- [ ] API key authentication works (if enabled)
- [ ] `/statistics` endpoint returns data
- [ ] `/judges/[id]/elections` endpoint works

### Integration Tests

- [ ] Judge profile page shows election info
- [ ] Search results show election badges
- [ ] Elections landing page loads
- [ ] SEO meta tags present
- [ ] No console errors in browser
- [ ] No 404s or broken links
- [ ] Build completes without TypeScript errors
- [ ] Production deployment successful

### Accessibility Tests

```bash
# Run automated accessibility tests
npm run test:a11y

# Manual checks:
# - Tab through all interactive elements
# - Test with screen reader (NVDA, JAWS, VoiceOver)
# - Verify color contrast (WCAG AA)
# - Test with keyboard only (no mouse)
# - Verify ARIA labels present
```

### Performance Tests

- [ ] Elections page loads in < 3 seconds
- [ ] API responses < 500ms
- [ ] No Lighthouse performance warnings
- [ ] Database queries use indexes
- [ ] No N+1 query issues
- [ ] Images optimized
- [ ] Bundle size acceptable

---

## Monitoring & Maintenance

### Set Up Monitoring

#### 1. Sentry Error Tracking

Errors automatically tracked via existing Sentry integration. Monitor:
- API endpoint errors
- Component render errors
- Database query failures
- Sync script errors

#### 2. Database Query Monitoring

```sql
-- Create monitoring view for election data health
CREATE OR REPLACE VIEW election_data_health AS
SELECT
  (SELECT COUNT(*) FROM judges WHERE next_election_date IS NOT NULL) as judges_with_upcoming_election,
  (SELECT COUNT(*) FROM judge_elections WHERE won IS NULL AND election_date > CURRENT_DATE) as pending_elections,
  (SELECT COUNT(*) FROM judges WHERE political_affiliation IS NOT NULL) as judges_with_political_data,
  (SELECT MAX(created_at) FROM judge_elections) as last_election_added,
  (SELECT MAX(updated_at) FROM judges WHERE political_affiliation IS NOT NULL) as last_political_update;

-- Query weekly to ensure data is fresh
SELECT * FROM election_data_health;
```

#### 3. Sync Job Monitoring

Add logging to sync scripts:

```typescript
// In sync script, add analytics tracking
const result = await syncManager.syncPoliticalAffiliations(options)

// Log to analytics service
await fetch('https://your-analytics-endpoint.com/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event: 'political_affiliation_sync_complete',
    timestamp: new Date().toISOString(),
    judgesProcessed: result.judgesProcessed,
    judgesUpdated: result.judgesUpdated,
    errors: result.errors.length,
    duration: result.duration
  })
})
```

### Maintenance Tasks

#### Weekly

- [ ] Review sync logs for errors
- [ ] Check political_affiliation_stats view for anomalies
- [ ] Verify elections page loading correctly
- [ ] Scan Sentry for new errors

#### Monthly

- [ ] Run full political affiliation re-sync
- [ ] Review database performance
- [ ] Update election data manually if needed
- [ ] Check for new CourtListener API features

#### Quarterly

- [ ] Review and update documentation
- [ ] Audit data quality
- [ ] Plan feature enhancements
- [ ] Review user feedback

---

## Rollback Procedures

### Emergency: Disable Election Features

If critical issues arise, quickly disable without database changes:

#### 1. Hide Components

```typescript
// In judge profile page
const ENABLE_ELECTION_INFO = false  // Feature flag

{ENABLE_ELECTION_INFO && (
  <ElectionInformation {...props} />
)}
```

#### 2. Disable API Endpoints

```typescript
// In API route
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Elections API temporarily unavailable' },
    { status: 503 }
  )
}
```

#### 3. Hide Elections Page

```typescript
// In /app/elections/page.tsx
export default function ElectionsPage() {
  return (
    <div className="container mx-auto py-12">
      <h1>Elections Data Temporarily Unavailable</h1>
      <p>We're making improvements to our election data. Check back soon!</p>
    </div>
  )
}
```

Deploy with:
```bash
git commit -m "fix: temporarily disable elections feature"
git push origin main
```

### Full Rollback: Remove Database Tables

**WARNING**: This deletes all election data. Only use if absolutely necessary.

```sql
-- 1. Drop triggers
DROP TRIGGER IF EXISTS update_judge_elections_updated_at ON judge_elections;
DROP TRIGGER IF EXISTS update_election_opponents_updated_at ON judge_election_opponents;
DROP TRIGGER IF EXISTS update_political_affiliations_updated_at ON judge_political_affiliations;
DROP TRIGGER IF EXISTS sync_political_party_to_judge ON judge_political_affiliations;

-- 2. Drop views
DROP VIEW IF EXISTS political_affiliation_stats;

-- 3. Drop tables (cascades to dependent objects)
DROP TABLE IF EXISTS judge_political_affiliations CASCADE;
DROP TABLE IF EXISTS judge_election_opponents CASCADE;
DROP TABLE IF EXISTS judge_elections CASCADE;

-- 4. Remove judges table columns
ALTER TABLE judges DROP COLUMN IF EXISTS selection_method;
ALTER TABLE judges DROP COLUMN IF EXISTS current_term_end_date;
ALTER TABLE judges DROP COLUMN IF EXISTS next_election_date;
ALTER TABLE judges DROP COLUMN IF EXISTS is_elected;
ALTER TABLE judges DROP COLUMN IF EXISTS current_political_party;
ALTER TABLE judges DROP COLUMN IF EXISTS political_affiliation;

-- 5. Drop enums
DROP TYPE IF EXISTS election_type;
DROP TYPE IF EXISTS selection_method;
DROP TYPE IF EXISTS political_party;

-- 6. Drop functions
DROP FUNCTION IF EXISTS get_latest_election(UUID);
DROP FUNCTION IF EXISTS get_current_political_affiliation(UUID);
DROP FUNCTION IF EXISTS calculate_retention_rate(UUID);
DROP FUNCTION IF EXISTS sync_judge_political_party();
DROP FUNCTION IF EXISTS update_updated_at_column();
```

### Partial Rollback: Keep Tables, Remove Data

```sql
-- Remove all election data but keep schema
TRUNCATE judge_political_affiliations CASCADE;
TRUNCATE judge_election_opponents CASCADE;
TRUNCATE judge_elections CASCADE;

-- Clear judges table election fields
UPDATE judges SET
  selection_method = 'unknown',
  current_term_end_date = NULL,
  next_election_date = NULL,
  is_elected = FALSE,
  current_political_party = 'unknown',
  political_affiliation = NULL;
```

---

## Troubleshooting

### Issue: Political Affiliation Sync Fails

**Symptom**: Sync script errors with "Invalid token" or "Rate limit exceeded"

**Solutions**:

1. **Invalid Token**:
   ```bash
   # Verify API key is set
   echo $COURTLISTENER_API_KEY

   # Test API manually
   curl -H "Authorization: Token $COURTLISTENER_API_KEY" \
     "https://www.courtlistener.com/api/rest/v4/political-affiliations/?person=2"

   # If 401 error, regenerate API key at courtlistener.com
   ```

2. **Rate Limit Exceeded**:
   ```bash
   # Check current rate limit status
   curl -I -H "Authorization: Token $COURTLISTENER_API_KEY" \
     "https://www.courtlistener.com/api/rest/v4/political-affiliations/"

   # Look for X-RateLimit-Remaining header

   # Solution: Wait for hourly reset or reduce batch size
   npm run sync:political -- --limit=100  # Smaller batch
   ```

### Issue: Component Not Rendering

**Symptom**: ElectionInformation or ElectionBadge doesn't appear on page

**Solutions**:

1. **Check Props**:
   ```typescript
   // In page component, log props
   console.log('Election props:', {
     judgeId: judge.id,
     selectionMethod: judge.selection_method,
     nextElectionDate: judge.next_election_date
   })

   // Verify selectionMethod is valid enum value
   ```

2. **Check Import Path**:
   ```typescript
   // Correct import
   import { ElectionInformation } from '@/components/judges/ElectionInformation'

   // NOT: '@/components/ElectionInformation' (wrong path)
   ```

3. **Check TypeScript Errors**:
   ```bash
   npm run type-check

   # Fix any errors in election-related components
   ```

### Issue: API Endpoint Returns 500 Error

**Symptom**: `/api/v1/elections/upcoming` returns Internal Server Error

**Solutions**:

1. **Check Netlify Function Logs**:
   - Navigate to Netlify dashboard
   - Deployments > Functions
   - Find `v1-elections-upcoming`
   - View logs for stack trace

2. **Test Locally**:
   ```bash
   npm run dev
   curl "http://localhost:3000/api/v1/elections/upcoming?limit=1"

   # Check terminal for error details
   ```

3. **Verify Database Connection**:
   ```typescript
   // In API route, add logging
   console.log('[Elections API] Fetching elections...')
   const { data, error } = await supabase.from('judge_elections').select('*').limit(1)
   console.log('[Elections API] Result:', { data, error })
   ```

### Issue: Elections Page Shows No Data

**Symptom**: `/elections` page loads but shows "No upcoming elections"

**Solutions**:

1. **Check Database**:
   ```sql
   -- Verify election data exists
   SELECT COUNT(*)
   FROM judge_elections
   WHERE won IS NULL
     AND election_date > CURRENT_DATE;

   -- Should return > 0 if elections in database
   ```

2. **Seed Test Data** (development only):
   ```sql
   -- Add sample upcoming election
   INSERT INTO judge_elections (
     judge_id,
     election_type,
     election_date,
     election_name,
     jurisdiction,
     is_incumbent,
     is_contested
   )
   SELECT
     id,
     'retention',
     CURRENT_DATE + INTERVAL '90 days',
     '2026 Retention Election',
     'California',
     true,
     false
   FROM judges
   WHERE courtlistener_id IS NOT NULL
   LIMIT 5;
   ```

3. **Check API Response**:
   ```bash
   # Direct API test
   curl "https://judgefinder.io/api/v1/elections/upcoming?limit=10"

   # Verify elections array not empty
   ```

### Issue: Political Affiliation Not Syncing

**Symptom**: All judges show "No affiliation data" after sync

**Solutions**:

1. **Verify Column Exists**:
   ```sql
   SELECT column_name
   FROM information_schema.columns
   WHERE table_name = 'judges'
     AND column_name = 'political_affiliation';

   -- Should return 1 row
   ```

2. **Check Sync Logs**:
   ```bash
   # Re-run sync with verbose output
   npm run sync:political -- --limit=5

   # Look for "No political affiliation data found" messages
   # This is normal for some judges
   ```

3. **Manually Test CourtListener API**:
   ```bash
   # Find a judge with known political affiliation
   # Example: Federal judges typically have this data

   curl -H "Authorization: Token $COURTLISTENER_API_KEY" \
     "https://www.courtlistener.com/api/rest/v4/people/?name_last=Roberts&name_first=John"

   # Get person ID from response

   curl -H "Authorization: Token $COURTLISTENER_API_KEY" \
     "https://www.courtlistener.com/api/rest/v4/political-affiliations/?person=PERSON_ID"

   # Should return affiliation data
   ```

---

## Support & Resources

### Internal Documentation

- Feature Overview: `/docs/features/JUDICIAL_ELECTIONS_FEATURE.md`
- Data Sources: `/docs/features/JUDICIAL_ELECTIONS_DATA_SOURCES.md`
- Developer Guide: `/docs/features/JUDICIAL_ELECTIONS_DEVELOPER_GUIDE.md`
- User Guide: `/docs/features/JUDICIAL_ELECTIONS_USER_GUIDE.md`

### External Resources

- CourtListener API Docs: https://www.courtlistener.com/api/rest-info/
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- TypeScript Handbook: https://www.typescriptlang.org/docs/

### Getting Help

1. **Check existing documentation** (above)
2. **Search GitHub issues** for similar problems
3. **Check Sentry** for error stack traces
4. **Review Netlify function logs** for API errors
5. **Contact team lead** for escalation

---

## Post-Deployment Checklist

After completing all implementation steps:

- [ ] All database migrations applied
- [ ] Political affiliation sync completed successfully
- [ ] Components integrated on judge profiles
- [ ] Elections landing page deployed
- [ ] API endpoints tested and functional
- [ ] Monitoring set up (Sentry, logs)
- [ ] Documentation updated
- [ ] Team notified of deployment
- [ ] Stakeholders notified of new feature
- [ ] User feedback mechanism in place
- [ ] Analytics tracking configured
- [ ] SEO verification completed
- [ ] Accessibility audit passed

---

**Implementation Support**: For issues not covered in this guide, contact the technical lead or open a GitHub issue with the `elections-feature` label.

**Document Version**: 1.0.0
**Last Reviewed**: 2025-10-22
