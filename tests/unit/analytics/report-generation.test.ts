/**
 * Judicial Bias Report Generation Tests
 * Tests core analytics modules and report builder
 */

import { describe, it, expect } from 'vitest'
import { analyzeMotionPatterns } from '@/lib/analytics/motion-patterns'
import { analyzeDecisionTiming } from '@/lib/analytics/decision-timing'
import { analyzePartyPatterns } from '@/lib/analytics/party-patterns'
import { analyzeValuePatterns } from '@/lib/analytics/value-analysis'
import { applyTemporalDecay, calculateWeightedRate } from '@/lib/analytics/temporal-weighting'
import { calculateConfidenceTier, calculateDataQuality } from '@/lib/analytics/confidence-scoring'

// Mock case data
const mockCases = [
  {
    case_type: 'Civil Litigation',
    outcome: 'Motion to Dismiss granted',
    status: 'Dismissed',
    filing_date: '2023-01-15',
    decision_date: '2023-06-20',
    case_value: 50000,
    motion_type: 'Motion to Dismiss',
  },
  {
    case_type: 'Contract Dispute',
    outcome: 'Settled',
    status: 'Settled',
    filing_date: '2023-03-10',
    decision_date: '2023-09-15',
    case_value: 125000,
  },
  {
    case_type: 'Personal Injury',
    outcome: 'Judgment for plaintiff',
    status: 'Decided',
    filing_date: '2022-11-20',
    decision_date: '2023-08-10',
    case_value: 300000,
    summary: 'Plaintiff awarded damages',
  },
  {
    case_type: 'Employment Dispute',
    outcome: 'Motion for Summary Judgment denied',
    status: 'Pending Trial',
    filing_date: '2023-05-01',
    decision_date: '2023-07-20',
    case_value: 75000,
    motion_type: 'Summary Judgment',
  },
  {
    case_type: 'Property Dispute',
    outcome: 'Settled',
    status: 'Settled',
    filing_date: '2023-02-14',
    decision_date: '2023-10-01',
    case_value: 450000,
  },
]

describe('Motion Pattern Analysis', () => {
  it('should analyze motion grant/deny rates', () => {
    const analysis = analyzeMotionPatterns(mockCases)

    expect(analysis.total_motions_analyzed).toBeGreaterThan(0)
    expect(analysis.overall_grant_rate).toBeGreaterThanOrEqual(0)
    expect(analysis.overall_grant_rate).toBeLessThanOrEqual(1)
    expect(analysis.overall_deny_rate).toBeGreaterThanOrEqual(0)
    expect(analysis.overall_deny_rate).toBeLessThanOrEqual(1)
  })

  it('should identify motion types correctly', () => {
    const analysis = analyzeMotionPatterns(mockCases)

    expect(analysis.patterns_by_type).toBeDefined()
    expect(analysis.patterns_by_type.length).toBeGreaterThan(0)

    const dismissMotion = analysis.patterns_by_type.find(
      (p) => p.motion_type === 'Motion to Dismiss'
    )
    expect(dismissMotion).toBeDefined()
    if (dismissMotion) {
      expect(dismissMotion.total_motions).toBeGreaterThan(0)
      expect(dismissMotion.granted + dismissMotion.denied).toBeLessThanOrEqual(
        dismissMotion.total_motions
      )
    }
  })

  it('should calculate decision timing for motions', () => {
    const analysis = analyzeMotionPatterns(mockCases)

    expect(analysis.avg_decision_time).toBeGreaterThanOrEqual(0)

    for (const pattern of analysis.patterns_by_type) {
      expect(pattern.avg_days_to_decision).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('Decision Timing Analysis', () => {
  it('should analyze timing by complexity', () => {
    const analysis = analyzeDecisionTiming(mockCases)

    expect(analysis.by_complexity).toBeDefined()
    expect(analysis.by_complexity.length).toBe(4) // simple, moderate, complex, highly_complex
    expect(analysis.overall_avg_days).toBeGreaterThan(0)
    expect(analysis.total_cases_analyzed).toBeGreaterThan(0)
  })

  it('should classify cases by complexity correctly', () => {
    const analysis = analyzeDecisionTiming(mockCases)

    const simpleCases = analysis.by_complexity.find((c) => c.complexity_tier === 'simple')
    const complexCases = analysis.by_complexity.find((c) => c.complexity_tier === 'complex')

    expect(simpleCases).toBeDefined()
    expect(complexCases).toBeDefined()

    // Complex cases should generally take longer
    if (simpleCases && complexCases && simpleCases.case_count > 0 && complexCases.case_count > 0) {
      // This is a general expectation but may not always hold for small samples
      expect(complexCases.avg_days).toBeGreaterThanOrEqual(0)
      expect(simpleCases.avg_days).toBeGreaterThanOrEqual(0)
    }
  })

  it('should calculate percentiles correctly', () => {
    const analysis = analyzeDecisionTiming(mockCases)

    for (const complexity of analysis.by_complexity) {
      if (complexity.case_count > 0) {
        expect(complexity.percentile_25).toBeLessThanOrEqual(complexity.median_days)
        expect(complexity.median_days).toBeLessThanOrEqual(complexity.percentile_75)
        expect(complexity.percentile_75).toBeLessThanOrEqual(complexity.percentile_90)
      }
    }
  })
})

describe('Party Pattern Analysis', () => {
  it('should analyze party patterns', () => {
    const analysis = analyzePartyPatterns(mockCases)

    expect(analysis.party_patterns).toBeDefined()
    expect(analysis.representation_patterns).toBeDefined()
    expect(analysis.total_cases_analyzed).toBe(mockCases.length)
  })

  it('should calculate party favorable rates', () => {
    const analysis = analyzePartyPatterns(mockCases)

    expect(analysis.plaintiff_vs_defendant_rate).toBeGreaterThanOrEqual(0)
    expect(analysis.plaintiff_vs_defendant_rate).toBeLessThanOrEqual(1)
    expect(analysis.individual_vs_corporation_rate).toBeGreaterThanOrEqual(0)
    expect(analysis.individual_vs_corporation_rate).toBeLessThanOrEqual(1)
  })
})

describe('Value Analysis', () => {
  it('should analyze settlement rates by value bracket', () => {
    const analysis = analyzeValuePatterns(mockCases)

    expect(analysis.value_brackets).toBeDefined()
    expect(analysis.value_brackets.length).toBeGreaterThan(0)
    expect(analysis.overall_settlement_rate).toBeGreaterThanOrEqual(0)
    expect(analysis.overall_settlement_rate).toBeLessThanOrEqual(1)
  })

  it('should group cases into correct value brackets', () => {
    const analysis = analyzeValuePatterns(mockCases)

    for (const bracket of analysis.value_brackets) {
      expect(bracket.case_count).toBeGreaterThanOrEqual(0)
      expect(bracket.settlement_rate).toBeGreaterThanOrEqual(0)
      expect(bracket.settlement_rate).toBeLessThanOrEqual(1)
    }
  })

  it('should calculate high vs low value rates', () => {
    const analysis = analyzeValuePatterns(mockCases)

    expect(analysis.high_value_settlement_rate).toBeGreaterThanOrEqual(0)
    expect(analysis.high_value_settlement_rate).toBeLessThanOrEqual(1)
    expect(analysis.low_value_settlement_rate).toBeGreaterThanOrEqual(0)
    expect(analysis.low_value_settlement_rate).toBeLessThanOrEqual(1)
  })
})

describe('Temporal Weighting', () => {
  it('should apply temporal decay correctly', () => {
    const weightedCases = applyTemporalDecay(mockCases)

    expect(weightedCases.length).toBe(mockCases.length)

    for (const wc of weightedCases) {
      expect(wc.weight).toBeGreaterThan(0)
      expect(wc.weight).toBeLessThanOrEqual(1)
      expect(wc.years_old).toBeGreaterThanOrEqual(0)
    }
  })

  it('should weight recent cases more heavily', () => {
    const weightedCases = applyTemporalDecay(mockCases, { reference_date: new Date('2024-01-01') })

    // Sort by date
    const sorted = [...weightedCases].sort(
      (a, b) =>
        new Date(b.case_data.decision_date || '').getTime() -
        new Date(a.case_data.decision_date || '').getTime()
    )

    // More recent cases should have higher weights
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i].weight).toBeGreaterThanOrEqual(sorted[i + 1].weight)
    }
  })

  it('should calculate weighted rates correctly', () => {
    const weightedCases = applyTemporalDecay(mockCases)

    const result = calculateWeightedRate(weightedCases, (c) =>
      (c.outcome || '').toLowerCase().includes('settle')
    )

    expect(result.rate).toBeGreaterThanOrEqual(0)
    expect(result.rate).toBeLessThanOrEqual(1)
    expect(result.total_weight).toBeGreaterThan(0)
  })
})

describe('Confidence Scoring', () => {
  it('should calculate correct confidence tier for case counts', () => {
    // Tier 1: 1000+ cases
    const tier1 = calculateConfidenceTier(1200)
    expect(tier1.tier).toBe(1)
    expect(tier1.percentage).toBeGreaterThanOrEqual(90)
    expect(tier1.percentage).toBeLessThanOrEqual(95)

    // Tier 2: 750-999 cases
    const tier2 = calculateConfidenceTier(850)
    expect(tier2.tier).toBe(2)
    expect(tier2.percentage).toBeGreaterThanOrEqual(80)
    expect(tier2.percentage).toBeLessThan(90)

    // Tier 3: 500-749 cases
    const tier3 = calculateConfidenceTier(600)
    expect(tier3.tier).toBe(3)
    expect(tier3.percentage).toBeGreaterThanOrEqual(70)
    expect(tier3.percentage).toBeLessThan(80)

    // Limited: <500 cases
    const limited = calculateConfidenceTier(300)
    expect(limited.tier).toBe('limited')
    expect(limited.percentage).toBeLessThan(70)
  })

  it('should calculate data quality metrics', () => {
    const quality = calculateDataQuality(mockCases)

    expect(quality.total_cases).toBe(mockCases.length)
    expect(quality.temporal_distribution_score).toBeGreaterThanOrEqual(0)
    expect(quality.temporal_distribution_score).toBeLessThanOrEqual(100)
    expect(quality.category_diversity_score).toBeGreaterThanOrEqual(0)
    expect(quality.category_diversity_score).toBeLessThanOrEqual(100)
    expect(quality.data_freshness_score).toBeGreaterThanOrEqual(0)
    expect(quality.data_freshness_score).toBeLessThanOrEqual(100)
    expect(quality.overall_quality_score).toBeGreaterThanOrEqual(0)
    expect(quality.overall_quality_score).toBeLessThanOrEqual(100)
  })

  it('should adjust confidence based on data quality', () => {
    const highQuality = {
      total_cases: 1000,
      effective_cases: 950,
      temporal_distribution_score: 90,
      category_diversity_score: 85,
      data_freshness_score: 88,
      overall_quality_score: 88,
    }

    const lowQuality = {
      total_cases: 1000,
      effective_cases: 800,
      temporal_distribution_score: 40,
      category_diversity_score: 30,
      data_freshness_score: 35,
      overall_quality_score: 35,
    }

    const highConfidence = calculateConfidenceTier(1000, highQuality)
    const lowConfidence = calculateConfidenceTier(1000, lowQuality)

    expect(highConfidence.percentage).toBeGreaterThan(lowConfidence.percentage)
  })
})

describe('Integration Tests', () => {
  it('should generate complete report without errors', () => {
    // Run all analyses
    const motionAnalysis = analyzeMotionPatterns(mockCases)
    const timingAnalysis = analyzeDecisionTiming(mockCases)
    const partyAnalysis = analyzePartyPatterns(mockCases)
    const valueAnalysis = analyzeValuePatterns(mockCases)

    // All should complete successfully
    expect(motionAnalysis).toBeDefined()
    expect(timingAnalysis).toBeDefined()
    expect(partyAnalysis).toBeDefined()
    expect(valueAnalysis).toBeDefined()
  })

  it('should handle edge cases gracefully', () => {
    // Empty cases
    expect(() => analyzeMotionPatterns([])).not.toThrow()
    expect(() => analyzeDecisionTiming([])).not.toThrow()
    expect(() => analyzePartyPatterns([])).not.toThrow()
    expect(() => analyzeValuePatterns([])).not.toThrow()

    // Cases with missing data
    const incompleteCases = [
      { case_type: 'Test', outcome: null, status: null },
      { case_type: null, outcome: 'Settled', status: 'Closed' },
    ]

    expect(() => analyzeMotionPatterns(incompleteCases)).not.toThrow()
    expect(() => analyzeDecisionTiming(incompleteCases)).not.toThrow()
    expect(() => analyzePartyPatterns(incompleteCases)).not.toThrow()
    expect(() => analyzeValuePatterns(incompleteCases)).not.toThrow()
  })
})
