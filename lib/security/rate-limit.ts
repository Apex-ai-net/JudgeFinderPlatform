import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import type { NextRequest } from 'next/server'
import { logger } from '@/lib/utils/logger'

export type RateLimitConfig = {
  tokens: number
  window: string // e.g. '10 s', '1 m'
  prefix?: string
}

let sharedRedis: Redis | null = null
let defaultLimiter: Ratelimit | null = null
let warnedMissingRedis = false

function ensureRedisEnv(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  const isProduction = process.env.NODE_ENV === 'production'

  if (!url || !token) {
    // SECURITY: Fail loud in production - rate limiting is critical
    if (isProduction) {
      const error = 'CRITICAL SECURITY ERROR: Upstash Redis credentials are required in production for rate limiting'
      logger.error(error, {
        scope: 'rate_limit',
        env: process.env.NODE_ENV,
        severity: 'critical'
      })
      throw new Error(error)
    }

    // Fail silent in development with warning
    if (!warnedMissingRedis) {
      warnedMissingRedis = true
      logger.warn('Rate limiting disabled: Upstash Redis credentials missing', {
        scope: 'rate_limit',
        env: process.env.NODE_ENV,
      })
    }

    return null
  }

  return { url, token }
}

function getRedis(): Redis | null {
  if (sharedRedis) {
    return sharedRedis
  }

  const creds = ensureRedisEnv()
  if (!creds) {
    return null
  }

  sharedRedis = new Redis({ url: creds.url, token: creds.token })

  logger.info('Rate limiting redis client initialised', {
    scope: 'rate_limit',
    prefix: 'init'
  })

  return sharedRedis
}

export function isRateLimitConfigured(): boolean {
  try {
    const creds = ensureRedisEnv()
    return Boolean(creds)
  } catch (error) {
    logger.error('Rate limit configuration invalid', { error })
    return false
  }
}

export function buildRateLimiter(config: RateLimitConfig) {
  let client: Redis | null = null
  const isProduction = process.env.NODE_ENV === 'production'

  try {
    client = getRedis()
  } catch (error) {
    logger.error('Failed to build rate limiter', {
      scope: 'rate_limit',
      prefix: config.prefix,
      error
    })
    // Re-throw in production - this is a critical failure
    if (isProduction) {
      throw error
    }
  }

  if (!client) {
    // In production, this should never happen due to ensureRedisEnv() throwing
    // But as a safety net, we throw here too
    if (isProduction) {
      const error = 'Rate limiter cannot be built without Redis client in production'
      logger.error(error, { scope: 'rate_limit', severity: 'critical' })
      throw new Error(error)
    }

    // Development: Return pass-through limiter
    logger.warn('Rate limiter using pass-through mode (development only)', {
      scope: 'rate_limit',
      prefix: config.prefix
    })

    return {
      limit: async (_key: string) => ({ success: true, remaining: Number.POSITIVE_INFINITY, reset: Date.now() + 1000 })
    }
  }

  const duration = config.window as Parameters<(typeof Ratelimit)['slidingWindow']>[1]
  const limiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(config.tokens, duration),
    prefix: config.prefix || 'rl'
  })

  return {
    limit: async (key: string) => {
      const result = await limiter.limit(key)
      logger.debug('Rate limit check', {
        scope: 'rate_limit',
        prefix: config.prefix,
        key,
        remaining: result.remaining,
        success: result.success
      })
      return result
    }
  }
}

export function getClientIp(req: NextRequest): string {
  const h = req.headers
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip')?.trim() ||
    'unknown'
  )
}

function getDefaultLimiter(): Ratelimit | null {
  if (defaultLimiter) {
    return defaultLimiter
  }

  const client = getRedis()
  if (!client) {
    return null
  }

  defaultLimiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.fixedWindow(60, '1 m'),
    prefix: 'api:default'
  })

  return defaultLimiter
}

export async function enforceRateLimit(key: string) {
  const limiter = getDefaultLimiter()

  if (!limiter) {
    return { allowed: true, remaining: undefined, reset: undefined }
  }

  const res = await limiter.limit(key)

  logger.debug('Default rate limit check', {
    scope: 'rate_limit',
    key,
    remaining: res.remaining,
    success: res.success
  })

  return { allowed: res.success, remaining: res.remaining, reset: res.reset }
}

export function getClientKey(headers: Headers) {
  return (
    headers.get('x-api-key') ||
    headers.get('x-forwarded-for') ||
    headers.get('cf-connecting-ip') ||
    'anonymous'
  )
}
