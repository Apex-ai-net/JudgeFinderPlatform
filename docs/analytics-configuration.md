# Judge Analytics Configuration Guide

## Overview

This guide documents the configuration, behavior, and troubleshooting procedures for the JudgeFinder analytics system. The analytics engine generates AI-powered insights about judicial patterns using case data, statistical analysis, and confidence scoring.

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Sample Size Filtering](#sample-size-filtering)
3. [Cache Behavior](#cache-behavior)
4. [Troubleshooting](#troubleshooting)
5. [Diagnostic Tools](#diagnostic-tools)
6. [Production Deployment Checklist](#production-deployment-checklist)

---

## Environment Variables

### Analytics Sample Size Configuration

These variables control when analytics are displayed to users based on data quality thresholds:

#### `NEXT_PUBLIC_MIN_SAMPLE_SIZE`

- **Type**: Integer
- **Default**: `15`
- **Scope**: Client-side (publicly accessible)
- **Purpose**: Minimum number of cases required to display a metric to users
- **Behavior**:
  - Metrics with fewer cases than this threshold will be hidden from the UI
  - Used by `isBelowSampleThreshold()` function
  - Displayed in UI warnings: "We need at least {MIN_SAMPLE_SIZE} recent cases..."

**Example**:

```bash
NEXT_PUBLIC_MIN_SAMPLE_SIZE=20
```

#### `NEXT_PUBLIC_GOOD_SAMPLE_SIZE`

- **Type**: Integer
- **Default**: `40`
- **Scope**: Client-side (publicly accessible)
- **Purpose**: Threshold for "GOOD" quality tier classification
- **Behavior**:
  - Metrics with sample size >= this value get "GOOD" or "HIGH" quality badges
  - Used in conjunction with confidence scores to determine quality tier
  - Sample size >= `GOOD_SAMPLE_SIZE` + confidence >= 80% = "HIGH" tier

**Example**:

```bash
NEXT_PUBLIC_GOOD_SAMPLE_SIZE=50
```

#### `NEXT_PUBLIC_HIDE_SAMPLE_BELOW_MIN`

- **Type**: Boolean
- **Default**: `true`
- **Scope**: Client-side (publicly accessible)
- **Purpose**: Controls whether low-sample metrics are completely hidden or shown with warnings
- **Accepted Values**:
  - `true`, `1`, `yes`, `y`, `on` → Hide metrics
  - `false`, `0`, `no`, `n`, `off` → Show with warnings
- **Behavior**:
  - When `true`: Metrics below `MIN_SAMPLE_SIZE` are hidden, count shown in banner
  - When `false`: Metrics displayed with "Limited data" overlay

**Example**:

```bash
# Hide metrics below threshold (recommended for production)
NEXT_PUBLIC_HIDE_SAMPLE_BELOW_MIN=true

# Show all metrics with warnings (useful for development)
NEXT_PUBLIC_HIDE_SAMPLE_BELOW_MIN=false
```

---

### Analytics Generation Configuration

These variables control the analytics computation process on the server side:

#### `JUDGE_ANALYTICS_LOOKBACK_YEARS`

- **Type**: Integer
- **Default**: `5`
- **Minimum**: `1`
- **Scope**: Server-side only
- **Purpose**: How many years of historical case data to analyze
- **Behavior**:
  - Filters cases with `filing_date >= (current_date - lookback_years)`
  - Affects the `AnalysisWindow` object passed to analytics functions
  - Shorter lookback = more recent patterns, longer = more comprehensive but potentially stale

**Example**:

```bash
# Analyze last 3 years only (more recent patterns)
JUDGE_ANALYTICS_LOOKBACK_YEARS=3

# Analyze last 10 years (comprehensive but may include outdated patterns)
JUDGE_ANALYTICS_LOOKBACK_YEARS=10
```

#### `JUDGE_ANALYTICS_CASE_LIMIT`

- **Type**: Integer
- **Default**: `1000`
- **Minimum**: `200`
- **Scope**: Server-side only
- **Purpose**: Maximum number of cases to fetch per judge for analytics generation
- **Behavior**:
  - Prevents database overload for judges with 5000+ cases
  - Cases are ordered by `filing_date DESC`, so most recent cases are prioritized
  - 1000 cases provides 95% confidence intervals for statistical analysis
  - Lower values = faster queries but potentially less accurate for high-volume judges

**Example**:

```bash
# Faster queries, good for development
JUDGE_ANALYTICS_CASE_LIMIT=500

# Maximum accuracy for production
JUDGE_ANALYTICS_CASE_LIMIT=2000
```

---

### AI Service Configuration

Analytics generation uses AI models for pattern analysis and natural language processing:

#### `GOOGLE_AI_API_KEY`

- **Type**: String (API key)
- **Required**: Recommended (primary AI provider)
- **Scope**: Server-side only (NEVER expose publicly)
- **Purpose**: Google Gemini API key for AI-enhanced analytics
- **Behavior**:
  - Used by `enhanceAnalyticsWithAI()` function
  - Primary AI provider (more cost-effective than OpenAI)
  - If missing, falls back to OpenAI or statistical-only analysis
  - Format: `AIzaSy...` (starts with AIzaSy)

**Get your key**: https://makersuite.google.com/app/apikey

**Example**:

```bash
GOOGLE_AI_API_KEY=AIzaSyYOUR_GOOGLE_AI_API_KEY_HERE
```

#### `OPENAI_API_KEY`

- **Type**: String (API key)
- **Required**: Optional (fallback AI provider)
- **Scope**: Server-side only (NEVER expose publicly)
- **Purpose**: OpenAI API key as fallback when Google AI is unavailable
- **Behavior**:
  - Used if `GOOGLE_AI_API_KEY` is not set
  - Higher cost per request than Google AI
  - Format: `sk-proj-...` or `sk-...`

**Get your key**: https://platform.openai.com/api-keys

**Example**:

```bash
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_API_KEY_HERE
```

**Note**: If neither AI key is provided, the system will:

1. Generate analytics using statistical analysis only
2. Return lower confidence scores
3. Skip natural language pattern detection
4. Still provide usable metrics but with reduced insights

---

### Redis Cache Configuration

Analytics responses are cached to reduce regeneration costs:

#### `UPSTASH_REDIS_REST_URL`

- **Type**: String (URL)
- **Required**: Yes (required for caching)
- **Scope**: Server-side only
- **Purpose**: Upstash Redis instance URL for caching analytics
- **Format**: `https://YOUR_INSTANCE.upstash.io`

**Get your URL**: https://console.upstash.com/

**Example**:

```bash
UPSTASH_REDIS_REST_URL=https://my-instance-12345.upstash.io
```

#### `UPSTASH_REDIS_REST_TOKEN`

- **Type**: String (authentication token)
- **Required**: Yes (required for caching)
- **Scope**: Server-side only
- **Purpose**: Authentication token for Upstash Redis
- **Format**: Alphanumeric string starting with uppercase letter

**Example**:

```bash
UPSTASH_REDIS_REST_TOKEN=AYourUpstashTokenHere
```

**Cache behavior without Redis**:

- Analytics will regenerate on every request (expensive)
- Database cache still used but slower
- Recommended to always configure Redis for production

---

## Sample Size Filtering

### How It Works

The analytics system uses a three-tier quality system based on sample size and confidence scores:

```typescript
// Quality tier determination
function getQualityTier(sampleSize: number, confidence: number): QualityTier {
  if (sampleSize < MIN_SAMPLE_SIZE) {
    return 'LOW' // Hidden by default
  }

  if (sampleSize >= GOOD_SAMPLE_SIZE && confidence >= 80) {
    return 'HIGH' // Green badge, high confidence
  }

  if (confidence >= 70) {
    return 'GOOD' // Blue badge, reliable
  }

  return sampleSize >= MIN_SAMPLE_SIZE ? 'GOOD' : 'LOW'
}
```

### Quality Tiers

| Tier     | Sample Size    | Confidence | Badge Color   | Meaning                                    |
| -------- | -------------- | ---------- | ------------- | ------------------------------------------ |
| **LOW**  | < 15 (default) | Any        | Yellow/Hidden | Not enough data, hidden from users         |
| **GOOD** | >= 15          | >= 70%     | Blue          | Reliable estimate based on sufficient data |
| **HIGH** | >= 40          | >= 80%     | Green         | High confidence, large sample size         |

### UI Behavior by Tier

**LOW Quality (Below Threshold)**:

- Metric is completely hidden from the judge profile
- Banner displayed: "{N} metrics hidden — fewer than 15 recent decisions"
- User prompt: "Request data update" button shown
- Alternative message in metric slot: "Not enough recent decisions to display this estimate yet"

**GOOD Quality**:

- Metric displayed with full slider visualization
- Blue "Good confidence" badge shown
- Sample size (n=X) displayed in provenance footer
- Confidence percentage shown (e.g., "Good confidence · 75%")

**HIGH Quality**:

- Metric displayed with full slider visualization
- Green "High confidence" badge shown
- Larger sample size emphasized in UI
- Highest credibility indicators

---

### Why Metrics Might Be Hidden

Metrics are hidden when:

1. **Insufficient sample size**: Fewer than `NEXT_PUBLIC_MIN_SAMPLE_SIZE` cases (default 15)
2. **Recent judge appointment**: Judge has fewer than required cases in the lookback window
3. **Specific case type scarcity**:
   - Example: Judge has 100 total cases but only 8 family law cases
   - Civil metrics shown, family metrics hidden
4. **Data sync lag**: Cases not yet imported from CourtListener
5. **Sealed or confidential cases**: Cases excluded from public analytics

### Configuration Examples

**Conservative (High Quality Standards)**:

```bash
NEXT_PUBLIC_MIN_SAMPLE_SIZE=30
NEXT_PUBLIC_GOOD_SAMPLE_SIZE=60
NEXT_PUBLIC_HIDE_SAMPLE_BELOW_MIN=true
```

- Hides more metrics
- Only displays highly reliable data
- Best for legal professionals requiring high confidence

**Balanced (Default)**:

```bash
NEXT_PUBLIC_MIN_SAMPLE_SIZE=15
NEXT_PUBLIC_GOOD_SAMPLE_SIZE=40
NEXT_PUBLIC_HIDE_SAMPLE_BELOW_MIN=true
```

- Standard production configuration
- Good balance of coverage and reliability

**Permissive (Show More Data)**:

```bash
NEXT_PUBLIC_MIN_SAMPLE_SIZE=10
NEXT_PUBLIC_GOOD_SAMPLE_SIZE=25
NEXT_PUBLIC_HIDE_SAMPLE_BELOW_MIN=false
```

- Shows more metrics with warnings
- Useful for development or research
- Not recommended for public-facing production

---

## Cache Behavior

The analytics system implements a three-tier caching strategy to minimize regeneration costs:

### Cache Architecture

```
Request → Redis Cache (90 days) → Database Cache (indefinite) → Generate Analytics
            ↓ HIT                    ↓ HIT                          ↓ MISS
         Return cached            Return cached                  Compute + Cache
```

### Cache Layers

#### 1. Redis Cache (L1 - Fastest)

- **Location**: Upstash Redis
- **TTL**: 90 days (7,776,000 seconds)
- **Key Format**: `judge:analytics:{judgeId}`
- **Purpose**: Fast edge cache to prevent repeated database queries
- **Behavior**:
  - Checked first on every request
  - Returns immediately if hit (< 50ms response time)
  - Stores both analytics data and `created_at` timestamp

**Code Reference** (`app/api/judges/[id]/analytics/route.ts` lines 44-55):

```typescript
const redisKey = `judge:analytics:${judgeKey}`
const cachedRedis = await redisGetJSON<{ analytics: CaseAnalytics; created_at: string }>(redisKey)
if (cachedRedis) {
  return NextResponse.json({
    analytics: cachedRedis.analytics,
    cached: true,
    data_source: 'redis_cache',
    last_updated: cachedRedis.created_at,
  })
}
```

#### 2. Database Cache (L2 - Persistent)

- **Location**: Supabase `judge_analytics_cache` table or `judges.case_analytics` column
- **TTL**: Indefinite (permanent until manually refreshed)
- **Purpose**: Persistent storage to prevent AI regeneration costs
- **Behavior**:
  - Checked if Redis cache misses
  - Never expires automatically (cost protection)
  - Updated only via force refresh or new analytics generation

**Code Reference** (`lib/analytics/cache.ts`):

```typescript
export async function getCachedAnalytics(supabase: any, judgeId: string) {
  // Try judge_analytics_cache table first
  const { data: cacheData } = await supabase
    .from('judge_analytics_cache')
    .select('analytics, created_at')
    .eq('judge_id', judgeId)
    .single()

  // Fallback to judges.case_analytics column
  if (!cacheData) {
    const { data: judgeData } = await supabase
      .from('judges')
      .select('case_analytics, updated_at')
      .eq('id', judgeId)
      .single()
    return judgeData?.case_analytics
  }

  return cacheData?.analytics
}
```

#### 3. Analytics Generation (L3 - Most Expensive)

- **Trigger**: Cache miss on both Redis and database
- **Process**:
  1. Fetch up to `JUDGE_ANALYTICS_CASE_LIMIT` cases from database
  2. Run statistical analysis (`analyzeJudicialPatterns`)
  3. Enhance with AI if API keys available (`enhanceAnalyticsWithAI`)
  4. Cache results in both Redis and database
- **Cost**:
  - Database query: ~500-2000ms
  - AI processing: ~3-10 seconds per judge
  - API costs: $0.01-0.05 per generation (with Google AI)

---

### Cache Invalidation Strategy

**Indefinite Caching** (Current Behavior):

- Analytics cached permanently until explicitly refreshed
- Rationale: Prevents runaway AI costs from repeated regeneration
- Trade-off: May show stale data for judges with recent new cases

**When Cache is Updated**:

1. **Manual Force Refresh**: Admin triggers `POST /api/judges/{id}/analytics?force=true`
2. **New Judge**: First analytics request generates and caches
3. **Data Sync**: Weekly sync job can trigger regeneration for flagged judges

---

### Force Refresh Analytics

To regenerate analytics and clear cache:

**API Endpoint**:

```http
POST /api/judges/{judgeId}/analytics?force=true
Authorization: Bearer {admin_token}
```

**Behavior**:

1. Deletes entry from `judge_analytics_cache` table
2. Clears Redis cache key `judge:analytics:{judgeId}` (implicitly via regeneration)
3. Fetches fresh case data from database
4. Regenerates analytics with current AI models
5. Caches new results in both Redis and database

**Example using cURL**:

```bash
curl -X POST \
  "https://judgefinder.io/api/judges/judge_abc123/analytics?force=true" \
  -H "Authorization: Bearer your_admin_token"
```

**Response**:

```json
{
  "message": "Analytics refreshed successfully",
  "analytics": {
    "civil_plaintiff_favor": 62,
    "confidence_civil": 85,
    "sample_size_civil": 47
    // ... other metrics
  }
}
```

---

### Cache Monitoring

**Response Headers** indicate cache status:

```typescript
{
  "analytics": { /* ... */ },
  "cached": true,               // true = cache hit, false = fresh generation
  "data_source": "redis_cache", // "redis_cache" | "database_cache" | "case_analysis"
  "last_updated": "2025-10-09T14:23:45Z",
  "document_count": 847         // Number of cases analyzed (only if freshly generated)
}
```

**Data Source Values**:

- `redis_cache`: L1 cache hit (fastest)
- `database_cache`: L2 cache hit (fast)
- `case_analysis`: Fresh generation from case data (slow, expensive)
- `profile_estimation`: Fallback generic estimates (no case data available)

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: "Analytics withheld for now" Message

**Symptom**:

```
Analytics withheld for now
We need at least 15 recent cases to display these analytics. Fresh data is
queued and the dashboard updates automatically once the sample size clears the threshold.
```

**Causes**:

1. Judge has fewer than `NEXT_PUBLIC_MIN_SAMPLE_SIZE` cases in the lookback window
2. All metrics for this judge have low sample sizes (< threshold)
3. Cases not yet synced from CourtListener

**Diagnosis**:

```bash
# Check judge's total case count
curl "https://judgefinder.io/api/judges/{judgeId}" | jq '.total_cases'

# Check analytics response for sample sizes
curl "https://judgefinder.io/api/judges/{judgeId}/analytics" | jq '.analytics.sample_size_*'
```

**Solutions**:

**A. Lower the sample size threshold** (temporary):

```bash
# .env.local or environment variables
NEXT_PUBLIC_MIN_SAMPLE_SIZE=10
```

**B. Trigger data sync for this judge**:

```bash
# Use admin sync endpoint
curl -X POST "https://judgefinder.io/api/sync/judges" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"judgeId": "judge_abc123"}'
```

**C. Increase lookback window** (if judge has older cases):

```bash
# Analyze more years of historical data
JUDGE_ANALYTICS_LOOKBACK_YEARS=10
```

**D. Force refresh analytics** (if cases exist but analytics stale):

```bash
curl -X POST "https://judgefinder.io/api/judges/{judgeId}/analytics?force=true" \
  -H "Authorization: Bearer {admin_token}"
```

---

#### Issue 2: "No analytics available" Message

**Symptom**:

```
No analytics available
Insufficient case data to generate meaningful analytics for Judge Smith.
```

**Causes**:

1. Judge has zero cases in database
2. Judge record exists but no associated cases
3. Cases exist but all outside the lookback window
4. Database connection error prevented case fetching

**Diagnosis**:

```sql
-- Check if judge exists
SELECT id, name, total_cases FROM judges WHERE id = 'judge_abc123';

-- Check case count for judge
SELECT COUNT(*) FROM cases WHERE judge_id = 'judge_abc123';

-- Check cases within lookback window
SELECT COUNT(*) FROM cases
WHERE judge_id = 'judge_abc123'
  AND filing_date >= (CURRENT_DATE - INTERVAL '5 years');
```

**Solutions**:

**A. Import cases from CourtListener**:

```bash
# Trigger CourtListener sync for this judge
curl -X POST "https://judgefinder.io/api/sync/decisions" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"judgeId": "judge_abc123", "fullSync": true}'
```

**B. Check if judge is newly appointed**:

- If appointed < 1 year ago, may legitimately have insufficient cases
- Consider lowering `JUDGE_ANALYTICS_LOOKBACK_YEARS` to 1 for new judges

**C. Verify judge-case associations**:

```sql
-- Find cases that might belong to this judge
SELECT id, case_number, judge_name FROM cases
WHERE judge_name ILIKE '%Smith%'
  AND judge_id IS NULL;

-- Fix associations if found
UPDATE cases
SET judge_id = 'judge_abc123'
WHERE judge_name ILIKE '%John Smith%'
  AND judge_id IS NULL;
```

---

#### Issue 3: Stale Cached Data

**Symptom**:

- Analytics show old dates (e.g., "Last updated: 90 days ago")
- New cases imported but analytics unchanged
- Confidence scores or sample sizes seem outdated

**Causes**:

1. Analytics cached indefinitely (by design for cost control)
2. No automatic cache invalidation on new case imports
3. Redis cache serving old data

**Diagnosis**:

```bash
# Check cache timestamps
curl "https://judgefinder.io/api/judges/{judgeId}/analytics" | jq '{
  cached: .cached,
  data_source: .data_source,
  last_updated: .last_updated,
  generated_at: .analytics.generated_at
}'

# Check Redis cache directly (requires admin access)
curl "https://judgefinder.io/api/admin/cache/inspect?key=judge:analytics:{judgeId}"
```

**Solutions**:

**A. Force refresh single judge** (immediate):

```bash
curl -X POST "https://judgefinder.io/api/judges/{judgeId}/analytics?force=true" \
  -H "Authorization: Bearer {admin_token}"
```

**B. Warm analytics cache for multiple judges** (bulk operation):

```bash
curl -X POST "https://judgefinder.io/api/admin/warm-analytics" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "jurisdiction": "CA",
    "limit": 100,
    "force": true,
    "concurrency": 5
  }'
```

**C. Clear Redis cache manually** (nuclear option):

```bash
# Requires direct Redis access via Upstash console or CLI
redis-cli DEL "judge:analytics:{judgeId}"
```

**D. Adjust cache policy** (code change required):

```typescript
// In app/api/judges/[id]/analytics/route.ts
// Change line 132 from indefinite (90 days) to shorter TTL
await redisSetJSON(
  redisKey,
  { analytics, created_at: new Date().toISOString() },
  60 * 60 * 24 * 7 // 7 days instead of 90
)
```

---

#### Issue 4: Generic Estimates vs Real Analytics

**Symptom**:

- All metrics show round numbers (e.g., 50%, 55%, 60%)
- Low confidence scores across the board (< 60%)
- `data_source` shows `"profile_estimation"`
- Banner: "Limited evidence" or "LOW quality"

**Causes**:

1. No cases found for judge (falls back to `generateLegacyAnalytics`)
2. AI enhancement failed, falling back to conservative estimates
3. Cases exist but failed to parse outcomes (poor data quality)

**Diagnosis**:

```bash
# Check data source in response
curl "https://judgefinder.io/api/judges/{judgeId}/analytics" | jq '{
  data_source: .data_source,
  document_count: .document_count,
  analysis_quality: .analytics.analysis_quality,
  notable_patterns: .analytics.notable_patterns
}'

# If data_source = "profile_estimation", check case count
curl "https://judgefinder.io/api/judges/{judgeId}" | jq '.total_cases'
```

**Solutions**:

**A. Import case data** (if missing):

```bash
# Sync cases from CourtListener
curl -X POST "https://judgefinder.io/api/sync/decisions" \
  -H "Authorization: Bearer {admin_token}" \
  -d '{"judgeId": "{judgeId}", "fullSync": true}'
```

**B. Configure AI API keys** (if missing):

```bash
# Add to .env.local or production environment
GOOGLE_AI_API_KEY=AIzaSy...
# OR
OPENAI_API_KEY=sk-proj-...
```

**C. Check AI enhancement errors** (logs):

```bash
# View application logs for AI failures
# Look for: "AI enhancement failed, using statistical analysis"
tail -f logs/app.log | grep "AI enhancement"
```

**D. Verify case data quality**:

```sql
-- Check if cases have required fields
SELECT
  COUNT(*) as total,
  COUNT(outcome) as with_outcome,
  COUNT(summary) as with_summary,
  COUNT(case_type) as with_case_type
FROM cases
WHERE judge_id = 'judge_abc123';

-- If many missing, update cases with better data
```

---

#### Issue 5: Rate Limit Exceeded

**Symptom**:

```json
{
  "error": "Rate limit exceeded",
  "status": 429
}
```

**Causes**:

1. Too many analytics requests from same IP
2. Default rate limit: 20 requests per minute per judge per IP
3. Aggressive cache warming operations

**Diagnosis**:

```bash
# Check rate limit headers in response
curl -I "https://judgefinder.io/api/judges/{judgeId}/analytics"
# Look for: X-RateLimit-Remaining: 0
```

**Solutions**:

**A. Wait for rate limit window to reset** (1 minute):

```bash
# Rate limits reset after 1 minute
sleep 60
```

**B. Use cache effectively** (prevent repeated requests):

```bash
# First request generates/caches
curl "https://judgefinder.io/api/judges/{judgeId}/analytics"

# Subsequent requests use cache (no rate limit impact)
curl "https://judgefinder.io/api/judges/{judgeId}/analytics"
```

**C. Adjust rate limits** (code change):

```typescript
// In app/api/judges/[id]/analytics/route.ts, line 35
const rl = buildRateLimiter({
  tokens: 20, // Increase to 50 for production
  window: '1 m', // Keep at 1 minute
  prefix: 'api:judge-analytics',
})
```

**D. Use bulk warming endpoint for mass updates**:

```bash
# Bulk endpoint has different rate limits (5 req/min but processes 100+ judges)
curl -X POST "https://judgefinder.io/api/admin/warm-analytics" \
  -H "Authorization: Bearer {admin_token}" \
  -d '{"limit": 100, "concurrency": 5}'
```

---

## Diagnostic Tools

### 1. Environment Summary (Admin Only)

**Endpoint**: `GET /api/admin/env-summary`

**Purpose**: Check current configuration and validate environment variables

**Access**: Requires admin authentication

**Usage**:

```bash
curl "https://judgefinder.io/api/admin/env-summary" \
  -H "Authorization: Bearer {admin_token}" \
  | jq
```

**Response Example**:

```json
{
  "environment": "production",
  "analytics": {
    "min_sample_size": 15,
    "good_sample_size": 40,
    "hide_below_min": true,
    "lookback_years": 5,
    "case_limit": 1000
  },
  "ai_services": {
    "google_ai_configured": true,
    "openai_configured": false
  },
  "cache": {
    "redis_configured": true,
    "redis_url": "https://*****.upstash.io"
  },
  "database": {
    "supabase_configured": true,
    "service_role_available": true
  }
}
```

**Interpretation**:

- All `*_configured: true` means services are ready
- `*_configured: false` indicates missing configuration
- Check `min_sample_size` matches your expectations
- Verify `redis_configured: true` for optimal performance

---

### 2. Warm Analytics (Admin Only)

**Endpoint**: `POST /api/admin/warm-analytics`

**Purpose**: Pre-generate and cache analytics for multiple judges at once

**Access**: Requires admin authentication

**Use Cases**:

- Initial production deployment (warm cache for top judges)
- After bulk case imports (regenerate stale analytics)
- Performance optimization before traffic spike

**Parameters**:

```typescript
{
  limit?: number        // Number of judges to warm (default: 50, max: 200)
  jurisdiction?: string // Filter by jurisdiction (default: 'CA')
  force?: boolean      // Force regeneration even if cached (default: false)
  concurrency?: number // Parallel requests (default: 5, max: 10)
}
```

**Usage Examples**:

**Warm top 50 California judges** (use existing cache):

```bash
curl -X POST "https://judgefinder.io/api/admin/warm-analytics" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 50,
    "jurisdiction": "CA",
    "force": false,
    "concurrency": 5
  }'
```

**Force regenerate top 100 judges** (clear cache):

```bash
curl -X POST "https://judgefinder.io/api/admin/warm-analytics" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 100,
    "jurisdiction": "CA",
    "force": true,
    "concurrency": 5
  }'
```

**Response**:

```json
{
  "success": true,
  "warmed": 95,
  "regenerated": 95,
  "failed": [
    {
      "id": "judge_xyz789",
      "error": "500"
    }
  ],
  "limit": 100,
  "jurisdiction": "CA",
  "took_ms": 185432,
  "timestamp": "2025-10-09T14:45:23Z"
}
```

**Interpretation**:

- `warmed`: Number of judges successfully cached
- `regenerated`: Number of judges that were force refreshed
- `failed`: Array of judges that errored (investigate individually)
- `took_ms`: Total operation time (expect ~2-3 seconds per judge with AI)

---

### 3. Analytics Testing Script

**Location**: `scripts/test-analytics-modules.ts`

**Purpose**: Unit test analytics generation functions without API calls

**Use Cases**:

- Verify analytics logic after code changes
- Test before deployment
- Ensure statistical functions are working correctly

**Usage**:

```bash
# Run directly with ts-node
npx ts-node --transpile-only scripts/test-analytics-modules.ts

# Or via npm script
npm run test:analytics:modules
```

**Output**:

```
✅ Analytics module tests passed
```

**What It Tests**:

1. `analyzeJudicialPatterns()` - Statistical analysis on sample cases
2. `generateLegacyAnalytics()` - Fallback estimation when no cases
3. `generateConservativeAnalytics()` - Conservative estimates for low data
4. Validates output ranges (0-100 for percentages)
5. Validates required fields (confidence, sample_size, notable_patterns)

**Troubleshooting Test Failures**:

```bash
# If test fails, check error output
npx ts-node --transpile-only scripts/test-analytics-modules.ts 2>&1 | tee test-results.log

# Common issues:
# - Missing dependencies: npm install
# - TypeScript errors: npm run build
# - Logic errors: Check lib/analytics/statistical.ts
```

---

### 4. Direct API Inspection

**Check Individual Judge Analytics**:

```bash
# Get analytics with full response metadata
curl "https://judgefinder.io/api/judges/{judgeId}/analytics" | jq '{
  cached: .cached,
  data_source: .data_source,
  last_updated: .last_updated,
  total_cases: .analytics.total_cases_analyzed,
  overall_confidence: .analytics.overall_confidence,
  sample_sizes: {
    civil: .analytics.sample_size_civil,
    custody: .analytics.sample_size_custody,
    criminal: .analytics.sample_size_sentencing
  }
}'
```

**Check Judge Profile**:

```bash
# Get judge metadata
curl "https://judgefinder.io/api/judges/{judgeId}" | jq '{
  id: .id,
  name: .name,
  total_cases: .total_cases,
  court_name: .court_name,
  jurisdiction: .jurisdiction,
  status: .status
}'
```

**Check Cache Hit Rates** (requires Redis access):

```bash
# Via Upstash CLI or console
redis-cli INFO stats | grep keyspace_hits
redis-cli INFO stats | grep keyspace_misses

# Calculate hit rate
hit_rate = keyspace_hits / (keyspace_hits + keyspace_misses)
```

---

### 5. Database Queries for Analytics Health

**Count judges with analytics**:

```sql
SELECT
  COUNT(*) as total_judges,
  COUNT(case_analytics) as judges_with_analytics,
  ROUND(100.0 * COUNT(case_analytics) / COUNT(*), 2) as coverage_pct
FROM judges
WHERE jurisdiction = 'CA';
```

**Find judges needing analytics refresh**:

```sql
SELECT
  j.id,
  j.name,
  j.total_cases,
  jac.created_at as analytics_age
FROM judges j
LEFT JOIN judge_analytics_cache jac ON j.id = jac.judge_id
WHERE j.total_cases > 50
  AND (jac.created_at IS NULL OR jac.created_at < NOW() - INTERVAL '90 days')
ORDER BY j.total_cases DESC
LIMIT 50;
```

**Analyze sample size distribution**:

```sql
SELECT
  CASE
    WHEN (case_analytics->>'sample_size_civil')::int < 15 THEN 'LOW'
    WHEN (case_analytics->>'sample_size_civil')::int < 40 THEN 'GOOD'
    ELSE 'HIGH'
  END as quality_tier,
  COUNT(*) as judge_count
FROM judges
WHERE case_analytics IS NOT NULL
  AND case_analytics->>'sample_size_civil' IS NOT NULL
GROUP BY quality_tier
ORDER BY quality_tier;
```

---

## Production Deployment Checklist

Use this checklist to ensure analytics are properly configured before going live:

### Pre-Deployment Configuration

- [ ] **Environment Variables Set**
  - [ ] `NEXT_PUBLIC_MIN_SAMPLE_SIZE` configured (recommended: 15-20)
  - [ ] `NEXT_PUBLIC_GOOD_SAMPLE_SIZE` configured (recommended: 40-50)
  - [ ] `NEXT_PUBLIC_HIDE_SAMPLE_BELOW_MIN=true` (hide low-quality metrics)
  - [ ] `JUDGE_ANALYTICS_LOOKBACK_YEARS` configured (recommended: 3-5)
  - [ ] `JUDGE_ANALYTICS_CASE_LIMIT` configured (recommended: 1000-2000)

- [ ] **AI Services Configured**
  - [ ] `GOOGLE_AI_API_KEY` set (primary AI provider)
  - [ ] `OPENAI_API_KEY` set (fallback, optional)
  - [ ] Test AI generation with sample judge:
    ```bash
    curl -X POST "https://yourapp.com/api/judges/sample_judge/analytics?force=true"
    ```

- [ ] **Redis Cache Configured**
  - [ ] `UPSTASH_REDIS_REST_URL` set
  - [ ] `UPSTASH_REDIS_REST_TOKEN` set
  - [ ] Test Redis connection:
    ```bash
    curl "https://yourapp.com/api/admin/env-summary" | jq '.cache.redis_configured'
    # Should return: true
    ```

- [ ] **Database Verified**
  - [ ] `judge_analytics_cache` table exists
  - [ ] `judges.case_analytics` column exists
  - [ ] Row-level security policies configured
  - [ ] Indexes on `judge_id` and `created_at`

### Pre-Launch Testing

- [ ] **Run Analytics Tests**

  ```bash
  npm run test:analytics:modules
  # Should pass all tests
  ```

- [ ] **Generate Test Analytics**

  ```bash
  # Test with 5 sample judges
  curl -X POST "https://yourapp.com/api/admin/warm-analytics" \
    -d '{"limit": 5, "force": true}' | jq '.success'
  # Should return: true
  ```

- [ ] **Verify Cache Behavior**
  - [ ] First request generates analytics (slow, `cached: false`)
  - [ ] Second request uses cache (fast, `cached: true`)
  - [ ] Redis cache returns within 100ms
  - [ ] Database cache returns within 500ms

- [ ] **Check Sample Size Filtering**
  - [ ] Metrics below threshold are hidden
  - [ ] Banner shows correct hidden count
  - [ ] "Request data update" button appears for low-quality judges
  - [ ] Quality badges display correctly (LOW/GOOD/HIGH)

- [ ] **Test Force Refresh**
  ```bash
  curl -X POST "https://yourapp.com/api/judges/{test_judge}/analytics?force=true"
  # Should regenerate successfully
  ```

### Launch Day

- [ ] **Warm Analytics Cache**

  ```bash
  # Warm top 200 California judges
  curl -X POST "https://yourapp.com/api/admin/warm-analytics" \
    -d '{"limit": 200, "jurisdiction": "CA", "concurrency": 10}'
  ```

- [ ] **Monitor Initial Performance**
  - [ ] Check cache hit rate (should be > 95% after warmup)
  - [ ] Monitor API response times (< 500ms with cache)
  - [ ] Watch for rate limit errors (adjust if needed)
  - [ ] Track AI API costs (should be minimal with caching)

- [ ] **Set Up Monitoring**
  - [ ] Configure Sentry for error tracking
  - [ ] Set up analytics regeneration alerts
  - [ ] Monitor Redis memory usage
  - [ ] Track database query performance

### Post-Launch

- [ ] **Weekly Maintenance**
  - [ ] Review failed analytics generations
  - [ ] Refresh analytics for judges with new cases
  - [ ] Monitor sample size distribution
  - [ ] Check for stale cache entries (> 90 days old)

- [ ] **Monthly Reviews**
  - [ ] Analyze AI API costs and adjust providers if needed
  - [ ] Review sample size thresholds based on user feedback
  - [ ] Audit analytics quality and confidence scores
  - [ ] Update documentation for any configuration changes

- [ ] **Incident Response Plan**
  - [ ] Document rollback procedure
  - [ ] Prepare fallback to statistical-only analysis
  - [ ] Have Redis flush procedure ready
  - [ ] Know how to disable analytics generation temporarily

---

## Configuration Examples by Environment

### Development

**Goal**: Fast iteration, see all metrics, minimal caching

```bash
# .env.local
NEXT_PUBLIC_MIN_SAMPLE_SIZE=5
NEXT_PUBLIC_GOOD_SAMPLE_SIZE=15
NEXT_PUBLIC_HIDE_SAMPLE_BELOW_MIN=false
JUDGE_ANALYTICS_LOOKBACK_YEARS=1
JUDGE_ANALYTICS_CASE_LIMIT=200

# Use local Redis or skip caching
UPSTASH_REDIS_REST_URL=http://localhost:6379
UPSTASH_REDIS_REST_TOKEN=local

# Use cheaper AI or skip AI entirely
GOOGLE_AI_API_KEY=your_test_key
```

### Staging

**Goal**: Production-like configuration, test cache behavior

```bash
# Netlify environment variables
NEXT_PUBLIC_MIN_SAMPLE_SIZE=15
NEXT_PUBLIC_GOOD_SAMPLE_SIZE=40
NEXT_PUBLIC_HIDE_SAMPLE_BELOW_MIN=true
JUDGE_ANALYTICS_LOOKBACK_YEARS=3
JUDGE_ANALYTICS_CASE_LIMIT=1000

# Use production Redis
UPSTASH_REDIS_REST_URL=https://staging-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=staging_token

# Use production AI
GOOGLE_AI_API_KEY=your_production_key
```

### Production

**Goal**: High quality, cost-effective, reliable caching

```bash
# Netlify environment variables
NEXT_PUBLIC_MIN_SAMPLE_SIZE=15
NEXT_PUBLIC_GOOD_SAMPLE_SIZE=40
NEXT_PUBLIC_HIDE_SAMPLE_BELOW_MIN=true
JUDGE_ANALYTICS_LOOKBACK_YEARS=5
JUDGE_ANALYTICS_CASE_LIMIT=1000

# Production Redis with high memory
UPSTASH_REDIS_REST_URL=https://prod-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=prod_token

# Production AI with fallback
GOOGLE_AI_API_KEY=your_production_key
OPENAI_API_KEY=your_fallback_key
```

---

## Additional Resources

- **Analytics Implementation**: `lib/analytics/statistical.ts`
- **Cache Layer**: `lib/analytics/cache.ts`
- **Configuration**: `lib/analytics/config.ts`
- **API Route**: `app/api/judges/[id]/analytics/route.ts`
- **UI Component**: `components/judges/AnalyticsSliders.tsx`
- **Methodology Page**: `app/docs/methodology/page.tsx`

---

## Support

For issues not covered in this guide:

1. Check application logs for detailed error messages
2. Run diagnostic tools to identify configuration issues
3. Review sample sizes and confidence scores for affected judges
4. Test with force refresh to rule out stale cache
5. Contact development team with diagnostic output

**Common Log Patterns**:

```bash
# Analytics generation success
"Generating analytics from cases" { judgeName: "...", caseCount: 847 }

# Cache hit
"Using cached analytics (indefinite cache)" { judgeId: "..." }

# AI enhancement failure (falls back to statistical)
"AI enhancement failed, using statistical analysis"

# Low sample size
"sample_size_civil: 8" # Below threshold of 15
```

---

_Last updated: 2025-10-09_
_Version: 1.0_
