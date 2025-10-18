/**
 * Judicial Bias Pattern Report API Endpoint
 * GET /api/judges/[id]/bias-report
 *
 * Generates comprehensive bias pattern analysis for a specific judge
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/is-admin'
import { createServerClient } from '@/lib/supabase/server'
import { generateBiasReport } from '@/lib/analytics/report-builder'
import { generateNarrativeSummary, generateTextReport } from '@/lib/analytics/summary-generator'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for complex reports

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/judges/[id]/bias-report
 *
 * Query Parameters:
 * - startDate: ISO date string (default: 3 years ago)
 * - endDate: ISO date string (default: today)
 * - includeBaseline: boolean (default: true)
 * - includeDataset: boolean (default: false)
 * - format: 'json' | 'text' (default: 'json')
 */
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId || !(await isAdmin())) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get judge ID from params
    const params = await context.params
    const judgeId = params.id

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const includeBaseline = searchParams.get('includeBaseline') !== 'false'
    const includeDataset = searchParams.get('includeDataset') === 'true'
    const format = searchParams.get('format') || 'json'

    // Calculate date range (default: last 3 years)
    const endDate = endDateParam ? new Date(endDateParam) : new Date()
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(endDate.getFullYear() - 3, endDate.getMonth(), endDate.getDate())

    // Validate dates
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    if (startDate >= endDate) {
      return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 })
    }

    const supabase = await createServerClient()

    // Fetch judge information
    const { data: judge, error: judgeError } = await supabase
      .from('judges')
      .select('id, name, jurisdiction, total_cases')
      .eq('id', judgeId)
      .single()

    if (judgeError || !judge) {
      return NextResponse.json({ error: 'Judge not found' }, { status: 404 })
    }

    // Fetch cases for the judge within date range
    const { data: cases, error: casesError } = await supabase
      .from('cases')
      .select(
        `
        case_type,
        outcome,
        status,
        summary,
        filing_date,
        decision_date,
        case_value,
        motion_type,
        judgment_amount,
        claimed_amount
      `
      )
      .eq('judge_id', judgeId)
      .gte('filing_date', startDate.toISOString())
      .lte('filing_date', endDate.toISOString())
      .not('decision_date', 'is', null)
      .limit(5000) // Safety limit

    if (casesError) {
      console.error('Error fetching cases:', casesError)
      return NextResponse.json({ error: 'Failed to fetch case data' }, { status: 500 })
    }

    if (!cases || cases.length === 0) {
      return NextResponse.json(
        {
          error: 'Insufficient data',
          message: `No cases found for ${judge.name} in the specified date range`,
          judge_id: judgeId,
          judge_name: judge.name,
          date_range: { start: startDate.toISOString(), end: endDate.toISOString() },
        },
        { status: 404 }
      )
    }

    // Check minimum case requirement (informational only)
    const hasMinimumData = cases.length >= 500
    if (!hasMinimumData) {
      console.warn(
        `Judge ${judge.name} has only ${cases.length} cases - below recommended minimum of 500`
      )
    }

    // Generate comprehensive bias report
    const report = await generateBiasReport(
      judgeId,
      judge.name,
      judge.jurisdiction || 'Unknown',
      cases,
      {
        startDate,
        endDate,
        includeBaseline,
      }
    )

    // Generate narrative summary
    const narrative = generateNarrativeSummary(report)

    // Build response based on format
    if (format === 'text') {
      const textReport = generateTextReport(report)
      return new NextResponse(textReport, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="bias-report-${judgeId}-${Date.now()}.txt"`,
        },
      })
    }

    // JSON response
    const response = {
      report,
      narrative,
      ...(includeDataset && { dataset: cases }),
      metadata: {
        generated_at: new Date().toISOString(),
        requested_by: userId,
        meets_minimum_threshold: hasMinimumData,
        warning: hasMinimumData
          ? null
          : `Dataset below recommended minimum (${cases.length}/500 cases). Results should be interpreted with caution.`,
      },
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, s-maxage=86400, max-age=43200, stale-while-revalidate=86400', // Cache for 24 hours
      },
    })
  } catch (error) {
    console.error('Bias report generation error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}
