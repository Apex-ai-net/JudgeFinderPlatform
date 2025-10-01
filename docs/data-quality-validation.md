# Data Quality Validation System

## Overview

The Data Quality Validation System provides comprehensive automated checks for the JudgeFinder database after CourtListener synchronization operations. It detects and helps fix orphaned records, duplicates, stale data, missing fields, and relationship inconsistencies.

## Features

- **Automated Detection**: Identifies 6 types of data quality issues
- **Severity Classification**: Critical, High, Medium, Low priority levels
- **Auto-Fix Capability**: Automatically resolves certain types of issues
- **Detailed Reporting**: Generates comprehensive reports with actionable recommendations
- **Database Integration**: Saves validation history for trend analysis
- **SQL Helper Functions**: Optimized database functions for fast validation

## Architecture

### Components

1. **TypeScript Validator** (`/lib/sync/data-quality-validator.ts`)
   - Main validation engine
   - Issue detection and classification
   - Auto-fix operations
   - Report generation

2. **SQL Functions** (`/supabase/migrations/20250930_004_validation_functions.sql`)
   - Optimized database queries
   - Helper functions for common checks
   - Cleanup operations

3. **Integration Examples** (`/lib/sync/data-quality-validator-integration-example.ts`)
   - Usage patterns
   - Cron job examples
   - Alert integrations

## Validation Checks

### 1. Orphaned Records

**What**: Records that reference non-existent parent records

**Checks**:
- Cases with invalid `judge_id`
- Court assignments with invalid `judge_id` or `court_id`
- Opinions with invalid `case_id`
- Cases with NULL `judge_id` (warning level)

**Severity**: High to Critical
**Auto-fixable**: Yes (sets references to NULL or deletes)

**Example**:
```typescript
// Case referencing deleted judge
{
  type: 'orphaned_record',
  severity: 'high',
  entity: 'case',
  entityId: 'uuid-123',
  message: 'Case "Smith v. Jones" references non-existent judge_id: uuid-456',
  suggestedAction: 'Set judge_id to NULL or find correct judge via courtlistener_id',
  autoFixable: true
}
```

### 2. Duplicate Identifiers

**What**: Multiple records sharing the same unique identifier

**Checks**:
- Duplicate `courtlistener_id` in judges table
- Duplicate `courtlistener_id` in courts table
- Duplicate `docket_number` in cases table

**Severity**: Critical (for CourtListener IDs), Medium (for docket numbers)
**Auto-fixable**: No (requires manual review)

**Example**:
```typescript
{
  type: 'duplicate_identifier',
  severity: 'critical',
  entity: 'judge',
  entityId: 'multiple',
  message: '3 judges share courtlistener_id: 12345',
  suggestedAction: 'Merge duplicate records or invalidate incorrect ones',
  autoFixable: false
}
```

### 3. Stale Data

**What**: Records not updated within expected timeframes

**Checks**:
- Judges not synced in >6 months (with valid `courtlistener_id`)
- Courts not refreshed in >1 year
- Cases from >2 years ago with no recent updates

**Severity**: Low to Medium
**Auto-fixable**: Yes (queues for resync)

**Thresholds**:
```typescript
STALE_JUDGE_THRESHOLD = 180 days   // 6 months
STALE_COURT_THRESHOLD = 365 days   // 1 year
STALE_CASE_THRESHOLD = 730 days    // 2 years
```

### 4. Missing Required Fields

**What**: Records missing critical data fields

**Checks**:
- Judges without `name`
- Judges without `jurisdiction` (if they have `courtlistener_id`)
- Cases without `case_name`
- Cases without `decision_date`
- Courts without `name`

**Severity**: Critical (for name fields), Medium (for other fields)
**Auto-fixable**: Partial (can fetch some data from CourtListener)

### 5. Inconsistent Relationships

**What**: Mismatches between related data

**Checks**:
- Judge's `court_id` doesn't match any court assignment
- Case court doesn't match judge's assigned courts
- Assignment dates that overlap incorrectly

**Severity**: Medium
**Auto-fixable**: No (requires domain logic)

### 6. Data Integrity

**What**: Calculated fields that don't match source data

**Checks**:
- `total_cases` count doesn't match actual case count
- Aggregate statistics mismatches

**Severity**: Medium to High
**Auto-fixable**: Yes (recalculates from source)

**Example**:
```typescript
{
  type: 'data_integrity',
  severity: 'high',
  entity: 'judge',
  entityId: 'uuid-789',
  message: 'Judge case count mismatch: stored=150, actual=173',
  suggestedAction: 'Recalculate total_cases from cases table',
  autoFixable: true
}
```

## Usage

### Basic Usage

```typescript
import { DataQualityValidator } from '@/lib/sync/data-quality-validator'

// Create validator instance
const validator = new DataQualityValidator()

// Run full validation
const report = await validator.runFullValidation()

// Check results
console.log(`Found ${report.totalIssues} issues`)
console.log(`Critical: ${report.criticalIssues}`)
console.log(`Summary: ${report.summary}`)
```

### Quick Validation

```typescript
import { runQuickValidation } from '@/lib/sync/data-quality-validator'

// Run only critical checks (faster)
const report = await runQuickValidation()

if (report.criticalIssues > 0) {
  // Alert or take action
}
```

### Auto-Fix Issues

```typescript
import { autoFixIssues } from '@/lib/sync/data-quality-validator'

// Get validation report
const report = await validator.runFullValidation()

// Auto-fix all fixable issues
const fixResults = await autoFixIssues(report)

console.log(`Fixed ${fixResults.filter(r => r.success).length} issues`)
```

### Generate Text Report

```typescript
const report = await validator.runFullValidation()
const textReport = await validator.generateTextReport(report)

// Print to console
console.log(textReport)

// Save to file
fs.writeFileSync('validation-report.txt', textReport)

// Send via email
await sendEmail(adminEmail, 'Data Quality Report', textReport)
```

### Get Statistics

```typescript
const stats = await validator.getValidationStats()

console.log(`Health Score: ${stats.healthScore}/100`)
console.log(`Total Judges: ${stats.totalRecords.judges}`)
console.log(`Total Courts: ${stats.totalRecords.courts}`)
console.log(`Total Cases: ${stats.totalRecords.cases}`)
```

## Integration Patterns

### 1. Post-Sync Validation

Add to end of sync scripts:

```typescript
// In scripts/sync-judges-manual.js
async function main() {
  // ... sync logic ...
  
  // Validate after sync
  const validator = new DataQualityValidator()
  const report = await validator.runFullValidation()
  
  if (report.criticalIssues > 0) {
    console.error('CRITICAL ISSUES FOUND!')
    const textReport = await validator.generateTextReport(report)
    console.log(textReport)
  }
}
```

### 2. Daily Cron Job

```typescript
// In app/api/cron/daily-validation/route.ts
export async function GET(request: NextRequest) {
  const validator = new DataQualityValidator()
  const report = await validator.runFullValidation()
  
  // Auto-fix issues
  await autoFixIssues(report)
  
  // Alert on critical issues
  if (report.criticalIssues > 0) {
    await sendSlackAlert(report)
  }
  
  return NextResponse.json({ 
    success: true,
    healthScore: (await validator.getValidationStats()).healthScore
  })
}
```

### 3. Pre-Deployment Check

```bash
# Run before deploying
npm run validate:data

# Fail deployment if critical issues found
if [ $? -ne 0 ]; then
  echo "Data quality check failed"
  exit 1
fi
```

## SQL Functions Reference

### find_orphaned_cases()

Finds cases referencing non-existent judges.

```sql
SELECT * FROM find_orphaned_cases();
```

Returns:
- `id` - Case UUID
- `judge_id` - Invalid judge reference
- `case_name` - Case name

### find_orphaned_assignments()

Finds court assignments with invalid references.

```sql
SELECT * FROM find_orphaned_assignments();
```

Returns:
- `id` - Assignment UUID
- `invalid_ref_type` - 'judge' or 'court'
- `invalid_ref_id` - Invalid reference UUID

### find_duplicate_courtlistener_ids(entity_type)

Finds duplicate CourtListener IDs.

```sql
SELECT * FROM find_duplicate_courtlistener_ids('judge');
SELECT * FROM find_duplicate_courtlistener_ids('court');
```

Parameters:
- `entity_type` - 'judge' or 'court'

Returns:
- `courtlistener_id` - Duplicate ID
- `count` - Number of records with this ID

### find_stale_judges(days_threshold)

Finds judges not synced recently.

```sql
SELECT * FROM find_stale_judges(180);
```

Parameters:
- `days_threshold` - Days since last sync (default: 180)

Returns:
- `id` - Judge UUID
- `name` - Judge name
- `courtlistener_id` - CourtListener ID
- `days_since_sync` - Days since last update

### validate_judge_case_counts()

Validates judge case counts against actual counts.

```sql
SELECT * FROM validate_judge_case_counts();
```

Returns:
- `judge_id` - Judge UUID
- `judge_name` - Judge name
- `stored_count` - Stored total_cases value
- `actual_count` - Actual count from cases table

### recalculate_judge_case_count(judge_id)

Recalculates and updates judge case count.

```sql
SELECT recalculate_judge_case_count('uuid-here');
```

Parameters:
- `judge_id` - Judge UUID

Returns:
- New case count (INTEGER)

### cleanup_orphaned_cases()

Cleans up all orphaned cases by setting `judge_id` to NULL.

```sql
SELECT cleanup_orphaned_cases();
```

Returns:
- Number of cases updated (INTEGER)

### cleanup_orphaned_assignments()

Deletes all orphaned court assignments.

```sql
SELECT cleanup_orphaned_assignments();
```

Returns:
- Number of assignments deleted (INTEGER)

## Validation Report Structure

```typescript
interface ValidationReport {
  validationId: string           // Unique ID for this validation run
  startTime: Date                // When validation started
  endTime: Date                  // When validation ended
  duration: number               // Duration in milliseconds
  totalIssues: number            // Total issues found
  criticalIssues: number         // Count of critical issues
  highPriorityIssues: number     // Count of high priority issues
  mediumPriorityIssues: number   // Count of medium priority issues
  lowPriorityIssues: number      // Count of low priority issues
  issuesByType: Record<...>      // Breakdown by issue type
  issuesByEntity: Record<...>    // Breakdown by entity type
  issues: ValidationIssue[]      // Array of all issues
  summary: string                // Human-readable summary
  recommendations: string[]      // Actionable recommendations
}
```

## Monitoring & Alerting

### Health Score Calculation

```typescript
healthScore = 100 - (totalIssues * 2)
// Minimum: 0
// Maximum: 100
```

**Interpretation**:
- 90-100: Excellent
- 75-89: Good
- 50-74: Fair
- 25-49: Poor
- 0-24: Critical

### Alert Thresholds

```typescript
if (report.criticalIssues > 0) {
  // Immediate alert - page on-call engineer
  sendPagerDutyAlert(report)
}

if (report.highPriorityIssues > 10) {
  // Slack notification
  sendSlackAlert(report)
}

if (healthScore < 50) {
  // Email to team
  sendEmailAlert(report)
}
```

### Sentry Integration

```typescript
if (report.criticalIssues > 0) {
  Sentry.captureException(new Error('Critical data quality issues'), {
    extra: {
      validationId: report.validationId,
      criticalIssues: report.criticalIssues,
      summary: report.summary,
      recommendations: report.recommendations
    }
  })
}
```

## Troubleshooting

### Issue: Validation takes too long

**Solution**: Use `runQuickValidation()` instead of full validation

```typescript
// Instead of:
await validator.runFullValidation()

// Use:
await runQuickValidation()
```

### Issue: Too many false positives

**Solution**: Adjust thresholds

```typescript
// In data-quality-validator.ts, modify:
private readonly STALE_JUDGE_THRESHOLD = 365  // Increase from 180
private readonly STALE_COURT_THRESHOLD = 730  // Increase from 365
```

### Issue: Auto-fix fails

**Solution**: Check logs and fix manually

```typescript
const result = await validator.fixIssue(issue)
if (!result.success) {
  console.error('Fix failed:', result.error)
  // Manually investigate and fix
}
```

## Best Practices

1. **Run After Every Sync**
   - Ensures data quality is maintained
   - Catches issues early

2. **Monitor Health Score Trends**
   - Track over time
   - Alert on declining trends

3. **Auto-Fix Safe Issues Only**
   - Orphaned references
   - Stale data (queue for resync)
   - Count mismatches

4. **Manual Review for Duplicates**
   - Don't auto-delete
   - Requires domain knowledge

5. **Regular Cleanup**
   - Run weekly cleanup operations
   - Archive old validation results

6. **Integration with Monitoring**
   - Sentry for critical issues
   - Slack for daily summaries
   - Email for weekly reports

## Performance Considerations

- **Full Validation**: ~30-60 seconds for 10K judges
- **Quick Validation**: ~5-10 seconds
- **SQL Functions**: Optimized with indexes
- **Parallel Execution**: Multiple checks run simultaneously

## Future Enhancements

- [ ] Machine learning for anomaly detection
- [ ] Predictive validation (detect issues before they occur)
- [ ] Historical trend analysis
- [ ] Automated remediation workflows
- [ ] Integration with data lineage tracking
- [ ] Real-time validation triggers
- [ ] Custom validation rules engine

## Support

For issues or questions:
- File GitHub issue
- Contact: admin@judgefinder.io
- Slack: #data-quality channel
