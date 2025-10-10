# Judge Analytics Diagnostics

Comprehensive diagnostic tools for debugging judge analytics issues in production.

## Quick Start

```bash
# Run full diagnostics
npm run diagnose:analytics

# Check a specific judge
npm run diagnose:analytics -- --judge-id abc123-def456-ghi789

# Sample more judges for better accuracy
npm run diagnose:analytics -- --sample-size 25

# Verbose mode with detailed logs
npm run diagnose:analytics -- --verbose
```

## What It Checks

### 1. Environment Variables

- **Required**: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
- **Optional**: `GOOGLE_AI_API_KEY`, `OPENAI_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

### 2. Database Connectivity

- Tests connection to Supabase
- Verifies access to required tables
- Checks `judge_analytics_cache` table schema

### 3. Judge Data Quality

For each judge analyzed:

- Total case count
- Cases with `decision_date` (required for analytics)
- Cases within 5-year lookback window
- Cases with required fields (`outcome`, `summary`, `case_type`)
- Cached analytics status
- Sample sizes per metric (civil, custody, criminal, etc.)

### 4. Redis Connectivity

- Tests read/write operations
- Validates cache functionality
- Reports if caching is unavailable

### 5. Actionable Recommendations

- Prioritized list of issues (HIGH, MEDIUM, LOW)
- Specific commands to fix problems
- Context and details for each issue

## Output Example

```
================================================================================
ENVIRONMENT VARIABLES CHECK
================================================================================

Required Variables
------------------
✓ NEXT_PUBLIC_SUPABASE_URL: https://xy...z123
✓ SUPABASE_SERVICE_ROLE_KEY: eyJhbGci...NiIs
✓ SUPABASE_JWT_SECRET: your-sup...long

Optional Variables (AI & Caching)
----------------------------------
✓ GOOGLE_AI_API_KEY: AIzaSyYO...HERE
✓ UPSTASH_REDIS_REST_URL: https://YO...h.io
⚠ OPENAI_API_KEY: NOT SET (feature may be disabled)

================================================================================
JUDGE ANALYSIS RESULTS
================================================================================

Summary Table
-------------
Judge Name (ID)                    | Total | Decided | Recent | Cached | Issues
------------------------------------------------------------------------------------------
Hon. Jane Smith (abc12345)         |   150 |     145 |    120 |   Yes |      0
Hon. John Doe (def67890)           |    80 |      12 |      8 |    No |      2

Detailed Issues
---------------
Hon. John Doe
  Judge ID: def67890-1234-5678-9abc-def012345678
  Court: Superior Court of California
  Total Cases: 80
  Cases with decision_date: 12
  Cases in 5-year window: 8

  Issues:
    ✗ Only 12 cases with decision_date (need ≥15)
    ✗ Should have analytics but cache is missing

================================================================================
RECOMMENDATIONS
================================================================================

Action Items
------------

1. [HIGH] 5 judges missing analytics cache
   Solution: Run: npm run analytics:generate -- --limit 50
   Details: Or use API: POST /api/judges/[id]/analytics?force=true for each judge

2. [MEDIUM] 3 judges with insufficient decided cases
   Solution: Ensure case sync jobs are populating decision_date field
   Details: Check: npm run sync:decisions or verify CourtListener API
```

## Common Issues and Fixes

### Issue: "Many cases missing decision_date"

**Cause**: Cases imported without decision dates from CourtListener API
**Fix**: Run case sync with decision date population:

```bash
npm run sync:decisions
```

### Issue: "Should have analytics but cache is missing"

**Cause**: Analytics generation hasn't run for this judge
**Fix**: Generate analytics manually:

```bash
# For all eligible judges
npm run analytics:generate

# For specific judge via API
curl -X POST "https://judgefinder.io/api/judges/[id]/analytics?force=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Issue: "Redis connection failed"

**Cause**: Missing or invalid Redis credentials
**Fix**: Configure in Netlify environment variables:

```bash
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

Get credentials from: https://console.upstash.com/

### Issue: "Many cases missing outcome/case_type"

**Cause**: Incomplete data mapping during import
**Fix**: Review and re-run import scripts with improved field mapping:

```bash
npm run sync:judges
npm run sync:decisions
```

## Command Line Options

| Option              | Alias | Description                   | Default     |
| ------------------- | ----- | ----------------------------- | ----------- |
| `--judge-id <uuid>` | `-j`  | Diagnose specific judge by ID | Sample mode |
| `--sample-size <n>` | `-s`  | Number of judges to sample    | 10          |
| `--verbose`         | `-v`  | Show detailed debug info      | false       |
| `--help`            | `-h`  | Show help message             | -           |

## Understanding Analytics Requirements

For a judge to have analytics generated:

1. **Minimum Cases**: ≥15 cases with `decision_date`
2. **Case Fields**: Each case should have:
   - `decision_date` (required)
   - `case_type` (required for categorization)
   - `outcome` (used for bias analysis)
   - `summary` or `plain_text` (used for AI analysis)
3. **Recency**: Ideally ≥10 cases within 5-year window
4. **Distribution**: Cases across multiple categories for comprehensive metrics

## Sample Sizes Per Metric

The analytics system tracks sample sizes for each metric:

| Metric                | Minimum Sample | Ideal Sample |
| --------------------- | -------------- | ------------ |
| Civil Plaintiff Favor | 5              | 15+          |
| Child Custody         | 5              | 15+          |
| Alimony Decisions     | 3              | 10+          |
| Contract Enforcement  | 5              | 15+          |
| Criminal Sentencing   | 8              | 20+          |
| Plea Acceptance       | 5              | 15+          |

Low sample sizes result in lower confidence scores.

## Integration with Other Tools

### Check Data Status

```bash
npm run data:status
```

Shows overall platform statistics and data quality.

### Batch Generate Analytics

```bash
npm run analytics:generate -- --limit 50 --concurrency 2
```

Generate analytics for multiple judges with cost control.

### Database Integrity Check

```bash
npm run integrity:full
```

Comprehensive database validation including relationships and constraints.

## Production Debugging Workflow

1. **Run Diagnostics**

   ```bash
   npm run diagnose:analytics
   ```

2. **Identify Issues**
   Review the output for judges with problems

3. **Fix Data Quality**

   ```bash
   npm run sync:decisions  # Populate missing decision dates
   ```

4. **Regenerate Analytics**

   ```bash
   npm run analytics:generate -- --limit 20
   ```

5. **Verify Resolution**

   ```bash
   npm run diagnose:analytics -- --judge-id [specific-id]
   ```

6. **Monitor Production**
   Check Netlify logs and Sentry for runtime errors

## Cost Considerations

The diagnostic tool itself has **zero AI cost** - it only queries the database and caches.

However, be aware of costs when following recommendations:

- `npm run analytics:generate`: Uses AI (Gemini Flash) - monitor via cost tracker
- Budget limits: $50/day, $500/month as configured in `lib/ai/cost-tracker.ts`

## Support

For issues or questions:

1. Check application logs in Netlify dashboard
2. Review Supabase logs for query errors
3. Test analytics endpoints manually in browser network tab
4. Contact development team with diagnostic output

## Related Documentation

- [Analytics System Overview](../docs/ANALYTICS.md)
- [Environment Setup](../docs/getting-started/ENVIRONMENT.md)
- [Production Deployment](../docs/deployment/PRODUCTION_DEPLOYMENT_SUCCESS.md)
- [Sync and Cron Jobs](../docs/operations/SYNC_AND_CRON.md)
