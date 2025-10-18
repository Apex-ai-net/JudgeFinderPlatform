/**
 * Data Audit API Endpoint
 *
 * Provides endpoints for:
 * - Running data quality audits
 * - Generating snapshots
 * - Creating remediation plans
 * - Executing remediation actions
 *
 * Auth: Requires admin role
 */

import { NextRequest, NextResponse } from 'next/server'
import { EnhancedDataQualityValidator } from '@/lib/sync/enhanced-data-quality-validator'
import { SnapshotGenerator } from '@/lib/admin/snapshot-generator'
import { RemediationPlanner } from '@/lib/admin/remediation-planner'
import { AutoRemediationEngine } from '@/lib/admin/auto-remediation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/data-audit
 * Run comprehensive data audit
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const operation = searchParams.get('operation') || 'audit'
    const format = searchParams.get('format') || 'json'

    logger.info('Data audit request received', { operation, format })

    const supabase = await createServiceRoleClient()

    switch (operation) {
      case 'audit': {
        // Run enhanced validation
        const validator = new EnhancedDataQualityValidator(supabase)
        const report = await validator.runEnhancedValidation()

        // Generate remediation plan
        const planner = new RemediationPlanner()
        const plan = planner.generatePlan(report)

        if (format === 'text') {
          const textReport = await validator.generateTextReport(report)
          const textPlan = planner.generateTextReport(plan)

          return new NextResponse(`${textReport}\n\n${textPlan}`, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          })
        }

        return NextResponse.json({
          validation_report: report,
          remediation_plan: plan,
        })
      }

      case 'snapshot': {
        // Generate data snapshot
        const generator = new SnapshotGenerator(supabase)
        const snapshot = await generator.generateSnapshot()

        // Optionally save to database
        const save = searchParams.get('save') === 'true'
        if (save) {
          await generator.saveSnapshot(snapshot)
        }

        return NextResponse.json(snapshot)
      }

      case 'quick': {
        // Quick validation (subset of checks)
        const validator = new EnhancedDataQualityValidator(supabase)

        // Run only critical checks
        await Promise.all([
          validator['validatePrimaryCourtRule'](),
          validator['validateTemporalOverlaps'](),
          validator['validateMinimumCaseThreshold'](),
        ])

        const report = await validator.generateReport()

        if (format === 'text') {
          const textReport = await validator.generateTextReport(report)
          return new NextResponse(textReport, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          })
        }

        return NextResponse.json(report)
      }

      default:
        return NextResponse.json(
          { error: 'Invalid operation. Use: audit, snapshot, or quick' },
          { status: 400 }
        )
    }
  } catch (error) {
    logger.error('Data audit failed', { error })
    return NextResponse.json(
      {
        error: 'Data audit failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/data-audit/remediate
 * Execute remediation actions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan_id, action_ids, dry_run = true } = body

    logger.info('Remediation request received', {
      planId: plan_id,
      actionCount: action_ids?.length || 0,
      dryRun: dry_run,
    })

    const supabase = await createServiceRoleClient()

    // First, run validation to get current issues
    const validator = new EnhancedDataQualityValidator(supabase)
    const report = await validator.runEnhancedValidation()

    // Filter to requested issues if action_ids provided
    let issuesToFix = report.issues
    if (action_ids && Array.isArray(action_ids)) {
      issuesToFix = report.issues.filter((issue) =>
        action_ids.some((id: string) => id.includes(issue.entityId))
      )
    }

    // Execute remediation
    const engine = new AutoRemediationEngine(supabase, { dryRun: dry_run })
    const summary = await engine.executeRemediation(issuesToFix)

    return NextResponse.json({
      plan_id,
      dry_run,
      execution_summary: summary,
      message: dry_run
        ? 'Dry run completed - no changes made'
        : `Remediation completed: ${summary.successful} successful, ${summary.failed} failed`,
    })
  } catch (error) {
    logger.error('Remediation execution failed', { error })
    return NextResponse.json(
      {
        error: 'Remediation failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/data-audit/rollback
 * Rollback a remediation action
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { rollback_info } = body

    if (!rollback_info) {
      return NextResponse.json({ error: 'Missing rollback_info in request body' }, { status: 400 })
    }

    logger.info('Rollback request received', { rollbackInfo: rollback_info })

    const supabase = await createServiceRoleClient()
    const engine = new AutoRemediationEngine(supabase)

    const success = await engine.rollback(rollback_info)

    return NextResponse.json({
      success,
      message: success ? 'Rollback successful' : 'Rollback failed',
      rollback_info,
    })
  } catch (error) {
    logger.error('Rollback failed', { error })
    return NextResponse.json(
      {
        error: 'Rollback failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
