/**
 * Cron Endpoint: Refresh Analytics Materialized Views
 *
 * Refreshes materialized views for analytics data:
 * - decision_counts_by_judge_year (case statistics by judge and year)
 * - top_judges_by_jurisdiction (judge rankings by jurisdiction)
 *
 * Runs concurrently to avoid blocking and logs performance metrics.
 *
 * Schedule: Daily at 2 AM UTC
 * Netlify: netlify.toml configured with cron trigger
 * Vercel: vercel.json configured with cron trigger
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Lazy initialization to avoid build-time errors
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase environment variables not configured')
  }

  return createClient(url, key)
}

interface ViewRefreshResult {
  view_name: string
  started_at: string
  completed_at: string
  duration_ms: number
  success: boolean
  error?: string
  record_count?: number
}

interface RefreshReport {
  timestamp: string
  views_refreshed: ViewRefreshResult[]
  total_duration_ms: number
  all_success: boolean
}

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

async function refreshMaterializedView(viewName: string): Promise<ViewRefreshResult> {
  const startTime = Date.now()
  const result: ViewRefreshResult = {
    view_name: viewName,
    started_at: new Date().toISOString(),
    completed_at: '',
    duration_ms: 0,
    success: false
  }

  try {
    const supabase = getSupabaseClient()

    // Refresh materialized view concurrently (non-blocking)
    const { error: refreshError } = await supabase.rpc('exec_sql', {
      sql: `REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName};`
    })

    if (refreshError) {
      result.error = refreshError.message
      result.success = false
    } else {
      // Get record count
      const { count, error: countError } = await supabase
        .from(viewName)
        .select('*', { count: 'exact', head: true })

      if (!countError) {
        result.record_count = count || 0
      }

      result.success = true
    }
  } catch (error: any) {
    result.error = error.message
    result.success = false
  }

  result.completed_at = new Date().toISOString()
  result.duration_ms = Date.now() - startTime

  return result
}

async function refreshAllViews(): Promise<RefreshReport> {
  const startTime = Date.now()

  const views = [
    'decision_counts_by_judge_year',
    'top_judges_by_jurisdiction'
  ]

  // Refresh all views concurrently
  const results = await Promise.all(
    views.map(view => refreshMaterializedView(view))
  )

  const report: RefreshReport = {
    timestamp: new Date().toISOString(),
    views_refreshed: results,
    total_duration_ms: Date.now() - startTime,
    all_success: results.every(r => r.success)
  }

  return report
}

async function logRefreshResult(report: RefreshReport): Promise<void> {
  try {
    const supabase = getSupabaseClient()

    // Log to sync_validation_results table for tracking
    const { error } = await supabase
      .from('sync_validation_results')
      .insert({
        validation_id: `view_refresh_${Date.now()}`,
        started_at: report.timestamp,
        completed_at: new Date().toISOString(),
        duration_ms: report.total_duration_ms,
        total_issues: report.views_refreshed.filter(v => !v.success).length,
        critical_issues: 0,
        high_priority_issues: 0,
        medium_priority_issues: 0,
        low_priority_issues: 0,
        issues: report.views_refreshed.filter(v => !v.success).map(v => ({
          severity: 'high',
          category: 'VIEW_REFRESH',
          description: `Failed to refresh ${v.view_name}`,
          details: v.error
        })),
        summary: `Refreshed ${report.views_refreshed.length} views in ${report.total_duration_ms}ms`
      })

    if (error) {
      console.error('Failed to log refresh result:', error.message)
    }
  } catch (error: any) {
    console.error('Error logging refresh result:', error.message)
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔄 Starting analytics views refresh...')

    const report = await refreshAllViews()

    // Log the refresh result
    await logRefreshResult(report)

    // Log summary
    console.log('📊 Refresh Summary:')
    report.views_refreshed.forEach(view => {
      const status = view.success ? '✓' : '✗'
      console.log(`  ${status} ${view.view_name}: ${view.duration_ms}ms (${view.record_count || 0} records)`)
      if (view.error) {
        console.log(`    Error: ${view.error}`)
      }
    })
    console.log(`Total duration: ${report.total_duration_ms}ms`)

    if (!report.all_success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Some views failed to refresh',
          report
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'All views refreshed successfully',
      report
    })
  } catch (error: any) {
    console.error('❌ View refresh failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
