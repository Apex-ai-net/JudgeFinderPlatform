/**
 * Retry Logic with Exponential Backoff
 * Implements resilient retry patterns for transient failures
 */

import { logger } from '@/lib/utils/logger'

export interface RetryConfig {
  maxAttempts: number
  initialDelay: number // milliseconds
  maxDelay: number // milliseconds
  backoffMultiplier: number
  retryableErrors?: string[] // Error messages that should trigger retry
  name?: string
}

export interface RetryContext {
  attempt: number
  lastError: Error | null
  totalDelay: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'timeout',
    'Network error',
    'fetch failed',
  ],
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message)
    this.name = 'RetryError'
  }
}

/**
 * Check if error should trigger a retry
 */
function isRetryableError(error: Error, retryableErrors?: string[]): boolean {
  const patterns = retryableErrors || DEFAULT_RETRY_CONFIG.retryableErrors!
  const errorMessage = error.message.toLowerCase()
  const errorCode = (error as any).code?.toLowerCase() || ''

  return patterns.some(
    (pattern) =>
      errorMessage.includes(pattern.toLowerCase()) || errorCode.includes(pattern.toLowerCase())
  )
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1)
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay)

  // Add jitter (±25% randomization) to prevent thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() - 0.5)
  return Math.floor(cappedDelay + jitter)
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: (context: RetryContext) => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  const context: RetryContext = {
    attempt: 0,
    lastError: null,
    totalDelay: 0,
  }

  for (let attempt = 1; attempt <= fullConfig.maxAttempts; attempt++) {
    context.attempt = attempt

    try {
      logger.debug('Attempting operation', {
        name: fullConfig.name,
        attempt,
        maxAttempts: fullConfig.maxAttempts,
      })

      const result = await operation(context)

      if (attempt > 1) {
        logger.info('Operation succeeded after retry', {
          name: fullConfig.name,
          attempt,
          totalDelay: context.totalDelay,
        })
      }

      return result
    } catch (error) {
      context.lastError = error as Error
      const isLastAttempt = attempt === fullConfig.maxAttempts
      const shouldRetry =
        !isLastAttempt && isRetryableError(error as Error, fullConfig.retryableErrors)

      if (!shouldRetry) {
        if (isLastAttempt) {
          logger.error(
            'Operation failed after all retries',
            {
              name: fullConfig.name,
              attempts: attempt,
              totalDelay: context.totalDelay,
            },
            error as Error
          )

          throw new RetryError(
            `Operation failed after ${attempt} attempts`,
            attempt,
            error as Error
          )
        }

        // Non-retryable error
        logger.error(
          'Non-retryable error encountered',
          {
            name: fullConfig.name,
            attempt,
          },
          error as Error
        )
        throw error
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, fullConfig)
      context.totalDelay += delay

      logger.warn('Operation failed, retrying', {
        name: fullConfig.name,
        attempt,
        nextAttempt: attempt + 1,
        delay,
        error: (error as Error).message,
      })

      await sleep(delay)
    }
  }

  // Should never reach here, but TypeScript needs this
  throw new RetryError('Max retries exceeded', fullConfig.maxAttempts, context.lastError!)
}

/**
 * Retry with custom retry condition
 */
export async function retryWithCondition<T>(
  operation: (context: RetryContext) => Promise<T>,
  shouldRetry: (error: Error, attempt: number) => boolean,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  const context: RetryContext = {
    attempt: 0,
    lastError: null,
    totalDelay: 0,
  }

  for (let attempt = 1; attempt <= fullConfig.maxAttempts; attempt++) {
    context.attempt = attempt

    try {
      return await operation(context)
    } catch (error) {
      context.lastError = error as Error
      const isLastAttempt = attempt === fullConfig.maxAttempts

      if (isLastAttempt || !shouldRetry(error as Error, attempt)) {
        throw error
      }

      const delay = calculateDelay(attempt, fullConfig)
      context.totalDelay += delay

      logger.warn('Retrying after custom condition check', {
        name: fullConfig.name,
        attempt,
        delay,
      })

      await sleep(delay)
    }
  }

  throw context.lastError!
}

/**
 * Batch retry - retry operations in batches with progressive backoff
 */
export async function batchRetry<T>(
  operations: Array<() => Promise<T>>,
  config: Partial<RetryConfig> = {}
): Promise<Array<T | Error>> {
  const results: Array<T | Error> = []

  for (const operation of operations) {
    try {
      const result = await retryWithBackoff(async () => operation(), config)
      results.push(result)
    } catch (error) {
      results.push(error as Error)
    }
  }

  return results
}
