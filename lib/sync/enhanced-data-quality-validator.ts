/**
 * Enhanced Data Quality Validator
 *
 * Extends the base DataQualityValidator with additional validation rules:
 * - Judge primary court rule (single active primary assignment)
 * - Temporal overlap detection in court assignments
 * - Jurisdiction boundary validation
 * - Name standardization checks
 * - Outcome taxonomy validation
 *
 * Implements specifications from .cursor/rules/judicial-data-models.mdc
 */

import { DataQualityValidator, ValidationIssue, ValidationReport } from './data-quality-validator'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

export interface EnhancedValidationIssue extends ValidationIssue {
  fix_confidence?: number // 0-100 confidence in auto-fix
  impacted_records?: string[] // List of affected record IDs
  fix_priority?: 1 | 2 | 3 | 4 // 1=critical, 4=low
}

export interface TemporalOverlap {
  judge_id: string
  judge_name: string
  court_id: string
  court_name: string
  assignments: Array<{
    id: string
    start_date: string
    end_date: string | null
    assignment_type: string
  }>
  overlap_days: number
}

export interface JurisdictionMismatch {
  judge_id: string
  judge_name: string
  judge_jurisdiction: string
  court_id: string
  court_name: string
  court_jurisdiction: string
  assignment_id: string
}

export interface NameStandardizationIssue {
  entity_type: 'judge' | 'court'
  entity_id: string
  current_name: string
  issues: string[]
  suggested_name?: string
}

export interface OutcomeTaxonomyIssue {
  case_id: string
  case_name: string
  current_outcome: string
  valid_outcomes: string[]
  suggested_mapping?: string
}

/**
 * Enhanced Data Quality Validator
 * Extends base validator with advanced validation rules
 */
export class EnhancedDataQualityValidator extends DataQualityValidator {
  // Valid outcome taxonomy (from decision-helpers.ts)
  private readonly VALID_OUTCOMES = [
    'settled',
    'dismissed',
    'judgment',
    'granted',
    'denied',
    'withdrawn',
    'remanded',
    'affirmed',
    'reversed',
    'vacated',
    'other',
  ] as const

  // Valid assignment types
  private readonly VALID_ASSIGNMENT_TYPES = ['primary', 'visiting', 'temporary', 'retired'] as const

  /**
   * Run enhanced validation suite
   * Includes all base validations plus enhanced rules
   */
  async runEnhancedValidation(): Promise<ValidationReport> {
    logger.info('Starting enhanced data quality validation')

    // Run base validation first
    await this.runFullValidation()

    // Run enhanced validations
    await Promise.all([
      this.validatePrimaryCourtRule(),
      this.validateTemporalOverlaps(),
      this.validateJurisdictionBoundaries(),
      this.validateNameStandardization(),
      this.validateOutcomeTaxonomy(),
      this.validateMinimumCaseThreshold(),
    ])

    return await this.generateReport()
  }

  /**
   * Validate Judge Primary Court Rule
   * Each judge must have exactly ONE active primary court assignment
   */
  private async validatePrimaryCourtRule(): Promise<void> {
    logger.info('Validating primary court rule (single active primary per judge)')

    try {
      // Find judges with multiple active primary assignments
      const { data: multiplePrimary, error } = await this.supabase
        .from('judge_court_assignments')
        .select(
          `
          id,
          judge_id,
          court_id,
          assignment_type,
          start_date,
          end_date,
          judges!inner(id, name),
          courts!inner(id, name)
        `
        )
        .eq('assignment_type', 'primary')
        .is('end_date', null) // Active assignments

      if (error) {
        logger.error('Error querying primary assignments', { error })
        return
      }

      if (!multiplePrimary || multiplePrimary.length === 0) {
        return
      }

      // Group by judge_id to find duplicates
      const judgeAssignments = new Map<string, typeof multiplePrimary>()

      for (const assignment of multiplePrimary) {
        const judgeId = assignment.judge_id
        if (!judgeAssignments.has(judgeId)) {
          judgeAssignments.set(judgeId, [])
        }
        judgeAssignments.get(judgeId)!.push(assignment)
      }

      // Flag judges with multiple primary assignments
      for (const [judgeId, assignments] of judgeAssignments.entries()) {
        if (assignments.length > 1) {
          const judge = assignments[0].judges as any
          const courtNames = assignments.map((a) => (a.courts as any).name).join(', ')

          this.issues.push({
            type: 'inconsistent_relationship',
            severity: 'critical',
            entity: 'assignment',
            entityId: judgeId,
            message: `Judge "${judge.name}" has ${assignments.length} active primary court assignments: ${courtNames}`,
            suggestedAction:
              'Keep most recent assignment as primary, convert others to "visiting" or set end_date',
            autoFixable: true,
            metadata: {
              judge_id: judgeId,
              judge_name: judge.name,
              assignment_ids: assignments.map((a) => a.id),
              assignment_count: assignments.length,
              fix_confidence: 90,
              impacted_records: assignments.map((a) => a.id),
            },
          })
        }
      }

      // Find judges with NO primary assignment
      const { data: allActiveJudges } = await this.supabase
        .from('judges')
        .select('id, name')
        .not('courtlistener_id', 'is', null)
        .limit(1000)

      if (allActiveJudges) {
        const judgesWithPrimary = new Set(multiplePrimary.map((a) => a.judge_id))

        for (const judge of allActiveJudges) {
          if (!judgesWithPrimary.has(judge.id)) {
            this.issues.push({
              type: 'missing_field',
              severity: 'high',
              entity: 'judge',
              entityId: judge.id,
              message: `Judge "${judge.name}" has no active primary court assignment`,
              suggestedAction:
                'Review judge assignments and set one as primary, or mark judge as retired',
              autoFixable: false,
              metadata: {
                judge_id: judge.id,
                judge_name: judge.name,
                fix_confidence: 0,
              },
            })
          }
        }
      }
    } catch (error) {
      logger.error('Primary court validation failed', { error })
    }
  }

  /**
   * Validate Temporal Overlaps
   * Court assignments must not have overlapping date ranges for the same court
   */
  private async validateTemporalOverlaps(): Promise<void> {
    logger.info('Validating temporal overlaps in court assignments')

    try {
      // Get all assignments ordered by judge and court
      const { data: assignments, error } = await this.supabase
        .from('judge_court_assignments')
        .select(
          `
          id,
          judge_id,
          court_id,
          start_date,
          end_date,
          assignment_type,
          judges!inner(id, name),
          courts!inner(id, name)
        `
        )
        .order('judge_id')
        .order('court_id')
        .order('start_date')

      if (error || !assignments) {
        logger.error('Error querying assignments', { error })
        return
      }

      // Group by judge_id + court_id
      const groupedAssignments = new Map<string, typeof assignments>()

      for (const assignment of assignments) {
        const key = `${assignment.judge_id}:${assignment.court_id}`
        if (!groupedAssignments.has(key)) {
          groupedAssignments.set(key, [])
        }
        groupedAssignments.get(key)!.push(assignment)
      }

      // Check for overlaps within each group
      for (const [key, group] of groupedAssignments.entries()) {
        if (group.length < 2) continue

        for (let i = 0; i < group.length - 1; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const a1 = group[i]
            const a2 = group[j]

            const overlap = this.checkDateOverlap(
              a1.start_date,
              a1.end_date,
              a2.start_date,
              a2.end_date
            )

            if (overlap) {
              const judge = a1.judges as any
              const court = a1.courts as any

              this.issues.push({
                type: 'inconsistent_relationship',
                severity: 'critical',
                entity: 'assignment',
                entityId: a1.id,
                message: `Temporal overlap detected for Judge "${judge.name}" at "${court.name}": ${a1.start_date} to ${a1.end_date || 'present'} overlaps with ${a2.start_date} to ${a2.end_date || 'present'}`,
                suggestedAction:
                  'Adjust end_date of earlier assignment or start_date of later assignment to eliminate overlap',
                autoFixable: true,
                metadata: {
                  judge_id: a1.judge_id,
                  judge_name: judge.name,
                  court_id: a1.court_id,
                  court_name: court.name,
                  assignment1_id: a1.id,
                  assignment2_id: a2.id,
                  assignment1_dates: {
                    start: a1.start_date,
                    end: a1.end_date,
                  },
                  assignment2_dates: {
                    start: a2.start_date,
                    end: a2.end_date,
                  },
                  fix_confidence: 85,
                  impacted_records: [a1.id, a2.id],
                },
              })
            }
          }
        }
      }
    } catch (error) {
      logger.error('Temporal overlap validation failed', { error })
    }
  }

  /**
   * Check if two date ranges overlap
   */
  private checkDateOverlap(
    start1: string,
    end1: string | null,
    start2: string,
    end2: string | null
  ): boolean {
    const s1 = new Date(start1)
    const e1 = end1 ? new Date(end1) : new Date('2099-12-31')
    const s2 = new Date(start2)
    const e2 = end2 ? new Date(end2) : new Date('2099-12-31')

    // Check for overlap: start1 <= end2 AND start2 <= end1
    return s1 <= e2 && s2 <= e1
  }

  /**
   * Validate Jurisdiction Boundaries
   * Cases must link to courts within valid jurisdictions
   * Judge jurisdictions must match their court assignments
   */
  private async validateJurisdictionBoundaries(): Promise<void> {
    logger.info('Validating jurisdiction boundaries')

    try {
      // Check judge-court jurisdiction mismatches
      const { data: mismatches, error } = await this.supabase
        .from('judge_court_assignments')
        .select(
          `
          id,
          judge_id,
          court_id,
          judges!inner(id, name, jurisdiction),
          courts!inner(id, name, jurisdiction)
        `
        )
        .limit(1000)

      if (error || !mismatches) {
        logger.error('Error querying jurisdiction data', { error })
        return
      }

      for (const assignment of mismatches) {
        const judge = assignment.judges as any
        const court = assignment.courts as any

        // Skip if either jurisdiction is null
        if (!judge.jurisdiction || !court.jurisdiction) continue

        // Normalize jurisdictions for comparison
        const judgeJurisdiction = judge.jurisdiction.toLowerCase().trim()
        const courtJurisdiction = court.jurisdiction.toLowerCase().trim()

        if (judgeJurisdiction !== courtJurisdiction) {
          this.issues.push({
            type: 'inconsistent_relationship',
            severity: 'high',
            entity: 'assignment',
            entityId: assignment.id,
            message: `Jurisdiction mismatch: Judge "${judge.name}" (${judge.jurisdiction}) assigned to court "${court.name}" (${court.jurisdiction})`,
            suggestedAction:
              'Update judge jurisdiction to match court, or remove invalid assignment',
            autoFixable: false,
            metadata: {
              judge_id: assignment.judge_id,
              judge_name: judge.name,
              judge_jurisdiction: judge.jurisdiction,
              court_id: assignment.court_id,
              court_name: court.name,
              court_jurisdiction: court.jurisdiction,
              assignment_id: assignment.id,
              fix_confidence: 0,
            },
          })
        }
      }

      // Check case-court jurisdiction alignment
      const { data: cases } = await this.supabase
        .from('cases')
        .select(
          `
          id,
          case_name,
          judge_id,
          judges!inner(id, jurisdiction),
          courts(id, jurisdiction)
        `
        )
        .not('judge_id', 'is', null)
        .limit(500)

      if (cases) {
        for (const caseRecord of cases) {
          const judge = caseRecord.judges as any
          const court = (caseRecord as any).courts

          // Cases should inherit judge's jurisdiction
          if (court && judge.jurisdiction && court.jurisdiction) {
            if (
              judge.jurisdiction.toLowerCase().trim() !== court.jurisdiction.toLowerCase().trim()
            ) {
              this.issues.push({
                type: 'inconsistent_relationship',
                severity: 'medium',
                entity: 'case',
                entityId: caseRecord.id,
                message: `Case "${caseRecord.case_name}" has judge from ${judge.jurisdiction} but court from ${court.jurisdiction}`,
                suggestedAction: 'Verify case jurisdiction assignment',
                autoFixable: false,
                metadata: {
                  case_id: caseRecord.id,
                  case_name: caseRecord.case_name,
                  judge_jurisdiction: judge.jurisdiction,
                  court_jurisdiction: court.jurisdiction,
                  fix_confidence: 0,
                },
              })
            }
          }
        }
      }
    } catch (error) {
      logger.error('Jurisdiction validation failed', { error })
    }
  }

  /**
   * Validate Name Standardization
   * Check for non-standard judge and court names
   */
  private async validateNameStandardization(): Promise<void> {
    logger.info('Validating name standardization')

    try {
      // Check judge names
      const { data: judges } = await this.supabase
        .from('judges')
        .select('id, name')
        .not('name', 'is', null)
        .limit(1000)

      if (judges) {
        for (const judge of judges) {
          const issues: string[] = []

          // Check for prefixes that should be removed
          if (/^(Hon\.|Hon |Honorable |Judge |Justice )/i.test(judge.name)) {
            issues.push('Contains title prefix (Hon., Judge, Justice)')
          }

          // Check for all caps (should be title case)
          if (judge.name === judge.name.toUpperCase() && judge.name.length > 3) {
            issues.push('Name is all uppercase')
          }

          // Check for all lowercase
          if (judge.name === judge.name.toLowerCase()) {
            issues.push('Name is all lowercase')
          }

          // Check for excessive whitespace
          if (/\s{2,}/.test(judge.name)) {
            issues.push('Contains excessive whitespace')
          }

          // Check for special characters (excluding hyphens, apostrophes, periods)
          if (/[^a-zA-Z\s\-'.,'']/.test(judge.name)) {
            issues.push('Contains invalid special characters')
          }

          if (issues.length > 0) {
            this.issues.push({
              type: 'data_integrity',
              severity: 'medium',
              entity: 'judge',
              entityId: judge.id,
              message: `Judge name "${judge.name}" has standardization issues: ${issues.join(', ')}`,
              suggestedAction: 'Standardize name format to: Last, First Middle',
              autoFixable: true,
              metadata: {
                current_name: judge.name,
                issues,
                fix_confidence: 75,
              },
            })
          }
        }
      }
    } catch (error) {
      logger.error('Name standardization validation failed', { error })
    }
  }

  /**
   * Validate Outcome Taxonomy
   * Check that case outcomes use approved taxonomy
   */
  private async validateOutcomeTaxonomy(): Promise<void> {
    logger.info('Validating outcome taxonomy')

    try {
      const { data: cases } = await this.supabase
        .from('cases')
        .select('id, case_name, outcome, status')
        .not('outcome', 'is', null)
        .limit(1000)

      if (cases) {
        for (const caseRecord of cases) {
          const outcome = (caseRecord.outcome || '').toLowerCase().trim()
          const status = (caseRecord.status || '').toLowerCase().trim()

          // Check if outcome matches valid taxonomy
          const isValid = this.VALID_OUTCOMES.some((valid) => outcome.includes(valid))

          if (!isValid && outcome.length > 0) {
            // Try to suggest a mapping
            let suggestedMapping: string | undefined

            if (outcome.includes('settle') || outcome.includes('settlement')) {
              suggestedMapping = 'settled'
            } else if (outcome.includes('dismiss')) {
              suggestedMapping = 'dismissed'
            } else if (outcome.includes('judgment') || outcome.includes('judge')) {
              suggestedMapping = 'judgment'
            } else if (outcome.includes('grant')) {
              suggestedMapping = 'granted'
            } else if (outcome.includes('deny') || outcome.includes('denied')) {
              suggestedMapping = 'denied'
            } else if (outcome.includes('withdraw')) {
              suggestedMapping = 'withdrawn'
            } else if (outcome.includes('remand')) {
              suggestedMapping = 'remanded'
            } else if (outcome.includes('affirm')) {
              suggestedMapping = 'affirmed'
            } else if (outcome.includes('reverse')) {
              suggestedMapping = 'reversed'
            } else if (outcome.includes('vacate')) {
              suggestedMapping = 'vacated'
            } else {
              suggestedMapping = 'other'
            }

            this.issues.push({
              type: 'data_integrity',
              severity: 'low',
              entity: 'case',
              entityId: caseRecord.id,
              message: `Case "${caseRecord.case_name}" has non-standard outcome: "${caseRecord.outcome}"`,
              suggestedAction: suggestedMapping
                ? `Map to standard taxonomy: "${suggestedMapping}"`
                : 'Review and map to standard outcome taxonomy',
              autoFixable: !!suggestedMapping,
              metadata: {
                case_id: caseRecord.id,
                case_name: caseRecord.case_name,
                current_outcome: caseRecord.outcome,
                suggested_mapping: suggestedMapping,
                valid_outcomes: [...this.VALID_OUTCOMES],
                fix_confidence: suggestedMapping ? 80 : 0,
              },
            })
          }
        }
      }
    } catch (error) {
      logger.error('Outcome taxonomy validation failed', { error })
    }
  }

  /**
   * Validate Minimum Case Threshold
   * Per specification: 500+ cases required for full analytics
   */
  private async validateMinimumCaseThreshold(): Promise<void> {
    logger.info('Validating minimum case threshold (500 cases for full analytics)')

    try {
      const { data: judges, error } = await this.supabase
        .from('judges')
        .select('id, name, total_cases')
        .not('courtlistener_id', 'is', null)
        .lt('total_cases', 500)
        .order('total_cases', { ascending: false })

      if (error || !judges) {
        logger.error('Error querying judges below threshold', { error })
        return
      }

      for (const judge of judges) {
        const caseCount = judge.total_cases || 0

        // Different severity based on how far below threshold
        let severity: 'low' | 'medium' | 'high' = 'low'
        if (caseCount < 100) {
          severity = 'high'
        } else if (caseCount < 250) {
          severity = 'medium'
        }

        this.issues.push({
          type: 'data_integrity',
          severity,
          entity: 'judge',
          entityId: judge.id,
          message: `Judge "${judge.name}" has ${caseCount} cases (below 500 minimum threshold for full analytics)`,
          suggestedAction:
            caseCount < 100
              ? 'Import additional cases or mark as insufficient data'
              : 'Continue monitoring case count growth',
          autoFixable: false,
          metadata: {
            judge_id: judge.id,
            judge_name: judge.name,
            current_case_count: caseCount,
            minimum_threshold: 500,
            deficit: 500 - caseCount,
            fix_confidence: 0,
          },
        })
      }
    } catch (error) {
      logger.error('Case threshold validation failed', { error })
    }
  }
}
