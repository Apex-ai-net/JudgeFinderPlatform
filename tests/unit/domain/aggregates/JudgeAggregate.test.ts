import { describe, it, expect } from 'vitest'
import { JudgeAggregate } from '@/lib/domain/aggregates/JudgeAggregate'

describe('JudgeAggregate', () => {
  describe('create', () => {
    it('should create a valid judge aggregate', () => {
      const result = JudgeAggregate.create({
        id: 'judge-1',
        name: 'Judge Smith',
        totalCases: 100,
        positions: [],
        jurisdiction: 'California',
      })

      expect(result.isOk()).toBe(true)
      const judge = result.unwrap()
      expect(judge.id).toBe('judge-1')
      expect(judge.name).toBe('Judge Smith')
      expect(judge.totalCases).toBe(100)
    })

    it('should reject empty ID', () => {
      const result = JudgeAggregate.create({
        id: '',
        name: 'Judge Smith',
        totalCases: 100,
        positions: [],
        jurisdiction: 'California',
      })

      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('ID is required')
    })

    it('should reject empty name', () => {
      const result = JudgeAggregate.create({
        id: 'judge-1',
        name: '',
        totalCases: 100,
        positions: [],
        jurisdiction: 'California',
      })

      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('name is required')
    })

    it('should reject negative case count', () => {
      const result = JudgeAggregate.create({
        id: 'judge-1',
        name: 'Judge Smith',
        totalCases: -10,
        positions: [],
        jurisdiction: 'California',
      })

      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('cannot be negative')
    })
  })

  describe('assignToCourt', () => {
    it('should assign judge to court successfully', () => {
      const judge = JudgeAggregate.create({
        id: 'judge-1',
        name: 'Judge Smith',
        totalCases: 100,
        positions: [],
        jurisdiction: 'California',
      }).unwrap()

      const result = judge.assignToCourt(
        'court-1',
        'Superior Court of California',
        'primary',
        new Date('2020-01-01')
      )

      expect(result.isOk()).toBe(true)
      expect(judge.getActivePositions().length).toBe(1)
      expect(judge.getPrimaryCourt()?.courtId).toBe('court-1')
    })

    it('should reject multiple active primary positions', () => {
      const judge = JudgeAggregate.create({
        id: 'judge-1',
        name: 'Judge Smith',
        totalCases: 100,
        positions: [],
        jurisdiction: 'California',
      }).unwrap()

      // First assignment succeeds
      judge.assignToCourt('court-1', 'Superior Court 1', 'primary', new Date('2020-01-01'))

      // Second primary assignment should fail
      const result = judge.assignToCourt(
        'court-2',
        'Superior Court 2',
        'primary',
        new Date('2020-06-01')
      )

      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('already has an active primary position')
    })

    it('should allow visiting position alongside primary', () => {
      const judge = JudgeAggregate.create({
        id: 'judge-1',
        name: 'Judge Smith',
        totalCases: 100,
        positions: [],
        jurisdiction: 'California',
      }).unwrap()

      judge.assignToCourt('court-1', 'Superior Court 1', 'primary', new Date('2020-01-01'))
      const result = judge.assignToCourt(
        'court-2',
        'Superior Court 2',
        'visiting',
        new Date('2020-06-01')
      )

      expect(result.isOk()).toBe(true)
      expect(judge.getActivePositions().length).toBe(2)
    })

    it('should detect temporal overlap in same court', () => {
      const judge = JudgeAggregate.create({
        id: 'judge-1',
        name: 'Judge Smith',
        totalCases: 100,
        positions: [],
        jurisdiction: 'California',
      }).unwrap()

      judge.assignToCourt('court-1', 'Superior Court', 'primary', new Date('2020-01-01'))

      const result = judge.assignToCourt(
        'court-1',
        'Superior Court',
        'visiting',
        new Date('2020-06-01')
      )

      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('overlapping position')
    })

    it('should publish domain event on assignment', () => {
      const judge = JudgeAggregate.create({
        id: 'judge-1',
        name: 'Judge Smith',
        totalCases: 100,
        positions: [],
        jurisdiction: 'California',
      }).unwrap()

      judge.assignToCourt('court-1', 'Superior Court', 'primary', new Date('2020-01-01'))

      const events = judge.collectDomainEvents()
      expect(events.length).toBe(1)
      expect(events[0].eventType).toBe('JudgeAssignedToCourt')
    })
  })

  describe('retireFromPosition', () => {
    it('should retire judge from position', () => {
      const judge = JudgeAggregate.create({
        id: 'judge-1',
        name: 'Judge Smith',
        totalCases: 100,
        positions: [],
        jurisdiction: 'California',
      }).unwrap()

      judge.assignToCourt('court-1', 'Superior Court', 'primary', new Date('2000-01-01'))

      const result = judge.retireFromPosition('court-1', new Date('2020-01-01'), 'full')

      expect(result.isOk()).toBe(true)
      expect(judge.isActive()).toBe(false)
    })

    it('should reject retirement date before start date', () => {
      const judge = JudgeAggregate.create({
        id: 'judge-1',
        name: 'Judge Smith',
        totalCases: 100,
        positions: [],
        jurisdiction: 'California',
      }).unwrap()

      judge.assignToCourt('court-1', 'Superior Court', 'primary', new Date('2020-01-01'))

      const result = judge.retireFromPosition('court-1', new Date('2019-01-01'), 'full')

      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('cannot be before')
    })

    it('should reject retirement from non-existent position', () => {
      const judge = JudgeAggregate.create({
        id: 'judge-1',
        name: 'Judge Smith',
        totalCases: 100,
        positions: [],
        jurisdiction: 'California',
      }).unwrap()

      const result = judge.retireFromPosition('court-1', new Date('2020-01-01'), 'full')

      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('No active position')
    })

    it('should publish retirement event', () => {
      const judge = JudgeAggregate.create({
        id: 'judge-1',
        name: 'Judge Smith',
        totalCases: 100,
        positions: [],
        jurisdiction: 'California',
      }).unwrap()

      judge.assignToCourt('court-1', 'Superior Court', 'primary', new Date('2000-01-01'))
      judge.collectDomainEvents() // Clear assignment event

      judge.retireFromPosition('court-1', new Date('2020-01-01'), 'full')

      const events = judge.collectDomainEvents()
      expect(events.length).toBe(1)
      expect(events[0].eventType).toBe('JudgeRetired')
    })
  })

  describe('canCalculateBiasMetrics', () => {
    it('should return true for judge with 500+ cases', () => {
      const judge = JudgeAggregate.create({
        id: 'judge-1',
        name: 'Judge Smith',
        totalCases: 600,
        positions: [],
        jurisdiction: 'California',
      }).unwrap()

      expect(judge.canCalculateBiasMetrics()).toBe(true)
    })

    it('should return false for judge with less than 500 cases', () => {
      const judge = JudgeAggregate.create({
        id: 'judge-1',
        name: 'Judge Smith',
        totalCases: 400,
        positions: [],
        jurisdiction: 'California',
      }).unwrap()

      expect(judge.canCalculateBiasMetrics()).toBe(false)
    })
  })

  describe('calculateBiasMetrics', () => {
    it('should calculate metrics for eligible judge', () => {
      const judge = JudgeAggregate.create({
        id: 'judge-1',
        name: 'Judge Smith',
        totalCases: 600,
        positions: [],
        jurisdiction: 'California',
      }).unwrap()

      const result = judge.calculateBiasMetrics({
        consistencyScore: 85,
        speedScore: 75,
        settlementPreference: 10,
        riskTolerance: 60,
        predictabilityScore: 80,
      })

      expect(result.isOk()).toBe(true)
      expect(judge.biasMetrics).toBeDefined()
      expect(judge.biasMetrics?.consistencyScore).toBe(85)
    })

    it('should reject calculation for ineligible judge', () => {
      const judge = JudgeAggregate.create({
        id: 'judge-1',
        name: 'Judge Smith',
        totalCases: 400,
        positions: [],
        jurisdiction: 'California',
      }).unwrap()

      const result = judge.calculateBiasMetrics({
        consistencyScore: 85,
        speedScore: 75,
        settlementPreference: 10,
        riskTolerance: 60,
        predictabilityScore: 80,
      })

      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('Minimum 500 cases')
    })

    it('should publish eligibility event on first calculation', () => {
      const judge = JudgeAggregate.create({
        id: 'judge-1',
        name: 'Judge Smith',
        totalCases: 600,
        positions: [],
        jurisdiction: 'California',
      }).unwrap()

      judge.calculateBiasMetrics({
        consistencyScore: 85,
        speedScore: 75,
        settlementPreference: 10,
        riskTolerance: 60,
        predictabilityScore: 80,
      })

      const events = judge.collectDomainEvents()
      expect(events.some((e) => e.eventType === 'JudgeEligibleForBiasAnalysis')).toBe(true)
      expect(events.some((e) => e.eventType === 'BiasMetricsCalculated')).toBe(true)
    })
  })

  describe('updateCaseCount', () => {
    it('should update case count', () => {
      const judge = JudgeAggregate.create({
        id: 'judge-1',
        name: 'Judge Smith',
        totalCases: 100,
        positions: [],
        jurisdiction: 'California',
      }).unwrap()

      const result = judge.updateCaseCount(150)
      expect(result.isOk()).toBe(true)
      expect(judge.totalCases).toBe(150)
    })

    it('should reject negative case count', () => {
      const judge = JudgeAggregate.create({
        id: 'judge-1',
        name: 'Judge Smith',
        totalCases: 100,
        positions: [],
        jurisdiction: 'California',
      }).unwrap()

      const result = judge.updateCaseCount(-10)
      expect(result.isErr()).toBe(true)
    })

    it('should reject decreasing case count', () => {
      const judge = JudgeAggregate.create({
        id: 'judge-1',
        name: 'Judge Smith',
        totalCases: 100,
        positions: [],
        jurisdiction: 'California',
      }).unwrap()

      const result = judge.updateCaseCount(50)
      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('cannot decrease')
    })
  })

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const judge = JudgeAggregate.create({
        id: 'judge-1',
        name: 'Judge Smith',
        totalCases: 100,
        positions: [],
        jurisdiction: 'California',
      }).unwrap()

      const json = judge.toJSON()
      expect(json.id).toBe('judge-1')
      expect(json.name).toBe('Judge Smith')
      expect(json.totalCases).toBe(100)
    })

    it('should deserialize from JSON', () => {
      const json = {
        id: 'judge-1',
        name: 'Judge Smith',
        totalCases: 100,
        positions: [],
        jurisdiction: 'California',
      }

      const result = JudgeAggregate.fromJSON(json)
      expect(result.isOk()).toBe(true)
      expect(result.unwrap().id).toBe('judge-1')
    })
  })
})
