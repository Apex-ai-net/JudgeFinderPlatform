import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/utils/logger'

/**
 * Analytics endpoint for tracking chat funnel conversions
 * Tracks user interactions from AI chat to judge profile views
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { event, judge_id, judge_name, source } = body

    // Log the analytics event
    log.info('Chat funnel event tracked', {
      event,
      judge_id,
      judge_name,
      source,
      timestamp: new Date().toISOString(),
    })

    // In production, you would save this to analytics database
    // For now, just return success
    return NextResponse.json({ success: true })
  } catch (error) {
    log.error(
      'Failed to track chat funnel event:',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    )
    // Don't fail the request - analytics tracking is non-critical
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
