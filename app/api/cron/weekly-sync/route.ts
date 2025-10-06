import { NextRequest, NextResponse } from 'next/server'
import { SyncQueueManager } from '@/lib/sync/queue-manager'
import { logger } from '@/lib/utils/logger'
import { requireApiKey } from '@/lib/security/api-auth'
import { buildRateLimiter, getClientIp } from '@/lib/security/rate-limit'
import { logCronMetric } from '@/lib/sync/cron-logger'

export const dynamic = 'force-dynamic'

export const runtime = 'nodejs'
export const maxDuration = 60 // 1 minute to queue jobs

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const ipAddress = getClientIp(request)
  const rateLimiter = buildRateLimiter({ tokens: 5, window: '1 m', prefix: 'cron:weekly:get' })

  try {
    const auth = requireApiKey(request, { allow: ['CRON_SECRET'] })
    if (!('ok' in auth && auth.ok === true)) {
      return auth
    }

    const limitCheck = await rateLimiter.limit(ipAddress)
    if (!limitCheck.success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    logger.info('Starting weekly sync cron job')

    const queueManager = new SyncQueueManager()

    // Queue comprehensive weekly sync jobs
    const jobs = []

    // 1. Court data refresh (schedule for immediate execution)
    const courtJobId = await queueManager.addJob(
      'court',
      {
        batchSize: 30,
        jurisdiction: 'CA',
        forceRefresh: true // Force refresh all courts weekly
      },
      200 // Highest priority
    )
    jobs.push({ 
      id: courtJobId, 
      type: 'court', 
      description: 'Full court data refresh' 
    })

    // 2. Judge profile comprehensive update (schedule 30 minutes later)
    const judgeScheduleTime = new Date(Date.now() + 30 * 60 * 1000)
    const judgeJobId = await queueManager.addJob(
      'judge',
      {
        batchSize: 15,
        jurisdiction: 'CA',
        forceRefresh: true // Force refresh all judge profiles
      },
      150, // High priority
      judgeScheduleTime
    )
    jobs.push({ 
      id: judgeJobId, 
      type: 'judge', 
      description: 'Comprehensive judge profile update',
      scheduledFor: judgeScheduleTime.toISOString()
    })

    // 2b. Federal (US) judge maintenance (schedule 45 minutes later)
    const federalJudgeScheduleTime = new Date(Date.now() + 45 * 60 * 1000)
    const federalJudgeJobId = await queueManager.addJob(
      'judge',
      {
        batchSize: 20,
        jurisdiction: 'US',
        forceRefresh: false,
        discoverLimit: 1000 // incremental discovery each weekly run
      },
      140, // High priority but slightly below CA full refresh
      federalJudgeScheduleTime
    )
    jobs.push({
      id: federalJudgeJobId,
      type: 'judge',
      description: 'Weekly federal judge maintenance (US)',
      scheduledFor: federalJudgeScheduleTime.toISOString()
    })

    // 3. Decision backfill (schedule 1 hour later)
    const decisionScheduleTime = new Date(Date.now() + 60 * 60 * 1000)
    const decisionJobId = await queueManager.addJob(
      'decision',
      {
        batchSize: 3, // Smaller batches for comprehensive sync
        jurisdiction: 'CA',
        daysSinceLast: 7, // Fetch decisions from last week
        maxDecisionsPerJudge: 30 // Reduced from 100 to prevent API quota exhaustion (CourtListener PR #6345)
      },
      100, // Medium priority
      decisionScheduleTime
    )
    jobs.push({ 
      id: decisionJobId, 
      type: 'decision', 
      description: 'Weekly decision backfill',
      scheduledFor: decisionScheduleTime.toISOString()
    })

    // 4. Queue cleanup (schedule 2 hours later)
    const cleanupScheduleTime = new Date(Date.now() + 120 * 60 * 1000)
    await queueManager.addJob(
      'cleanup',
      {
        olderThanDays: 7,
        cleanupLogs: true
      },
      10, // Low priority
      cleanupScheduleTime
    )

    const duration = Date.now() - startTime

    logger.info('Weekly sync jobs queued successfully', {
      jobCount: jobs.length,
      duration
    })

    await logCronMetric({
      route: '/api/cron/weekly-sync',
      metricName: 'cron_weekly_sync',
      status: 'success',
      startTime,
      durationMs: duration,
      jobsQueued: jobs.length,
      ipAddress
    })

    return NextResponse.json({
      success: true,
      message: 'Weekly sync jobs queued successfully',
      jobs,
      schedule: {
        courts: 'Immediate',
        judges: '30 minutes',
        decisions: '1 hour',
        cleanup: '2 hours'
      },
      queuedAt: new Date().toISOString(),
      duration
    })

  } catch (error) {
    const duration = Date.now() - startTime
    
    logger.error('Weekly sync cron job failed', { error, duration })

    await logCronMetric({
      route: '/api/cron/weekly-sync',
      metricName: 'cron_weekly_sync',
      status: 'error',
      startTime,
      durationMs: duration,
      jobsQueued: 0,
      ipAddress
    })

    return NextResponse.json({
      success: false,
      error: 'Failed to queue weekly sync jobs',
      message: error instanceof Error ? error.message : 'Unknown error',
      duration,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Manual trigger endpoint
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const ipAddress = getClientIp(request)
  const rateLimiter = buildRateLimiter({ tokens: 10, window: '1 m', prefix: 'cron:weekly:post' })

  try {
    const auth = requireApiKey(request, { allow: ['SYNC_API_KEY', 'CRON_SECRET'] })
    if (!('ok' in auth && auth.ok === true)) {
      return auth
    }

    const limitCheck = await rateLimiter.limit(ipAddress)
    if (!limitCheck.success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    const immediate = body.immediate || false
    const syncType = body.syncType || 'full' // 'full', 'court', 'judge', 'decision'

    logger.info('Manual weekly sync triggered', { syncType, immediate })

    const queueManager = new SyncQueueManager()
    const jobs = []

    if (syncType === 'full' || syncType === 'court') {
      const courtJobId = await queueManager.addJob(
        'court',
        {
          batchSize: 30,
          jurisdiction: 'CA',
          forceRefresh: true
        },
        200
      )
      jobs.push({ id: courtJobId, type: 'court' })
    }

    if (syncType === 'full' || syncType === 'judge') {
      const scheduleTime = immediate ? undefined : new Date(Date.now() + 5 * 60 * 1000)
      const judgeJobId = await queueManager.addJob(
        'judge',
        {
          batchSize: 15,
          jurisdiction: 'CA',
          forceRefresh: true
        },
        150,
        scheduleTime
      )
      jobs.push({ id: judgeJobId, type: 'judge' })
    }

    if (syncType === 'full' || syncType === 'decision') {
      const scheduleTime = immediate ? undefined : new Date(Date.now() + 10 * 60 * 1000)
      const decisionJobId = await queueManager.addJob(
        'decision',
        {
          batchSize: 3,
          jurisdiction: 'CA',
          daysSinceLast: 14,
          maxDecisionsPerJudge: 30 // Reduced from 100 to prevent API quota exhaustion
        },
        100,
        scheduleTime
      )
      jobs.push({ id: decisionJobId, type: 'decision' })
    }

    const duration = Date.now() - startTime

    await logCronMetric({
      route: '/api/cron/weekly-sync',
      metricName: 'cron_weekly_sync_manual',
      status: 'success',
      startTime,
      durationMs: duration,
      jobsQueued: jobs.length,
      ipAddress
    })

    return NextResponse.json({
      success: true,
      message: 'Manual weekly sync jobs queued',
      syncType,
      immediate,
      jobs,
      triggeredAt: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Manual weekly sync failed', { error })
    const duration = Date.now() - startTime

    await logCronMetric({
      route: '/api/cron/weekly-sync',
      metricName: 'cron_weekly_sync_manual',
      status: 'error',
      startTime,
      durationMs: duration,
      jobsQueued: 0,
      ipAddress
    })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to trigger manual weekly sync',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
