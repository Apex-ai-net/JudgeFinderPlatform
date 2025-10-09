/**
 * Unit tests for bias calculation functions
 */

import { describe, it, expect } from 'vitest'
import {
  analyzeCaseTypePatterns,
  analyzeOutcomes,
  analyzeTemporalPatterns,
  calculateBiasIndicators,
  type CaseRecord,
} from '@/lib/analytics/bias-calculations'

describe('Bias Calculations', () => {
  describe('analyzeCaseTypePatterns', () => {
    it('should analyze case type patterns correctly', () => {
      const cases: CaseRecord[] = [
        { case_type: 'Civil', outcome: 'Settled', case_value: 100000 },
        { case_type: 'Civil', outcome: 'Dismissed', case_value: 50000 },
        { case_type: 'Civil', outcome: 'Settled', case_value: 200000 },
        { case_type: 'Criminal', outcome: 'Judgment', case_value: null },
        { case_type: 'Criminal', outcome: 'Dismissed', case_value: null },
      ]

      const patterns = analyzeCaseTypePatterns(cases)

      expect(patterns).toHaveLength(2)
      expect(patterns[0].case_type).toBe('Civil')
      expect(patterns[0].total_cases).toBe(3)
      expect(patterns[0].settlement_rate).toBeCloseTo(0.667, 2)
      expect(patterns[0].average_case_value).toBeCloseTo(116666.67, 2)
      expect(patterns[0].outcome_distribution.settled).toBe(2)
      expect(patterns[0].outcome_distribution.dismissed).toBe(1)
    })

    it('should handle empty case list', () => {
      const patterns = analyzeCaseTypePatterns([])
      expect(patterns).toEqual([])
    })

    it('should sort by total cases descending', () => {
      const cases: CaseRecord[] = [
        { case_type: 'Family', outcome: 'Settled' },
        { case_type: 'Civil', outcome: 'Settled' },
        { case_type: 'Civil', outcome: 'Dismissed' },
        { case_type: 'Civil', outcome: 'Judgment' },
      ]

      const patterns = analyzeCaseTypePatterns(cases)

      expect(patterns[0].case_type).toBe('Civil')
      expect(patterns[0].total_cases).toBe(3)
      expect(patterns[1].case_type).toBe('Family')
      expect(patterns[1].total_cases).toBe(1)
    })

    it('should handle cases with null/undefined values', () => {
      const cases: CaseRecord[] = [
        { case_type: null, outcome: 'Settled', case_value: null },
        { case_type: 'Civil', outcome: null, case_value: undefined },
      ]

      const patterns = analyzeCaseTypePatterns(cases)

      expect(patterns).toHaveLength(2)
      expect(patterns.some((p) => p.case_type === 'Other')).toBe(true)
      expect(patterns.some((p) => p.case_type === 'Civil')).toBe(true)
    })
  })

  describe('analyzeOutcomes', () => {
    it('should calculate outcome rates correctly', () => {
      const cases: CaseRecord[] = [
        { outcome: 'Settled', filing_date: '2023-01-01', decision_date: '2023-03-01' },
        { outcome: 'Settled', filing_date: '2023-02-01', decision_date: '2023-04-01' },
        { outcome: 'Dismissed', filing_date: '2023-01-15', decision_date: '2023-02-15' },
        { outcome: 'Judgment', filing_date: '2023-03-01', decision_date: '2023-05-01' },
      ]

      const analysis = analyzeOutcomes(cases)

      expect(analysis.overall_settlement_rate).toBe(0.5)
      expect(analysis.dismissal_rate).toBe(0.25)
      expect(analysis.judgment_rate).toBe(0.25)
      expect(analysis.average_case_duration).toBeGreaterThan(0)
    })

    it('should calculate case value trends', () => {
      const cases: CaseRecord[] = [
        { case_value: 5000, outcome: 'Settled' },
        { case_value: 25000, outcome: 'Settled' },
        { case_value: 150000, outcome: 'Dismissed' },
        { case_value: 500000, outcome: 'Judgment' },
      ]

      const analysis = analyzeOutcomes(cases)

      expect(analysis.case_value_trends).toHaveLength(4)
      expect(analysis.case_value_trends[0].value_range).toBe('< $10K')
      expect(analysis.case_value_trends[0].case_count).toBe(1)
      expect(analysis.case_value_trends[1].value_range).toBe('$10K - $50K')
      expect(analysis.case_value_trends[2].value_range).toBe('$50K - $250K')
      expect(analysis.case_value_trends[3].value_range).toBe('$250K+')
    })

    it('should handle cases without dates', () => {
      const cases: CaseRecord[] = [{ outcome: 'Settled' }, { outcome: 'Dismissed' }]

      const analysis = analyzeOutcomes(cases)

      expect(analysis.overall_settlement_rate).toBe(0.5)
      expect(analysis.average_case_duration).toBe(0)
    })
  })

  describe('analyzeTemporalPatterns', () => {
    it('should group cases by month', () => {
      const cases: CaseRecord[] = [
        { decision_date: '2023-01-15', outcome: 'Settled', filing_date: '2022-12-01' },
        { decision_date: '2023-01-20', outcome: 'Dismissed', filing_date: '2023-01-01' },
        { decision_date: '2023-02-10', outcome: 'Settled', filing_date: '2023-01-15' },
      ]

      const patterns = analyzeTemporalPatterns(cases)

      expect(patterns).toHaveLength(2)
      expect(patterns[0].year).toBe(2023)
      expect(patterns[0].month).toBe(1)
      expect(patterns[0].case_count).toBe(2)
      expect(patterns[0].settlement_rate).toBe(0.5)
    })

    it('should sort patterns chronologically', () => {
      const cases: CaseRecord[] = [
        { decision_date: '2023-03-15', outcome: 'Settled' },
        { decision_date: '2023-01-20', outcome: 'Dismissed' },
        { decision_date: '2023-02-10', outcome: 'Settled' },
      ]

      const patterns = analyzeTemporalPatterns(cases)

      expect(patterns[0].month).toBe(1)
      expect(patterns[1].month).toBe(2)
      expect(patterns[2].month).toBe(3)
    })

    it('should calculate average duration', () => {
      const cases: CaseRecord[] = [
        { decision_date: '2023-03-01', filing_date: '2023-01-01', outcome: 'Settled' },
        { decision_date: '2023-03-15', filing_date: '2023-02-01', outcome: 'Dismissed' },
      ]

      const patterns = analyzeTemporalPatterns(cases)

      expect(patterns[0].average_duration).toBeGreaterThan(0)
    })

    it('should ignore invalid dates', () => {
      const cases: CaseRecord[] = [
        { decision_date: 'invalid-date', outcome: 'Settled' },
        { decision_date: null, outcome: 'Dismissed' },
        { decision_date: '2023-03-15', outcome: 'Settled' },
      ]

      const patterns = analyzeTemporalPatterns(cases)

      expect(patterns).toHaveLength(1)
      expect(patterns[0].case_count).toBe(1)
    })
  })

  describe('calculateBiasIndicators', () => {
    it('should calculate bias indicators within valid ranges', () => {
      const cases: CaseRecord[] = [
        {
          case_type: 'Civil',
          outcome: 'Settled',
          case_value: 100000,
          filing_date: '2023-01-01',
          decision_date: '2023-03-01',
        },
        {
          case_type: 'Civil',
          outcome: 'Settled',
          case_value: 150000,
          filing_date: '2023-02-01',
          decision_date: '2023-04-01',
        },
        {
          case_type: 'Criminal',
          outcome: 'Judgment',
          filing_date: '2023-01-15',
          decision_date: '2023-02-15',
        },
      ]

      const caseTypePatterns = analyzeCaseTypePatterns(cases)
      const outcomeAnalysis = analyzeOutcomes(cases)
      const indicators = calculateBiasIndicators(cases, caseTypePatterns, outcomeAnalysis)

      expect(indicators.consistency_score).toBeGreaterThanOrEqual(0)
      expect(indicators.consistency_score).toBeLessThanOrEqual(100)
      expect(indicators.speed_score).toBeGreaterThanOrEqual(0)
      expect(indicators.speed_score).toBeLessThanOrEqual(100)
      expect(indicators.settlement_preference).toBeGreaterThanOrEqual(-50)
      expect(indicators.settlement_preference).toBeLessThanOrEqual(50)
      expect(indicators.risk_tolerance).toBeGreaterThanOrEqual(0)
      expect(indicators.risk_tolerance).toBeLessThanOrEqual(100)
      expect(indicators.predictability_score).toBeGreaterThanOrEqual(0)
      expect(indicators.predictability_score).toBeLessThanOrEqual(100)
    })

    it('should handle edge case with single case', () => {
      const cases: CaseRecord[] = [
        {
          case_type: 'Civil',
          outcome: 'Settled',
          case_value: 50000,
          filing_date: '2023-01-01',
          decision_date: '2023-02-01',
        },
      ]

      const caseTypePatterns = analyzeCaseTypePatterns(cases)
      const outcomeAnalysis = analyzeOutcomes(cases)
      const indicators = calculateBiasIndicators(cases, caseTypePatterns, outcomeAnalysis)

      expect(indicators.consistency_score).toBeGreaterThanOrEqual(0)
      expect(indicators.predictability_score).toBeLessThan(100) // Should be penalized for low sample
    })

    it('should calculate settlement preference correctly', () => {
      const highSettlementCases: CaseRecord[] = Array(10)
        .fill(null)
        .map(() => ({ outcome: 'Settled' }))

      const caseTypePatterns = analyzeCaseTypePatterns(highSettlementCases)
      const outcomeAnalysis = analyzeOutcomes(highSettlementCases)
      const indicators = calculateBiasIndicators(
        highSettlementCases,
        caseTypePatterns,
        outcomeAnalysis
      )

      expect(indicators.settlement_preference).toBeGreaterThan(0) // Positive preference
    })

    it('should return fixed decimal precision', () => {
      const cases: CaseRecord[] = [
        {
          case_type: 'Civil',
          outcome: 'Settled',
          case_value: 100000,
          filing_date: '2023-01-01',
          decision_date: '2023-03-01',
        },
      ]

      const caseTypePatterns = analyzeCaseTypePatterns(cases)
      const outcomeAnalysis = analyzeOutcomes(cases)
      const indicators = calculateBiasIndicators(cases, caseTypePatterns, outcomeAnalysis)

      // Check all values have at most 1 decimal place
      expect(Number.isInteger(indicators.consistency_score * 10)).toBe(true)
      expect(Number.isInteger(indicators.speed_score * 10)).toBe(true)
      expect(Number.isInteger(indicators.settlement_preference * 10)).toBe(true)
      expect(Number.isInteger(indicators.risk_tolerance * 10)).toBe(true)
      expect(Number.isInteger(indicators.predictability_score * 10)).toBe(true)
    })
  })

  describe('Edge Cases - Sample Size < 500', (): void => {
    it('should handle dataset below minimum threshold (< 500 cases)', (): void => {
      const cases: CaseRecord[] = Array(350)
        .fill(null)
        .map((_unused, index) => ({
          case_type: 'Civil',
          outcome: index % 2 === 0 ? 'Settled' : 'Judgment',
          case_value: 50000,
        }))

      const patterns = analyzeCaseTypePatterns(cases)
      const analysis = analyzeOutcomes(cases)
      const indicators = calculateBiasIndicators(cases, patterns, analysis)

      expect(patterns[0].total_cases).toBe(350)
      expect(indicators.predictability_score).toBeLessThan(100)
    })

    it('should handle very small dataset (< 50 cases)', () => {
      const cases: CaseRecord[] = Array(25)
        .fill(null)
        .map(() => ({ case_type: 'Civil', outcome: 'Settled' }))

      const patterns = analyzeCaseTypePatterns(cases)
      expect(patterns[0].total_cases).toBe(25)
    })

    it('should handle single case dataset', () => {
      const cases: CaseRecord[] = [{ case_type: 'Civil', outcome: 'Settled' }]

      const patterns = analyzeCaseTypePatterns(cases)
      const analysis = analyzeOutcomes(cases)

      expect(patterns).toHaveLength(1)
      expect(analysis.overall_settlement_rate).toBe(1)
    })
  })

  describe('Edge Cases - Outliers and Missing Data', () => {
    it('should handle cases with extreme case values', () => {
      const cases: CaseRecord[] = [
        { case_value: 1000000000, outcome: 'Settled' }, // 1 billion
        { case_value: 1, outcome: 'Settled' }, // 1 dollar
        { case_value: 50000, outcome: 'Judgment' },
      ]

      const analysis = analyzeOutcomes(cases)
      expect(analysis.case_value_trends).toHaveLength(4)
      expect(analysis.case_value_trends[3].case_count).toBe(1) // Billion dollar case
    })

    it('should handle cases with all null case values', () => {
      const cases: CaseRecord[] = [
        { case_type: 'Criminal', case_value: null, outcome: 'Judgment' },
        { case_type: 'Criminal', case_value: null, outcome: 'Dismissed' },
      ]

      const patterns = analyzeCaseTypePatterns(cases)
      expect(patterns[0].average_case_value).toBe(0)
    })

    it('should handle cases with all missing outcomes', () => {
      const cases: CaseRecord[] = [
        { case_type: 'Civil', outcome: null },
        { case_type: 'Civil', outcome: undefined },
      ]

      const patterns = analyzeCaseTypePatterns(cases)
      expect(patterns[0].outcome_distribution.other).toBe(2)
    })

    it('should handle cases with all missing dates', () => {
      const cases: CaseRecord[] = [
        { outcome: 'Settled', filing_date: null, decision_date: null },
        { outcome: 'Dismissed', filing_date: undefined, decision_date: undefined },
      ]

      const patterns = analyzeTemporalPatterns(cases)
      expect(patterns).toEqual([])
    })

    it('should handle invalid date formats', () => {
      const cases: CaseRecord[] = [
        { outcome: 'Settled', decision_date: '2023-13-45' }, // Invalid date
        { outcome: 'Dismissed', decision_date: 'not-a-date' },
        { outcome: 'Judgment', decision_date: '' },
      ]

      const patterns = analyzeTemporalPatterns(cases)
      expect(patterns).toEqual([])
    })

    it('should handle NaN case values', () => {
      const cases: CaseRecord[] = [
        { case_value: NaN, outcome: 'Settled' },
        { case_value: Number.POSITIVE_INFINITY, outcome: 'Judgment' },
        { case_value: Number.NEGATIVE_INFINITY, outcome: 'Dismissed' },
      ]

      const patterns = analyzeCaseTypePatterns(cases)
      expect(patterns[0].average_case_value).toBe(0)
    })
  })

  describe('Edge Cases - Confidence Interval Calculations', () => {
    it('should calculate confidence intervals for high-variance datasets', () => {
      const cases: CaseRecord[] = [
        ...Array(50)
          .fill(null)
          .map(() => ({ case_type: 'Civil', outcome: 'Settled', case_value: 10000 })),
        ...Array(50)
          .fill(null)
          .map(() => ({ case_type: 'Civil', outcome: 'Dismissed', case_value: 1000000 })),
      ]

      const patterns = analyzeCaseTypePatterns(cases)
      const analysis = analyzeOutcomes(cases)
      const indicators = calculateBiasIndicators(cases, patterns, analysis)

      expect(indicators.consistency_score).toBeLessThan(100)
      expect(indicators.consistency_score).toBeGreaterThanOrEqual(0)
    })

    it('should handle perfect consistency (all same outcome)', () => {
      const cases: CaseRecord[] = Array(100)
        .fill(null)
        .map(() => ({ case_type: 'Civil', outcome: 'Settled' }))

      const patterns = analyzeCaseTypePatterns(cases)
      const analysis = analyzeOutcomes(cases)
      const indicators = calculateBiasIndicators(cases, patterns, analysis)

      expect(indicators.consistency_score).toBe(100)
      expect(analysis.overall_settlement_rate).toBe(1)
    })

    it('should handle zero variance in case durations', () => {
      const cases: CaseRecord[] = Array(10)
        .fill(null)
        .map(() => ({
          filing_date: '2023-01-01',
          decision_date: '2023-02-01',
          outcome: 'Settled',
        }))

      const analysis = analyzeOutcomes(cases)
      expect(analysis.average_case_duration).toBeCloseTo(31, 0)
    })
  })

  describe('Edge Cases - Statistical Significance', () => {
    it('should detect statistically insignificant patterns with small samples', () => {
      const cases: CaseRecord[] = [
        { case_type: 'Civil', outcome: 'Settled' },
        { case_type: 'Civil', outcome: 'Dismissed' },
        { case_type: 'Criminal', outcome: 'Judgment' },
      ]

      const caseTypePatterns = analyzeCaseTypePatterns(cases)
      const outcomeAnalysis = analyzeOutcomes(cases)
      const indicators = calculateBiasIndicators(cases, caseTypePatterns, outcomeAnalysis)

      expect(indicators.predictability_score).toBeLessThan(50)
    })

    it('should handle extreme settlement rates (100%)', () => {
      const cases: CaseRecord[] = Array(500)
        .fill(null)
        .map(() => ({ outcome: 'Settled', case_type: 'Civil' }))

      const analysis = analyzeOutcomes(cases)
      const patterns = analyzeCaseTypePatterns(cases)
      const indicators = calculateBiasIndicators(cases, patterns, analysis)

      expect(analysis.overall_settlement_rate).toBe(1.0)
      expect(indicators.settlement_preference).toBe(50.0)
    })

    it('should handle extreme settlement rates (0%)', () => {
      const cases: CaseRecord[] = Array(500)
        .fill(null)
        .map(() => ({ outcome: 'Judgment', case_type: 'Civil' }))

      const analysis = analyzeOutcomes(cases)
      const patterns = analyzeCaseTypePatterns(cases)
      const indicators = calculateBiasIndicators(cases, patterns, analysis)

      expect(analysis.overall_settlement_rate).toBe(0)
      expect(indicators.settlement_preference).toBe(-50.0)
    })
  })

  describe('Edge Cases - Mixed Data Quality', () => {
    it('should handle dataset with partially missing data', () => {
      const cases: CaseRecord[] = [
        {
          case_type: 'Civil',
          outcome: 'Settled',
          case_value: 100000,
          filing_date: '2023-01-01',
          decision_date: '2023-03-01',
        },
        {
          case_type: null,
          outcome: 'Dismissed',
          case_value: null,
          filing_date: null,
          decision_date: null,
        },
        {
          case_type: 'Criminal',
          outcome: null,
          case_value: 50000,
          filing_date: '2023-02-01',
          decision_date: '2023-04-01',
        },
      ]

      const patterns = analyzeCaseTypePatterns(cases)
      const analysis = analyzeOutcomes(cases)

      expect(patterns).toHaveLength(3)
      expect(analysis.overall_settlement_rate).toBeGreaterThanOrEqual(0)
      expect(analysis.overall_settlement_rate).toBeLessThanOrEqual(1)
    })

    it('should handle empty strings as null values', () => {
      const cases: CaseRecord[] = [
        { case_type: '', outcome: '', case_value: 0 },
        { case_type: 'Civil', outcome: 'Settled', case_value: 100000 },
      ]

      const patterns = analyzeCaseTypePatterns(cases)
      expect(patterns.length).toBeGreaterThan(0)
    })
  })
})
