/**
 * Judge Eligibility Specifications
 *
 * Encapsulates business rules for judge eligibility in various contexts.
 * Uses the Specification pattern for composable validation logic.
 */

import { Specification } from './Specification'
import type { JudgeAggregate } from '../aggregates/JudgeAggregate'

/**
 * Minimum Case Requirement Specification
 *
 * Checks if judge has minimum number of cases.
 */
export class MinimumCaseRequirementSpec extends Specification<JudgeAggregate> {
  constructor(private readonly minimumCases: number) {
    super()
  }

  isSatisfiedBy(judge: JudgeAggregate): boolean {
    return judge.totalCases >= this.minimumCases
  }

  getMinimumCases(): number {
    return this.minimumCases
  }
}

/**
 * Active Position Required Specification
 *
 * Checks if judge has at least one active position.
 */
export class ActivePositionRequiredSpec extends Specification<JudgeAggregate> {
  isSatisfiedBy(judge: JudgeAggregate): boolean {
    return judge.isActive()
  }
}

/**
 * Primary Position Required Specification
 *
 * Checks if judge has an active primary court assignment.
 */
export class PrimaryPositionRequiredSpec extends Specification<JudgeAggregate> {
  isSatisfiedBy(judge: JudgeAggregate): boolean {
    return judge.getPrimaryCourt() !== undefined
  }
}

/**
 * Jurisdiction Match Specification
 *
 * Checks if judge belongs to a specific jurisdiction.
 */
export class JurisdictionMatchSpec extends Specification<JudgeAggregate> {
  constructor(private readonly targetJurisdiction: string) {
    super()
  }

  isSatisfiedBy(judge: JudgeAggregate): boolean {
    return judge.jurisdiction.toLowerCase() === this.targetJurisdiction.toLowerCase()
  }
}

/**
 * Bias Metrics Available Specification
 *
 * Checks if judge has calculated bias metrics.
 */
export class BiasMetricsAvailableSpec extends Specification<JudgeAggregate> {
  isSatisfiedBy(judge: JudgeAggregate): boolean {
    return judge.biasMetrics !== undefined
  }
}

/**
 * Court Assignment Specification
 *
 * Checks if judge is assigned to a specific court.
 */
export class CourtAssignmentSpec extends Specification<JudgeAggregate> {
  constructor(private readonly courtId: string) {
    super()
  }

  isSatisfiedBy(judge: JudgeAggregate): boolean {
    return judge.positions.some((p) => p.courtId === this.courtId && p.isActive)
  }
}

/**
 * Bias Analysis Eligibility Specification (Composite)
 *
 * Composite specification that checks all requirements for bias analysis.
 * Combines multiple business rules into a single eligibility check.
 */
export class BiasAnalysisEligibilitySpec extends Specification<JudgeAggregate> {
  private readonly minimumCaseSpec: MinimumCaseRequirementSpec
  private readonly activePositionSpec: ActivePositionRequiredSpec

  constructor(minimumCases: number = 500) {
    super()
    this.minimumCaseSpec = new MinimumCaseRequirementSpec(minimumCases)
    this.activePositionSpec = new ActivePositionRequiredSpec()
  }

  isSatisfiedBy(judge: JudgeAggregate): boolean {
    return this.minimumCaseSpec.isSatisfiedBy(judge) && this.activePositionSpec.isSatisfiedBy(judge)
  }

  /**
   * Gets detailed eligibility status with reasons
   */
  getEligibilityStatus(judge: JudgeAggregate): {
    eligible: boolean
    reasons: string[]
  } {
    const reasons: string[] = []

    if (!this.minimumCaseSpec.isSatisfiedBy(judge)) {
      reasons.push(
        `Requires minimum ${this.minimumCaseSpec.getMinimumCases()} cases (current: ${judge.totalCases})`
      )
    }

    if (!this.activePositionSpec.isSatisfiedBy(judge)) {
      reasons.push('Requires at least one active court position')
    }

    return {
      eligible: reasons.length === 0,
      reasons,
    }
  }
}

/**
 * Senior Status Eligibility Specification
 *
 * Checks if judge is eligible for senior status based on years of service.
 * Typically requires 15+ years of service and age 65+, or combination totaling 80.
 */
export class SeniorStatusEligibilitySpec extends Specification<JudgeAggregate> {
  constructor(
    private readonly minimumYearsOfService: number = 15,
    private readonly minimumAge: number = 65
  ) {
    super()
  }

  isSatisfiedBy(judge: JudgeAggregate): boolean {
    const primaryPosition = judge.getPrimaryCourt()
    if (!primaryPosition) return false

    const yearsOfService = this.calculateYearsOfService(primaryPosition.startDate)

    // Simplified rule: 15+ years of service
    // In reality, would need judge's age from additional data
    return yearsOfService >= this.minimumYearsOfService
  }

  private calculateYearsOfService(startDate: Date): number {
    const now = new Date()
    const diffInMs = now.getTime() - startDate.getTime()
    return diffInMs / (1000 * 60 * 60 * 24 * 365.25)
  }
}

/**
 * Advertising Eligibility Specification
 *
 * Checks if a judge profile is eligible for advertising placements.
 * Requires minimum case volume and active status.
 */
export class AdvertisingEligibilitySpec extends Specification<JudgeAggregate> {
  private readonly minimumCaseSpec: MinimumCaseRequirementSpec
  private readonly activePositionSpec: ActivePositionRequiredSpec

  constructor(minimumCases: number = 100) {
    super()
    this.minimumCaseSpec = new MinimumCaseRequirementSpec(minimumCases)
    this.activePositionSpec = new ActivePositionRequiredSpec()
  }

  isSatisfiedBy(judge: JudgeAggregate): boolean {
    return this.minimumCaseSpec.isSatisfiedBy(judge) && this.activePositionSpec.isSatisfiedBy(judge)
  }
}

/**
 * High Profile Judge Specification
 *
 * Identifies judges with significant case volumes and visibility.
 * Used for premium advertising tier determination.
 */
export class HighProfileJudgeSpec extends Specification<JudgeAggregate> {
  constructor(
    private readonly minimumCases: number = 1000,
    private readonly requireBiasMetrics: boolean = true
  ) {
    super()
  }

  isSatisfiedBy(judge: JudgeAggregate): boolean {
    const hasSufficientCases = judge.totalCases >= this.minimumCases
    const hasPrimaryPosition = judge.getPrimaryCourt() !== undefined
    const hasBiasMetrics = this.requireBiasMetrics ? judge.biasMetrics !== undefined : true

    return hasSufficientCases && hasPrimaryPosition && hasBiasMetrics
  }
}
