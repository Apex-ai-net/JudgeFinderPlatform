/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by tracking error rates and opening circuit when threshold exceeded
 */

import { logger } from '@/lib/utils/logger'

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failures exceeded threshold, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number // Number of failures before opening circuit
  successThreshold: number // Number of successes to close circuit from half-open
  timeout: number // Time in ms before attempting to close circuit
  name: string // Circuit breaker identifier
}

export interface CircuitBreakerStats {
  state: CircuitState
  failures: number
  successes: number
  lastFailureTime: number | null
  totalCalls: number
  totalFailures: number
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failureCount = 0
  private successCount = 0
  private lastFailureTime: number | null = null
  private totalCalls = 0
  private totalFailures = 0
  private readonly config: CircuitBreakerConfig

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1 minute default
      ...config,
    }
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalCalls++

    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN
        logger.info('Circuit breaker entering half-open state', {
          name: this.config.name,
          lastFailure: this.lastFailureTime,
        })
      } else {
        const error = new Error(`Circuit breaker is OPEN for ${this.config.name}`)
        logger.warn('Circuit breaker rejecting request', {
          name: this.config.name,
          state: this.state,
          failureCount: this.failureCount,
        })
        throw error
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false
    return Date.now() - this.lastFailureTime >= this.config.timeout
  }

  private onSuccess(): void {
    this.failureCount = 0

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED
        this.successCount = 0
        logger.info('Circuit breaker closed', {
          name: this.config.name,
        })
      }
    }
  }

  private onFailure(): void {
    this.failureCount++
    this.totalFailures++
    this.lastFailureTime = Date.now()

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN
      this.successCount = 0
      logger.warn('Circuit breaker re-opened from half-open', {
        name: this.config.name,
      })
    }

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN
      logger.error('Circuit breaker opened', {
        name: this.config.name,
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold,
      })
    }
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
      lastFailureTime: this.lastFailureTime,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
    }
  }

  reset(): void {
    this.state = CircuitState.CLOSED
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = null
    logger.info('Circuit breaker manually reset', {
      name: this.config.name,
    })
  }
}

// Global circuit breaker registry
const circuitBreakers = new Map<string, CircuitBreaker>()

export function getCircuitBreaker(
  name: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(
      name,
      new CircuitBreaker({
        name,
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000,
        ...config,
      })
    )
  }
  return circuitBreakers.get(name)!
}
