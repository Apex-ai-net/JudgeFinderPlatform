/**
 * Judge Aggregate Root
 *
 * Encapsulates all business rules related to judges and their positions.
 * Maintains consistency boundaries and publishes domain events.
 *
 * Business Rules:
 * - Minimum 500 cases required for bias metrics calculation
 * - Only one active primary position per judge
 * - Position dates must not overlap for same court
 * - Retirement must follow temporal ordering
 */

import { Result, BusinessRuleViolationError, InvariantViolationError } from '../Result'
import {
  DomainEvent,
  JudgeAssignedToCourt,
  JudgeRetired,
  JudgeEligibleForBiasAnalysis,
  BiasMetricsCalculated,
  CourtAssignmentConflictDetected,
} from '../events/DomainEvents'

export interface CourtPosition {
  courtId: string
  courtName: string
  assignmentType: 'primary' | 'visiting' | 'temporary' | 'retired'
  startDate: Date
  endDate?: Date
  positionTitle?: string
  isActive: boolean
}

export interface BiasMetrics {
  consistencyScore: number
  speedScore: number
  settlementPreference: number
  riskTolerance: number
  predictabilityScore: number
  calculatedAt: Date
  casesAnalyzed: number
}

export interface JudgeProps {
  id: string
  name: string
  totalCases: number
  positions: CourtPosition[]
  biasMetrics?: BiasMetrics
  jurisdiction: string
}

/**
 * Judge Aggregate Root
 *
 * Main aggregate for judge-related business logic.
 * Controls all changes to judge state and enforces business invariants.
 */
export class JudgeAggregate {
  private readonly _domainEvents: DomainEvent[] = []
  private readonly MINIMUM_CASES_FOR_BIAS = 500

  private constructor(
    private readonly _id: string,
    private _name: string,
    private _totalCases: number,
    private _positions: CourtPosition[],
    private _biasMetrics: BiasMetrics | undefined,
    private readonly _jurisdiction: string
  ) {}

  /**
   * Creates a new Judge aggregate
   */
  static create(props: JudgeProps): Result<JudgeAggregate, InvariantViolationError> {
    // Validate required fields
    if (!props.id || !props.id.trim()) {
      return Result.err(new InvariantViolationError('Judge ID is required'))
    }

    if (!props.name || !props.name.trim()) {
      return Result.err(new InvariantViolationError('Judge name is required'))
    }

    if (props.totalCases < 0) {
      return Result.err(new InvariantViolationError('Total cases cannot be negative'))
    }

    if (!props.jurisdiction || !props.jurisdiction.trim()) {
      return Result.err(new InvariantViolationError('Jurisdiction is required'))
    }

    return Result.ok(
      new JudgeAggregate(
        props.id,
        props.name,
        props.totalCases,
        props.positions || [],
        props.biasMetrics,
        props.jurisdiction
      )
    )
  }

  /**
   * Assigns judge to a court
   * Enforces single active primary position rule
   */
  assignToCourt(
    courtId: string,
    courtName: string,
    assignmentType: 'primary' | 'visiting' | 'temporary' | 'retired',
    startDate: Date,
    positionTitle?: string
  ): Result<void, BusinessRuleViolationError> {
    // Check for existing active primary position
    if (assignmentType === 'primary') {
      const existingPrimary = this._positions.find(
        (p) => p.assignmentType === 'primary' && p.isActive
      )

      if (existingPrimary) {
        // Publish conflict detection event
        this._domainEvents.push(
          new CourtAssignmentConflictDetected(
            this._id,
            existingPrimary.courtId,
            courtId,
            'multiple_primary_positions'
          )
        )

        return Result.err(
          new BusinessRuleViolationError('Judge already has an active primary position', {
            judgeId: this._id,
            existingCourt: existingPrimary.courtName,
            newCourt: courtName,
          })
        )
      }
    }

    // Check for temporal overlap in same court
    const overlapping = this._positions.find((p) => {
      if (p.courtId !== courtId) return false
      if (!p.isActive && p.endDate && p.endDate < startDate) return false
      if (p.endDate && startDate > p.endDate) return false
      return true
    })

    if (overlapping) {
      this._domainEvents.push(
        new CourtAssignmentConflictDetected(
          this._id,
          overlapping.courtId,
          courtId,
          'temporal_overlap'
        )
      )

      return Result.err(
        new BusinessRuleViolationError('Judge already has an overlapping position at this court', {
          judgeId: this._id,
          courtId,
          existingPosition: overlapping,
        })
      )
    }

    // Add new position
    const newPosition: CourtPosition = {
      courtId,
      courtName,
      assignmentType,
      startDate,
      positionTitle,
      isActive: true,
    }

    this._positions.push(newPosition)

    // Publish domain event
    this._domainEvents.push(
      new JudgeAssignedToCourt(
        this._id,
        courtId,
        courtName,
        assignmentType,
        startDate,
        positionTitle
      )
    )

    return Result.ok(undefined)
  }

  /**
   * Retires judge from a position
   * Validates temporal ordering
   */
  retireFromPosition(
    courtId: string,
    retirementDate: Date,
    retirementType: 'full' | 'senior_status' | 'temporary'
  ): Result<void, BusinessRuleViolationError> {
    const position = this._positions.find((p) => p.courtId === courtId && p.isActive)

    if (!position) {
      return Result.err(
        new BusinessRuleViolationError('No active position found at specified court', {
          judgeId: this._id,
          courtId,
        })
      )
    }

    // Validate retirement date is after start date
    if (retirementDate < position.startDate) {
      return Result.err(
        new BusinessRuleViolationError('Retirement date cannot be before position start date', {
          judgeId: this._id,
          courtId,
          startDate: position.startDate,
          retirementDate,
        })
      )
    }

    // Calculate years of service
    const yearsOfService =
      (retirementDate.getTime() - position.startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)

    // Update position
    position.isActive = false
    position.endDate = retirementDate

    // Publish domain event
    this._domainEvents.push(
      new JudgeRetired(
        this._id,
        courtId,
        retirementDate,
        retirementType,
        Math.floor(yearsOfService)
      )
    )

    return Result.ok(undefined)
  }

  /**
   * Checks if judge can have bias metrics calculated
   * Requires minimum 500 cases
   */
  canCalculateBiasMetrics(): boolean {
    return this._totalCases >= this.MINIMUM_CASES_FOR_BIAS
  }

  /**
   * Calculates and stores bias metrics
   * Enforces minimum case requirement
   */
  calculateBiasMetrics(
    metrics: Omit<BiasMetrics, 'calculatedAt' | 'casesAnalyzed'>
  ): Result<void, BusinessRuleViolationError> {
    if (!this.canCalculateBiasMetrics()) {
      return Result.err(
        new BusinessRuleViolationError(
          `Minimum ${this.MINIMUM_CASES_FOR_BIAS} cases required for bias analysis`,
          {
            judgeId: this._id,
            totalCases: this._totalCases,
            minimumRequired: this.MINIMUM_CASES_FOR_BIAS,
          }
        )
      )
    }

    // If first time eligible, publish eligibility event
    if (!this._biasMetrics) {
      this._domainEvents.push(
        new JudgeEligibleForBiasAnalysis(this._id, this._totalCases, this.MINIMUM_CASES_FOR_BIAS)
      )
    }

    this._biasMetrics = {
      ...metrics,
      calculatedAt: new Date(),
      casesAnalyzed: this._totalCases,
    }

    // Publish calculation event
    this._domainEvents.push(
      new BiasMetricsCalculated(
        this._id,
        {
          consistencyScore: metrics.consistencyScore,
          speedScore: metrics.speedScore,
          settlementPreference: metrics.settlementPreference,
          riskTolerance: metrics.riskTolerance,
          predictabilityScore: metrics.predictabilityScore,
        },
        this._totalCases
      )
    )

    return Result.ok(undefined)
  }

  /**
   * Updates case count
   * Validates non-negative values
   */
  updateCaseCount(newCount: number): Result<void, InvariantViolationError> {
    if (newCount < 0) {
      return Result.err(new InvariantViolationError('Case count cannot be negative'))
    }

    if (newCount < this._totalCases) {
      return Result.err(new InvariantViolationError('Case count cannot decrease'))
    }

    this._totalCases = newCount

    return Result.ok(undefined)
  }

  /**
   * Gets active court positions
   */
  getActivePositions(): CourtPosition[] {
    return this._positions.filter((p) => p.isActive)
  }

  /**
   * Gets position history
   */
  getPositionHistory(): CourtPosition[] {
    return [...this._positions].sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
  }

  /**
   * Checks if judge is currently active
   */
  isActive(): boolean {
    return this.getActivePositions().length > 0
  }

  /**
   * Gets primary court if exists
   */
  getPrimaryCourt(): CourtPosition | undefined {
    return this._positions.find((p) => p.assignmentType === 'primary' && p.isActive)
  }

  /**
   * Collects and clears domain events
   */
  collectDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents]
    this._domainEvents.length = 0
    return events
  }

  /**
   * Getters
   */
  get id(): string {
    return this._id
  }

  get name(): string {
    return this._name
  }

  get totalCases(): number {
    return this._totalCases
  }

  get biasMetrics(): BiasMetrics | undefined {
    return this._biasMetrics
  }

  get jurisdiction(): string {
    return this._jurisdiction
  }

  get positions(): ReadonlyArray<CourtPosition> {
    return this._positions
  }

  /**
   * Converts to plain object for persistence
   */
  toJSON(): JudgeProps {
    return {
      id: this._id,
      name: this._name,
      totalCases: this._totalCases,
      positions: this._positions,
      biasMetrics: this._biasMetrics,
      jurisdiction: this._jurisdiction,
    }
  }

  /**
   * Reconstitutes aggregate from persistence
   */
  static fromJSON(props: JudgeProps): Result<JudgeAggregate, InvariantViolationError> {
    return JudgeAggregate.create(props)
  }
}
