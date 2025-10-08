import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { SupabaseConnectionHelper } from '@/lib/supabase/connection-helper'

export const dynamic = 'force-dynamic'
export const maxDuration = 10 // Health check should complete in under 10 seconds

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

interface HealthCheckResponse {
  timestamp: string
  status: HealthStatus
  version: string
  environment: string
  uptime: number
  checks: {
    database: HealthStatus
    redis: HealthStatus
    memory: HealthStatus
    external_apis: HealthStatus
  }
  performance: {
    responseTime: number
    databaseLatency?: number
    redisLatency?: number
    courtListenerLatency?: number
    [key: string]: any
  }
  error?: string
  details?: string
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const checks: HealthCheckResponse = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    checks: {
      database: 'healthy',
      redis: 'healthy',
      memory: 'healthy',
      external_apis: 'healthy',
    },
    performance: {
      responseTime: 0,
    },
  }

  try {
    const { buildRateLimiter, getClientIp, isRateLimitConfigured } = await import('@/lib/security/rate-limit')
    const rl = buildRateLimiter({ tokens: 60, window: '1 m', prefix: 'api:health' })
    const { success, remaining } = await rl.limit(`${getClientIp(request)}:global`)
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    // Check database connectivity using connection helper
    const dbCheckStart = Date.now()
    const connectionHelper = SupabaseConnectionHelper.getInstance()
    const healthCheck = await connectionHelper.healthCheck()

    if (healthCheck.status === 'healthy') {
      checks.checks.database = 'healthy'
    } else if (healthCheck.status === 'degraded') {
      checks.checks.database = 'degraded'
      checks.status = 'degraded'
    } else {
      checks.checks.database = 'unhealthy'
      checks.status = 'degraded'
    }

    checks.performance.databaseLatency = Date.now() - dbCheckStart

    if (healthCheck.error) {
      checks.performance.databaseError = healthCheck.error
    }

    // Check Redis connectivity
    const redisCheckStart = Date.now()
    try {
      if (isRateLimitConfigured()) {
        const { Redis } = await import('@upstash/redis')
        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL!,
          token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        })

        // Ping Redis with timeout
        const pingPromise = redis.ping()
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis ping timeout')), 2000)
        )

        await Promise.race([pingPromise, timeoutPromise])

        checks.checks.redis = 'healthy'
        checks.performance.redisLatency = Date.now() - redisCheckStart
      } else {
        checks.checks.redis = 'degraded'
        checks.performance.redisError = 'Redis not configured'
      }
    } catch (error) {
      checks.checks.redis = 'unhealthy'
      checks.performance.redisLatency = Date.now() - redisCheckStart
      checks.performance.redisError = error instanceof Error ? error.message : 'Unknown error'

      // Redis failure doesn't make the entire system unhealthy, just degraded
      if (checks.status === 'healthy') {
        checks.status = 'degraded'
      }
    }

    // Check external APIs (CourtListener) - optional, only if configured
    if (process.env.COURTLISTENER_API_KEY) {
      const clCheckStart = Date.now()
      try {
        // Simple HEAD request to check if CourtListener is reachable
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)

        const response = await fetch('https://www.courtlistener.com/api/rest/v3/', {
          method: 'HEAD',
          headers: {
            'Authorization': `Token ${process.env.COURTLISTENER_API_KEY}`,
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          checks.checks.external_apis = 'healthy'
          checks.performance.courtListenerLatency = Date.now() - clCheckStart
        } else {
          checks.checks.external_apis = 'degraded'
          checks.performance.courtListenerError = `HTTP ${response.status}`
        }
      } catch (error) {
        checks.checks.external_apis = 'degraded'
        checks.performance.courtListenerLatency = Date.now() - clCheckStart
        checks.performance.courtListenerError = error instanceof Error ? error.message : 'Unknown error'
      }
    } else {
      checks.checks.external_apis = 'degraded'
      checks.performance.courtListenerError = 'CourtListener API key not configured'
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage()
    const memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024)
    const memoryLimitMB = Math.round(memoryUsage.heapTotal / 1024 / 1024)
    const memoryPercentage = Math.round((memoryUsageMB / memoryLimitMB) * 100)

    // Memory thresholds: >80% degraded, >90% unhealthy
    if (memoryPercentage > 90) {
      checks.checks.memory = 'unhealthy'
      checks.status = 'unhealthy'
    } else if (memoryPercentage > 80) {
      checks.checks.memory = 'degraded'
      if (checks.status === 'healthy') {
        checks.status = 'degraded'
      }
    } else {
      checks.checks.memory = 'healthy'
    }

    checks.performance.memoryUsage = {
      used: memoryUsageMB,
      total: memoryLimitMB,
      percentage: memoryPercentage,
    }

    // Calculate total response time
    checks.performance.responseTime = Date.now() - startTime

    // Determine overall status from all checks
    const unhealthyChecks = Object.values(checks.checks).filter(status => status === 'unhealthy')
    const degradedChecks = Object.values(checks.checks).filter(status => status === 'degraded')

    if (unhealthyChecks.length > 0) {
      checks.status = 'unhealthy'
    } else if (degradedChecks.length > 0 && checks.status !== 'unhealthy') {
      checks.status = 'degraded'
    }

    // Return appropriate HTTP status code
    // 200 for healthy or degraded (system is operational)
    // 503 for unhealthy (system is down)
    const httpStatus = checks.status === 'unhealthy' ? 503 : 200

    return NextResponse.json({ ...checks, rate_limit_remaining: remaining }, {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      }
    })

  } catch (error) {
    console.error('Health check error:', error)

    checks.status = 'unhealthy'
    checks.checks.database = 'unhealthy'
    checks.checks.redis = 'unhealthy'
    checks.checks.external_apis = 'unhealthy'
    checks.performance.responseTime = Date.now() - startTime

    return NextResponse.json({
      ...checks,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      }
    })
  }
}