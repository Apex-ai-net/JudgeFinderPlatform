# Judicial Bias Report - Usage Examples

## Quick Start

### 1. Generate Basic Report

```typescript
import { generateBiasReport } from '@/lib/analytics/report-builder'
import { createServerClient } from '@/lib/supabase/server'

async function generateReport(judgeId: string) {
  const supabase = await createServerClient()

  // Fetch judge data
  const { data: judge } = await supabase
    .from('judges')
    .select('id, name, jurisdiction')
    .eq('id', judgeId)
    .single()

  // Fetch cases (last 3 years)
  const threeYearsAgo = new Date()
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

  const { data: cases } = await supabase
    .from('cases')
    .select('*')
    .eq('judge_id', judgeId)
    .gte('filing_date', threeYearsAgo.toISOString())
    .not('decision_date', 'is', null)

  // Generate report
  const report = await generateBiasReport(judge.id, judge.name, judge.jurisdiction, cases)

  return report
}
```

### 2. API Request Example

```bash
# Generate report for Judge ID: abc-123
curl -X GET "https://judgefinder.com/api/judges/abc-123/bias-report?startDate=2020-01-01&includeBaseline=true" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. Generate Plain-Language Summary

```typescript
import { generateNarrativeSummary, generateTextReport } from '@/lib/analytics/summary-generator'

async function createNarrativeReport(judgeId: string) {
  const report = await generateReport(judgeId)

  // Get structured narrative
  const narrative = generateNarrativeSummary(report)
  console.log('Overview:', narrative.overview)
  console.log('Key Patterns:', narrative.key_patterns)
  console.log('Concerns:', narrative.concerns)

  // Or generate text report for export
  const textReport = generateTextReport(report)
  // Save to file or display
  console.log(textReport)
}
```

## Advanced Usage

### Custom Date Range

```typescript
const report = await generateBiasReport(judgeId, judgeName, jurisdiction, cases, {
  startDate: new Date('2022-01-01'),
  endDate: new Date('2024-12-31'),
  includeBaseline: true,
})
```

### Access Specific Analysis Components

```typescript
// Motion analysis only
const motionAnalysis = report.detailed_findings.motion_analysis
console.log(`Overall Grant Rate: ${motionAnalysis.overall_grant_rate * 100}%`)

for (const pattern of motionAnalysis.patterns_by_type) {
  console.log(`${pattern.motion_type}: ${pattern.grant_rate * 100}% granted`)
}

// Timing analysis
const timingAnalysis = report.detailed_findings.timing_analysis
console.log(`Average Duration: ${timingAnalysis.overall_avg_days} days`)

for (const complexity of timingAnalysis.by_complexity) {
  if (complexity.case_count > 0) {
    console.log(`${complexity.complexity_tier}: ${complexity.avg_days} days`)
  }
}

// Value analysis
const valueAnalysis = report.detailed_findings.value_analysis
console.log(`Settlement Rate: ${valueAnalysis.overall_settlement_rate * 100}%`)
console.log(`High Value: ${valueAnalysis.high_value_settlement_rate * 100}%`)
console.log(`Low Value: ${valueAnalysis.low_value_settlement_rate * 100}%`)
```

### Check Confidence & Data Quality

```typescript
// Confidence tier
console.log(`Confidence: ${report.confidence_tier.label} (${report.confidence_tier.percentage}%)`)
console.log(`Description: ${report.confidence_tier.description}`)

// Data quality
console.log(`Total Cases: ${report.data_quality.total_cases}`)
console.log(`Effective Cases: ${report.data_quality.effective_cases}`)
console.log(`Freshness Score: ${report.data_quality.data_freshness_score}/100`)
console.log(`Diversity Score: ${report.data_quality.category_diversity_score}/100`)
console.log(`Overall Quality: ${report.data_quality.overall_quality_score}/100`)
```

### Baseline Comparison

```typescript
if (report.detailed_findings.baseline_comparison) {
  const baseline = report.detailed_findings.baseline_comparison

  console.log(`Jurisdiction: ${baseline.jurisdiction}`)
  console.log(`Overall Deviation Score: ${baseline.overall_deviation_score}/100`)
  console.log(`Anomaly Count: ${baseline.anomaly_count}`)

  for (const comparison of baseline.comparisons) {
    if (comparison.is_significant) {
      console.log(`\n${comparison.metric}:`)
      console.log(`  Judge: ${comparison.judge_value}`)
      console.log(`  Baseline: ${comparison.baseline_value}`)
      console.log(`  Deviation: ${comparison.std_deviations.toFixed(2)}σ`)
      console.log(`  ${comparison.interpretation}`)
    }
  }
}
```

### Anomaly Detection

```typescript
// Filter by severity
const highSeverity = report.flagged_anomalies.filter((a) => a.severity === 'high')
const mediumSeverity = report.flagged_anomalies.filter((a) => a.severity === 'medium')

console.log(`High Severity Anomalies: ${highSeverity.length}`)
for (const anomaly of highSeverity) {
  console.log(`  ${anomaly.category}: ${anomaly.metric}`)
  console.log(`  ${anomaly.description}`)
}

// Group by category
const byCategory = report.flagged_anomalies.reduce(
  (acc, a) => {
    if (!acc[a.category]) acc[a.category] = []
    acc[a.category].push(a)
    return acc
  },
  {} as Record<string, typeof report.flagged_anomalies>
)

for (const [category, anomalies] of Object.entries(byCategory)) {
  console.log(`\n${category}: ${anomalies.length} anomalies`)
}
```

## Sample Report Output

### Example JSON Response

```json
{
  "report": {
    "metadata": {
      "judge_id": "abc-123",
      "judge_name": "Judge Sarah Thompson",
      "jurisdiction": "California, Superior Court - Los Angeles County",
      "report_date": "2025-10-17T10:30:00.000Z",
      "start_date": "2022-10-17T00:00:00.000Z",
      "end_date": "2025-10-17T00:00:00.000Z",
      "total_cases": 847,
      "effective_cases": 798,
      "analysis_method": "comprehensive"
    },
    "confidence_tier": {
      "tier": 2,
      "percentage": 85,
      "label": "High Confidence",
      "min_cases": 750,
      "description": "Substantial analysis based on 847 cases. Statistical patterns are reliable with good data coverage across case types and time periods.",
      "reliability": "high"
    },
    "data_quality": {
      "total_cases": 847,
      "effective_cases": 798,
      "temporal_distribution_score": 82,
      "category_diversity_score": 74,
      "data_freshness_score": 68,
      "overall_quality_score": 75
    },
    "metrics_table": [
      {
        "category": "Settlement Patterns",
        "metric": "Overall Settlement Rate",
        "judge_value": "58%",
        "baseline_value": "52%",
        "interpretation": "Moderate settlement rate",
        "confidence": 85,
        "sample_size": 847
      },
      {
        "category": "Motion Decisions",
        "metric": "Overall Motion Grant Rate",
        "judge_value": "47%",
        "baseline_value": "43%",
        "deviation": 0.8,
        "interpretation": "Moderate grant rate",
        "confidence": 82,
        "sample_size": 234
      }
    ],
    "flagged_anomalies": [
      {
        "category": "Case Duration",
        "metric": "Average Duration",
        "severity": "medium",
        "judge_value": 287,
        "baseline_value": 180,
        "std_deviations": 2.4,
        "description": "Cases take an average of 287 days to resolve, which is longer than typical judicial timelines. This may reflect case complexity or docket management."
      }
    ],
    "executive_summary": "Comprehensive judicial pattern analysis for Judge Sarah Thompson based on 847 cases. Substantial analysis based on 847 cases. Statistical patterns are reliable with good data coverage across case types and time periods. Comparison to California, Superior Court - Los Angeles County jurisdiction peers: Some metrics differ moderately from jurisdiction averages Overall deviation score: 28/100. 1 moderate deviation from typical patterns identified. Key findings: • Cases take an average of 287 days to resolve, which is longer than typical judicial timelines. This may reflect case complexity or docket management.",
    "methodology_notes": [
      "Analysis based on 847 total cases with temporal weighting applied (effective case count: 798)",
      "Temporal decay factor: Recent cases weighted more heavily (42% within 1 year, 18% older than 3 years)",
      "Case outcomes normalized by type and jurisdiction-specific factors where applicable",
      "Statistical significance determined using 2-standard-deviation threshold for anomaly detection",
      "Full analytics provided: Dataset meets 500-case minimum threshold for comprehensive pattern detection",
      "Confidence scores reflect both sample size and data quality factors including temporal distribution and category diversity",
      "Baseline comparisons calculated using jurisdiction-wide averages from peer judges with similar case loads"
    ]
  },
  "narrative": {
    "overview": "This analysis of Judge Sarah Thompson's judicial patterns is based on substantial data comprising 847 cases spanning Oct 2022 to Oct 2025. The analysis reveals some minor deviations from typical patterns. Overall confidence in these findings is high confidence (85%).",
    "key_patterns": [
      "Settlement rate of 58% is within the normal range for judicial proceedings.",
      "Grants motions at a 47% rate, suggesting balanced approach to procedural requests.",
      "Cases take an average of 287 days to resolve, which is longer than typical judicial timelines. This may reflect case complexity or docket management."
    ],
    "strengths": [
      "Judicial patterns are consistent with jurisdiction norms, demonstrating predictable decision-making",
      "No high-severity anomalies detected in judicial pattern analysis"
    ],
    "concerns": [
      "Extended case duration (287 days average) may indicate docket congestion or complex caseload"
    ],
    "context_notes": [
      "Statistical patterns reflect aggregated case outcomes and do not account for individual case merits, complexity, or legal standards applicable to each matter.",
      "Comparisons are made against California, Superior Court - Los Angeles County jurisdiction averages based on California, Superior Court - Los Angeles County peer judges.",
      "Analysis applies temporal weighting to prioritize recent cases while maintaining historical context.",
      "Deviation from jurisdiction averages does not necessarily indicate improper bias - judges may specialize in specific case types or handle unique dockets."
    ],
    "recommendations": [
      "Update analysis with more recent case data to reflect current judicial patterns"
    ]
  },
  "metadata": {
    "generated_at": "2025-10-17T10:30:45.123Z",
    "requested_by": "admin_user_123",
    "meets_minimum_threshold": true,
    "warning": null
  }
}
```

### Example Text Report

```
================================================================================
JUDICIAL PATTERN ANALYSIS REPORT
Judge: Judge Sarah Thompson
Jurisdiction: California, Superior Court - Los Angeles County
Report Date: 10/17/2025
Analysis Period: Oct 2022 to Oct 2025
Total Cases: 847
Confidence: High Confidence (85%)
================================================================================

EXECUTIVE SUMMARY
--------------------------------------------------------------------------------
Comprehensive judicial pattern analysis for Judge Sarah Thompson based on 847
cases. Substantial analysis based on 847 cases. Statistical patterns are
reliable with good data coverage across case types and time periods. Comparison
to California, Superior Court - Los Angeles County jurisdiction peers: Some
metrics differ moderately from jurisdiction averages Overall deviation score:
28/100. 1 moderate deviation from typical patterns identified.

KEY PATTERNS IDENTIFIED
--------------------------------------------------------------------------------
1. Settlement rate of 58% is within the normal range for judicial proceedings.
2. Grants motions at a 47% rate, suggesting balanced approach to procedural
   requests.
3. Cases take an average of 287 days to resolve, which is longer than typical
   judicial timelines. This may reflect case complexity or docket management.

STRENGTHS
--------------------------------------------------------------------------------
✓ Judicial patterns are consistent with jurisdiction norms, demonstrating
  predictable decision-making
✓ No high-severity anomalies detected in judicial pattern analysis

AREAS REQUIRING ATTENTION
--------------------------------------------------------------------------------
⚠ Extended case duration (287 days average) may indicate docket congestion or
  complex caseload

FLAGGED ANOMALIES
--------------------------------------------------------------------------------
🟡 [MEDIUM] Case Duration: Average Duration
   Cases take an average of 287 days to resolve, which is longer than typical
   judicial timelines. This may reflect case complexity or docket management.
   Judge Value: 287 | Baseline: 180 | Deviation: 2.4σ

================================================================================
End of Report - Generated on 10/17/2025, 10:30:45 AM
================================================================================
```

## Integration Examples

### React Component

```typescript
'use client'

import { useState } from 'react'

export function BiasReportViewer({ judgeId }: { judgeId: string }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  async function generateReport() {
    setLoading(true)
    try {
      const response = await fetch(`/api/judges/${judgeId}/bias-report`)
      const data = await response.json()
      setReport(data.report)
    } catch (error) {
      console.error('Failed to generate report:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Generating report...</div>

  if (!report) {
    return <button onClick={generateReport}>Generate Bias Report</button>
  }

  return (
    <div>
      <h2>{report.metadata.judge_name}</h2>
      <p>Confidence: {report.confidence_tier.label}</p>
      <p>{report.executive_summary}</p>

      {report.flagged_anomalies.map((anomaly, i) => (
        <div key={i} className={`anomaly-${anomaly.severity}`}>
          <strong>{anomaly.category}: {anomaly.metric}</strong>
          <p>{anomaly.description}</p>
        </div>
      ))}
    </div>
  )
}
```

### Admin Dashboard Integration

```typescript
// app/admin/bias-analytics/[judgeId]/page.tsx
import { generateBiasReport } from '@/lib/analytics/report-builder'
import { createServerClient } from '@/lib/supabase/server'

export default async function JudgeBiasReportPage({
  params,
}: {
  params: { judgeId: string }
}) {
  const supabase = await createServerClient()

  const { data: judge } = await supabase
    .from('judges')
    .select('*')
    .eq('id', params.judgeId)
    .single()

  const { data: cases } = await supabase
    .from('cases')
    .select('*')
    .eq('judge_id', params.judgeId)
    .not('decision_date', 'is', null)
    .limit(2000)

  const report = await generateBiasReport(
    judge.id,
    judge.name,
    judge.jurisdiction,
    cases
  )

  return (
    <div>
      <h1>Bias Report: {judge.name}</h1>
      <BiasReportDisplay report={report} />
    </div>
  )
}
```

---

**Last Updated**: 2025-10-17
**Version**: 1.0.0
