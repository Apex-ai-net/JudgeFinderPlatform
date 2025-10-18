# Data Quality Audit & Remediation System

Comprehensive data quality validation system for judicial data with automated remediation capabilities.

## Overview

The Data Quality Audit system ensures integrity across judges, courts, cases, and assignments by:

1. **Validating** core business rules and data standards
2. **Detecting** anomalies and inconsistencies
3. **Generating** remediation plans with confidence scores
4. **Automating** safe data fixes
5. **Providing** detailed audit trails and rollback support

## Validation Rules

### Critical Rules (Block Operations)

| Rule                      | Description                                                          | Auto-Fix | Confidence |
| ------------------------- | -------------------------------------------------------------------- | -------- | ---------- |
| **Single Primary Court**  | Each judge must have exactly ONE active primary court assignment     | ✅ Yes   | 90%        |
| **No Temporal Overlaps**  | Court assignments cannot have overlapping date ranges for same court | ✅ Yes   | 85%        |
| **Valid Jurisdictions**   | All cases must link to courts within valid jurisdictions             | ❌ No    | N/A        |
| **Jurisdiction Matching** | Judge and court jurisdictions must match in assignments              | ❌ No    | N/A        |

### High Priority Rules (Warn & Log)

| Rule                       | Description                                    | Auto-Fix | Confidence |
| -------------------------- | ---------------------------------------------- | -------- | ---------- |
| **Minimum Case Threshold** | 500+ cases required for full analytics         | ❌ No    | N/A        |
| **No Orphaned Records**    | Cases must reference valid judges              | ✅ Yes   | 95%        |
| **Standard Name Format**   | Judge names follow "Last, First Middle" format | ✅ Yes   | 75%        |
| **Outcome Taxonomy**       | Case outcomes use approved taxonomy            | ✅ Yes   | 80%        |

### Medium Priority Rules (Report Only)

- Assignment dates chronologically valid
- Case filing_date < decision_date
- Court hierarchy correctly represented

## System Components

### 1. Enhanced Data Quality Validator

**Location:** `lib/sync/enhanced-data-quality-validator.ts`

Extends the base DataQualityValidator with:

- Primary court rule validation
- Temporal overlap detection
- Jurisdiction boundary checks
- Name standardization verification
- Outcome taxonomy validation

```typescript
import { EnhancedDataQualityValidator } from '@/lib/sync/enhanced-data-quality-validator'

const validator = new EnhancedDataQualityValidator()
const report = await validator.runEnhancedValidation()
```

### 2. Snapshot Generator

**Location:** `lib/admin/snapshot-generator.ts`

Creates point-in-time snapshots for analysis:

```typescript
import { SnapshotGenerator } from '@/lib/admin/snapshot-generator'

const generator = new SnapshotGenerator()
const snapshot = await generator.generateSnapshot()
```

**Snapshot Contents:**

- Judge statistics (total, with/without primary court, below threshold)
- Court statistics (total, with/without judges)
- Case statistics (total, linked, orphaned, by outcome)
- Assignment statistics (active, by type, overlapping)
- Quality metrics (issues count by type)
- Health score (0-100)

### 3. Auto-Remediation Engine

**Location:** `lib/admin/auto-remediation.ts`

Executes automated fixes with rollback support:

```typescript
import { AutoRemediationEngine } from '@/lib/admin/auto-remediation'

const engine = new AutoRemediationEngine(undefined, { dryRun: true })
const summary = await engine.executeRemediation(issues)
```

**Supported Auto-Fixes:**

- ✅ Nullify orphaned case references
- ✅ Delete invalid assignments
- ✅ Convert multiple primary courts to visiting
- ✅ Set end dates to eliminate temporal overlaps
- ✅ Standardize judge names (remove titles, fix casing)
- ✅ Map outcomes to standard taxonomy
- ✅ Recalculate case counts

### 4. Remediation Planner

**Location:** `lib/admin/remediation-planner.ts`

Generates prioritized remediation plans:

```typescript
import { RemediationPlanner } from '@/lib/admin/remediation-planner'

const planner = new RemediationPlanner()
const plan = planner.generatePlan(validationReport)
```

**Plan Contents:**

- Prioritized actions (critical → high → medium → low)
- Confidence scores (0-100)
- Risk assessment (low, medium, high)
- Impact analysis (records affected, downstream effects)
- Execution order with dependencies
- Rollback information

## Usage

### CLI Usage

Run full audit:

```bash
npx tsx scripts/run-data-audit.ts --full
```

Quick validation (critical checks only):

```bash
npx tsx scripts/run-data-audit.ts --quick
```

Generate snapshot:

```bash
npx tsx scripts/run-data-audit.ts --snapshot --save-snapshot
```

Dry run remediation:

```bash
npx tsx scripts/run-data-audit.ts --remediate --dry-run
```

Execute remediation (requires confirmation):

```bash
npx tsx scripts/run-data-audit.ts --remediate --confirm
```

Save report to file:

```bash
npx tsx scripts/run-data-audit.ts --full --output audit-report.json
```

### API Usage

**Run Audit:**

```bash
curl http://localhost:3005/api/admin/data-audit?operation=audit
```

**Generate Snapshot:**

```bash
curl http://localhost:3005/api/admin/data-audit?operation=snapshot&save=true
```

**Quick Validation:**

```bash
curl http://localhost:3005/api/admin/data-audit?operation=quick&format=text
```

**Execute Remediation (Dry Run):**

```bash
curl -X POST http://localhost:3005/api/admin/data-audit \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": "REM-2025-001",
    "dry_run": true
  }'
```

**Execute Remediation (Actual):**

```bash
curl -X POST http://localhost:3005/api/admin/data-audit \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": "REM-2025-001",
    "action_ids": ["ACT-001", "ACT-002"],
    "dry_run": false
  }'
```

**Rollback Action:**

```bash
curl -X PUT http://localhost:3005/api/admin/data-audit/rollback \
  -H "Content-Type: application/json" \
  -d '{
    "rollback_info": {
      "table": "judges",
      "record_id": "judge-123",
      "original_values": { "name": "Hon. Jane Doe" },
      "timestamp": "2025-10-17T12:00:00Z"
    }
  }'
```

## Output Formats

### Validation Report

```json
{
  "validationId": "validation-1729173600000",
  "startTime": "2025-10-17T12:00:00.000Z",
  "endTime": "2025-10-17T12:00:30.000Z",
  "duration": 30000,
  "totalIssues": 42,
  "criticalIssues": 5,
  "highPriorityIssues": 12,
  "mediumPriorityIssues": 18,
  "lowPriorityIssues": 7,
  "issues": [
    {
      "type": "inconsistent_relationship",
      "severity": "critical",
      "entity": "assignment",
      "entityId": "judge-123",
      "message": "Judge 'Jane Doe' has 2 active primary court assignments",
      "suggestedAction": "Keep most recent as primary, convert others to visiting",
      "autoFixable": true,
      "metadata": {
        "fix_confidence": 90,
        "impacted_records": ["assign-456", "assign-789"]
      }
    }
  ]
}
```

### Remediation Plan

```json
{
  "plan_id": "REM-1729173600000",
  "created_at": "2025-10-17T12:00:00.000Z",
  "summary": {
    "total_issues": 42,
    "critical": 5,
    "auto_fixable": 28,
    "requires_review": 14,
    "estimated_records_affected": 56
  },
  "actions": [
    {
      "action_id": "ACT-judge-123-inconsistent_relationship",
      "severity": "critical",
      "description": "Judge has multiple primary courts",
      "action_type": "update",
      "target_table": "judge_court_assignments",
      "confidence_score": 90,
      "risk_level": "low",
      "impact_analysis": {
        "records_affected": 1,
        "reversibility": "fully_reversible",
        "data_loss_risk": "none"
      }
    }
  ],
  "risk_assessment": {
    "overall_risk": "medium",
    "high_risk_actions": 2,
    "recommended_backup": true,
    "warnings": ["⚠️ Database backup strongly recommended before execution"]
  }
}
```

### Data Snapshot

```json
{
  "snapshot_id": "snapshot-1729173600000",
  "timestamp": "2025-10-17T12:00:00.000Z",
  "health_score": 87,
  "judges": {
    "total": 1247,
    "with_primary_court": 1189,
    "without_primary_court": 58,
    "below_threshold": 342,
    "above_threshold": 905
  },
  "quality_metrics": {
    "orphaned_records": 12,
    "temporal_overlaps": 3,
    "jurisdiction_mismatches": 8
  }
}
```

## Best Practices

### Before Running Remediation

1. **Review the Plan**: Always examine the remediation plan carefully
2. **Check Confidence Scores**: Actions with <75% confidence need manual review
3. **Assess Risk**: Review the risk assessment and warnings
4. **Backup Database**: Create backup if recommended
5. **Start with Dry Run**: Test remediation without making changes
6. **Verify Results**: Review dry run output before applying actual changes

### After Remediation

1. **Verify Changes**: Re-run audit to confirm issues are resolved
2. **Monitor Logs**: Check for any unexpected side effects
3. **Save Rollback Info**: Keep rollback data for at least 30 days
4. **Document Changes**: Record what was fixed and when
5. **Update Baseline**: Regenerate snapshots after major fixes

## Safety Features

### Rollback Support

All remediation actions (except deletions) support rollback:

```typescript
// Rollback information is returned with each fix
const result = {
  success: true,
  rollback_info: {
    table: 'judges',
    record_id: 'judge-123',
    original_values: { name: 'Hon. Jane Doe' },
    timestamp: '2025-10-17T12:00:00Z',
  },
}

// Use the rollback endpoint to revert
await engine.rollback(result.rollback_info)
```

### Confidence Scoring

- **95-100%**: Very high confidence, safe to auto-fix
- **80-94%**: High confidence, review recommended
- **70-79%**: Moderate confidence, manual review required
- **<70%**: Low confidence, do not auto-fix

### Risk Levels

- **Low Risk**: Fully reversible, no data loss, single record
- **Medium Risk**: Partially reversible, affects multiple records
- **High Risk**: Irreversible, potential data loss, or low confidence

## Monitoring

### Health Score

The system calculates an overall health score (0-100) based on:

- Orphaned records (-0.5 points each)
- Duplicate identifiers (-2 points each)
- Missing required fields (-1 point each)
- Temporal overlaps (-2 points each)
- Jurisdiction mismatches (-1 point each)
- Judges without primary court (-0.5 points each)

**Target:** Maintain health score >90

### Recommended Schedule

- **Daily**: Quick validation (critical checks)
- **Weekly**: Full enhanced validation
- **Monthly**: Generate and save snapshot
- **Quarterly**: Full remediation review

## Troubleshooting

### Common Issues

**Issue:** Validation takes too long
**Solution:** Use `--quick` mode for faster checks

**Issue:** Remediation fails with "missing courtlistener_id"
**Solution:** Some fixes require CourtListener IDs - mark for manual review

**Issue:** Rollback fails
**Solution:** Check that original values are still compatible with schema

**Issue:** High confidence but unexpected results
**Solution:** Review the metadata and suggested actions before applying

## Integration with Bias Analytics

The data quality system integrates with the bias analytics system (see [BIAS_REPORT_SYSTEM.md](./BIAS_REPORT_SYSTEM.md)):

- Ensures judges have ≥500 cases before generating bias reports
- Validates case outcomes for accurate pattern detection
- Checks temporal data quality for trend analysis
- Verifies jurisdiction consistency for baseline comparisons

## Related Documentation

- [Database Schema](./DATABASE.md)
- [Bias Report System](./BIAS_REPORT_SYSTEM.md)
- [Sync & Cron Jobs](./SYNC_AND_CRON.md)
- [Data Safety Summary](./DATA_SAFETY_SUMMARY.md)

---

_Context improved by Giga AI - Using information from Judicial data models regarding judge primary court rule, temporal overlaps, jurisdiction boundaries, minimum case threshold, and data quality validation rules._
