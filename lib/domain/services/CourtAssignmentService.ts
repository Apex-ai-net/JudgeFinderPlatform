/**
 * Court Assignment Domain Service
 *
 * Coordinates complex business logic for court assignments.
 * Enforces rules that span multiple aggregates.
 *
 * Business Rules:
 * - Single active primary position per judge
 * - No temporal overlap within same court
 * - Jurisdiction validation
 * - Assignment type transitions
 */

import { Result, BusinessRuleViolationError } from '../Result'
import type { JudgeAggregate, CourtPosition } from '../aggregates/JudgeAggregate'

export interface AssignmentValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface AssignmentConflict {
  type: 'temporal_overlap' | 'multiple_primary' | 'jurisdiction_mismatch'
  existingPosition: CourtPosition
  proposedPosition: Partial<CourtPosition>
  severity: 'blocking' | 'warning'
  message: string
}

/**
 * Court Assignment Domain Service
 *
 * Handles complex assignment validation and coordination logic.
 */
export class CourtAssignmentService {
  /**
   * Validates a proposed court assignment
   * Checks all business rules before assignment
   */
  validateAssignment(
    judge: JudgeAggregate,
    courtId: string,
    courtName: string,
    assignmentType: 'primary' | 'visiting' | 'temporary' | 'retired',
    startDate: Date,
    jurisdiction: string
  ): Result<AssignmentValidation, never> {
    const errors: string[] = []
    const warnings: string[] = []

    // Check jurisdiction match
    if (judge.jurisdiction !== jurisdiction) {
      errors.push(
        `Jurisdiction mismatch: Judge is in ${judge.jurisdiction}, court is in ${jurisdiction}`
      )
    }

    // Check for multiple primary positions
    if (assignmentType === 'primary') {
      const existingPrimary = judge.getActivePositions().find((p) => p.assignmentType === 'primary')

      if (existingPrimary) {
        errors.push(`Judge already has primary position at ${existingPrimary.courtName}`)
      }
    }

    // Check for temporal overlaps in same court
    const overlappingPosition = this.findTemporalOverlap(judge.positions, courtId, startDate)

    if (overlappingPosition) {
      errors.push(
        `Temporal overlap with existing position at ${overlappingPosition.courtName} ` +
          `(${overlappingPosition.startDate.toISOString().split('T')[0]})`
      )
    }

    // Check if judge is already retired
    const retiredPosition = judge.positions.find(
      (p) => p.assignmentType === 'retired' && p.isActive
    )

    if (retiredPosition && assignmentType !== 'retired') {
      warnings.push('Assigning new position to retired judge - verify this is correct')
    }

    // Check if assigning to same court where judge was previously
    const previousAtCourt = judge.positions.find((p) => p.courtId === courtId && !p.isActive)

    if (previousAtCourt) {
      warnings.push(
        `Judge previously served at this court (${previousAtCourt.startDate.toISOString().split('T')[0]} - ` +
          `${previousAtCourt.endDate?.toISOString().split('T')[0] || 'present'})`
      )
    }

    return Result.ok({
      isValid: errors.length === 0,
      errors,
      warnings,
    })
  }

  /**
   * Finds temporal overlaps for a proposed assignment
   */
  private findTemporalOverlap(
    positions: ReadonlyArray<CourtPosition>,
    courtId: string,
    proposedStartDate: Date,
    proposedEndDate?: Date
  ): CourtPosition | null {
    for (const position of positions) {
      // Skip different courts
      if (position.courtId !== courtId) continue

      // Check if position is still active
      if (position.isActive && !proposedEndDate) {
        return position
      }

      // Check for date overlap
      const positionEnd = position.endDate || new Date('2099-12-31')
      const proposedEnd = proposedEndDate || new Date('2099-12-31')

      const hasOverlap = proposedStartDate <= positionEnd && proposedEnd >= position.startDate

      if (hasOverlap) {
        return position
      }
    }

    return null
  }

  /**
   * Detects all conflicts for a proposed assignment
   */
  detectConflicts(
    judge: JudgeAggregate,
    courtId: string,
    assignmentType: 'primary' | 'visiting' | 'temporary' | 'retired',
    startDate: Date,
    endDate?: Date
  ): AssignmentConflict[] {
    const conflicts: AssignmentConflict[] = []

    // Check for multiple primary positions
    if (assignmentType === 'primary') {
      const existingPrimary = judge.getActivePositions().find((p) => p.assignmentType === 'primary')

      if (existingPrimary) {
        conflicts.push({
          type: 'multiple_primary',
          existingPosition: existingPrimary,
          proposedPosition: { courtId, assignmentType, startDate, endDate },
          severity: 'blocking',
          message: 'Cannot have multiple active primary positions',
        })
      }
    }

    // Check for temporal overlaps
    const overlap = this.findTemporalOverlap(judge.positions, courtId, startDate, endDate)

    if (overlap) {
      conflicts.push({
        type: 'temporal_overlap',
        existingPosition: overlap,
        proposedPosition: { courtId, assignmentType, startDate, endDate },
        severity: 'blocking',
        message: 'Position dates overlap with existing assignment',
      })
    }

    return conflicts
  }

  /**
   * Validates assignment type transitions
   * Some transitions are not allowed (e.g., retired -> primary)
   */
  validateTransition(
    fromType: 'primary' | 'visiting' | 'temporary' | 'retired',
    toType: 'primary' | 'visiting' | 'temporary' | 'retired'
  ): Result<void, BusinessRuleViolationError> {
    // Cannot transition from retired to active positions
    if (fromType === 'retired' && toType !== 'retired') {
      return Result.err(
        new BusinessRuleViolationError('Cannot transition from retired to active position', {
          fromType,
          toType,
        })
      )
    }

    // Temporary positions should not become primary
    if (fromType === 'temporary' && toType === 'primary') {
      return Result.err(
        new BusinessRuleViolationError('Temporary positions typically should not become primary', {
          fromType,
          toType,
        })
      )
    }

    return Result.ok(undefined)
  }

  /**
   * Calculates workload distribution across positions
   * Ensures total workload doesn't exceed 100%
   */
  calculateWorkloadDistribution(positions: ReadonlyArray<CourtPosition>): Map<string, number> {
    const workloadMap = new Map<string, number>()

    // Assign default workload based on assignment type
    for (const position of positions) {
      if (!position.isActive) continue

      let workload = 0
      switch (position.assignmentType) {
        case 'primary':
          workload = 100
          break
        case 'visiting':
          workload = 25
          break
        case 'temporary':
          workload = 50
          break
        case 'retired':
          workload = 0
          break
      }

      workloadMap.set(position.courtId, workload)
    }

    return workloadMap
  }

  /**
   * Validates total workload doesn't exceed capacity
   */
  validateWorkloadCapacity(
    positions: ReadonlyArray<CourtPosition>
  ): Result<void, BusinessRuleViolationError> {
    const workloadMap = this.calculateWorkloadDistribution(positions)
    const totalWorkload = Array.from(workloadMap.values()).reduce((sum, w) => sum + w, 0)

    if (totalWorkload > 100) {
      return Result.err(
        new BusinessRuleViolationError('Total workload exceeds 100%', {
          totalWorkload,
          positions: Array.from(workloadMap.entries()).map(([courtId, workload]) => ({
            courtId,
            workload,
          })),
        })
      )
    }

    return Result.ok(undefined)
  }

  /**
   * Recommends end date for position based on assignment type
   */
  recommendEndDate(
    assignmentType: 'primary' | 'visiting' | 'temporary' | 'retired',
    startDate: Date
  ): Date | null {
    const start = new Date(startDate)

    switch (assignmentType) {
      case 'visiting':
        // Visiting assignments typically last 3-6 months
        start.setMonth(start.getMonth() + 6)
        return start

      case 'temporary':
        // Temporary assignments typically last 1 year
        start.setFullYear(start.getFullYear() + 1)
        return start

      case 'primary':
      case 'retired':
        // Primary and retired positions are indefinite
        return null
    }
  }

  /**
   * Checks if assignment requires confirmation/approval
   */
  requiresApproval(assignmentType: 'primary' | 'visiting' | 'temporary' | 'retired'): boolean {
    // Primary appointments typically require senate confirmation
    return assignmentType === 'primary'
  }
}
