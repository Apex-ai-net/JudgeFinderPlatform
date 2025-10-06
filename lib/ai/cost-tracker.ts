/**
 * AI Cost Tracking and Budget Management
 * Prevents runaway AI costs through proactive budget limits and monitoring
 */

import { Redis } from '@upstash/redis'

// Budget Configuration
export const AI_BUDGETS = {
  DAILY_LIMIT: 50,        // $50/day hard limit
  MONTHLY_LIMIT: 500,     // $500/month hard limit
  PER_REQUEST_MAX: 0.10,  // $0.10/request maximum
  WARNING_THRESHOLD: 0.8  // Warn at 80% of budget
} as const

// Pricing for AI models (per million tokens)
const MODEL_PRICING = {
  'gemini-1.5-flash': {
    input: 0.075,   // $0.075 per 1M input tokens
    output: 0.30    // $0.30 per 1M output tokens
  },
  'gpt-4o-mini': {
    input: 0.150,   // $0.15 per 1M input tokens
    output: 0.600   // $0.60 per 1M output tokens
  }
} as const

export interface CostMetadata {
  judgeId?: string
  judgeName?: string
  model: string
  inputTokens: number
  outputTokens: number
  caseCount: number
  endpoint?: string
  timestamp: string
}

export interface CostRecord {
  amount: number
  metadata: CostMetadata
  recordedAt: string
}

export interface BudgetStatus {
  dailySpent: number
  dailyRemaining: number
  dailyLimit: number
  monthlySpent: number
  monthlyRemaining: number
  monthlyLimit: number
  requestCount: number
  canProceed: boolean
  warningLevel: 'none' | 'warning' | 'critical'
  message?: string
}

export class AICostTracker {
  private redis: Redis

  constructor() {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error('Redis environment variables required for cost tracking')
    }

    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }

  /**
   * Estimate the cost of an analytics request before making it
   */
  estimateAnalyticsCost(caseCount: number, model: string = 'gemini-1.5-flash'): number {
    const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING]
    if (!pricing) {
      throw new Error(`Unknown model: ${model}`)
    }

    // Token estimation based on observed patterns
    const tokensPerCase = 250        // Average case summary tokens
    const systemPromptTokens = 200   // System prompt overhead
    const totalInputTokens = (caseCount * tokensPerCase) + systemPromptTokens
    const outputTokens = 800         // Average JSON response

    // Calculate cost
    const inputCost = (totalInputTokens / 1_000_000) * pricing.input
    const outputCost = (outputTokens / 1_000_000) * pricing.output

    return inputCost + outputCost
  }

  /**
   * Calculate actual cost from token usage
   */
  calculateActualCost(inputTokens: number, outputTokens: number, model: string): number {
    const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING]
    if (!pricing) {
      console.warn(`Unknown model for cost calculation: ${model}, using Gemini pricing`)
      return this.calculateActualCost(inputTokens, outputTokens, 'gemini-1.5-flash')
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.input
    const outputCost = (outputTokens / 1_000_000) * pricing.output

    return inputCost + outputCost
  }

  /**
   * Check if a request can proceed based on budget limits
   */
  async checkBudget(estimatedCost: number): Promise<BudgetStatus> {
    const now = new Date()
    const dailyKey = this.getDailyKey(now)
    const monthlyKey = this.getMonthlyKey(now)

    // Get current spending
    const [dailySpent, monthlySpent, requestCount] = await Promise.all([
      this.redis.get<number>(dailyKey) || 0,
      this.redis.get<number>(monthlyKey) || 0,
      this.redis.get<number>(`${dailyKey}:count`) || 0
    ])

    const dailySpentNum = Number(dailySpent) || 0
    const monthlySpentNum = Number(monthlySpent) || 0
    const requestCountNum = Number(requestCount) || 0

    // Calculate projected spending
    const projectedDaily = dailySpentNum + estimatedCost
    const projectedMonthly = monthlySpentNum + estimatedCost

    // Check hard limits
    const dailyExceeded = projectedDaily > AI_BUDGETS.DAILY_LIMIT
    const monthlyExceeded = projectedMonthly > AI_BUDGETS.MONTHLY_LIMIT
    const perRequestExceeded = estimatedCost > AI_BUDGETS.PER_REQUEST_MAX

    // Determine if request can proceed
    const canProceed = !dailyExceeded && !monthlyExceeded && !perRequestExceeded

    // Determine warning level
    let warningLevel: 'none' | 'warning' | 'critical' = 'none'
    let message: string | undefined

    if (!canProceed) {
      warningLevel = 'critical'
      if (dailyExceeded) {
        message = `Daily budget exceeded: $${projectedDaily.toFixed(2)} > $${AI_BUDGETS.DAILY_LIMIT}`
      } else if (monthlyExceeded) {
        message = `Monthly budget exceeded: $${projectedMonthly.toFixed(2)} > $${AI_BUDGETS.MONTHLY_LIMIT}`
      } else if (perRequestExceeded) {
        message = `Request cost too high: $${estimatedCost.toFixed(2)} > $${AI_BUDGETS.PER_REQUEST_MAX}`
      }
    } else {
      // Check warning thresholds
      const dailyWarning = projectedDaily > AI_BUDGETS.DAILY_LIMIT * AI_BUDGETS.WARNING_THRESHOLD
      const monthlyWarning = projectedMonthly > AI_BUDGETS.MONTHLY_LIMIT * AI_BUDGETS.WARNING_THRESHOLD

      if (dailyWarning || monthlyWarning) {
        warningLevel = 'warning'
        message = dailyWarning
          ? `Approaching daily limit: $${projectedDaily.toFixed(2)} / $${AI_BUDGETS.DAILY_LIMIT}`
          : `Approaching monthly limit: $${projectedMonthly.toFixed(2)} / $${AI_BUDGETS.MONTHLY_LIMIT}`
      }
    }

    return {
      dailySpent: dailySpentNum,
      dailyRemaining: Math.max(0, AI_BUDGETS.DAILY_LIMIT - dailySpentNum),
      dailyLimit: AI_BUDGETS.DAILY_LIMIT,
      monthlySpent: monthlySpentNum,
      monthlyRemaining: Math.max(0, AI_BUDGETS.MONTHLY_LIMIT - monthlySpentNum),
      monthlyLimit: AI_BUDGETS.MONTHLY_LIMIT,
      requestCount: requestCountNum,
      canProceed,
      warningLevel,
      message
    }
  }

  /**
   * Record actual cost after AI request completes
   */
  async recordCost(amount: number, metadata: CostMetadata): Promise<void> {
    const now = new Date()
    const dailyKey = this.getDailyKey(now)
    const monthlyKey = this.getMonthlyKey(now)
    const recordKey = `ai:cost:record:${now.getTime()}`

    // Round to 4 decimal places for precision
    const roundedAmount = Math.round(amount * 10000) / 10000

    const record: CostRecord = {
      amount: roundedAmount,
      metadata,
      recordedAt: now.toISOString()
    }

    // Store cost record and update totals atomically
    await Promise.all([
      // Store detailed record with 90-day TTL
      this.redis.setex(recordKey, 90 * 24 * 60 * 60, JSON.stringify(record)),

      // Increment daily total (expires at end of day)
      this.redis.incrby(dailyKey, roundedAmount),
      this.redis.expireat(dailyKey, this.getEndOfDay(now)),

      // Increment monthly total (expires at end of month)
      this.redis.incrby(monthlyKey, roundedAmount),
      this.redis.expireat(monthlyKey, this.getEndOfMonth(now)),

      // Track request count
      this.redis.incr(`${dailyKey}:count`),
      this.redis.expireat(`${dailyKey}:count`, this.getEndOfDay(now)),

      // Add to daily log for detailed tracking
      this.redis.lpush(`ai:costs:daily:${this.formatDate(now)}`, JSON.stringify(record)),
      this.redis.expire(`ai:costs:daily:${this.formatDate(now)}`, 90 * 24 * 60 * 60)
    ])

    // Log significant costs
    if (roundedAmount > 0.01) {
      console.log(`💰 AI Cost Recorded: $${roundedAmount.toFixed(4)} - ${metadata.model} - ${metadata.judgeName || metadata.judgeId || 'unknown'}`)
    }
  }

  /**
   * Get daily spending total
   */
  async getDailyCost(): Promise<number> {
    const dailyKey = this.getDailyKey(new Date())
    const spent = await this.redis.get<number>(dailyKey)
    return Number(spent) || 0
  }

  /**
   * Get monthly spending total
   */
  async getMonthlyCost(): Promise<number> {
    const monthlyKey = this.getMonthlyKey(new Date())
    const spent = await this.redis.get<number>(monthlyKey)
    return Number(spent) || 0
  }

  /**
   * Get detailed cost breakdown
   */
  async getCostBreakdown(): Promise<{
    daily: number
    monthly: number
    requestCount: number
    recentRecords: CostRecord[]
    averageCostPerRequest: number
  }> {
    const now = new Date()
    const dailyKey = this.getDailyKey(now)
    const monthlyKey = this.getMonthlyKey(now)

    const [daily, monthly, requestCount, recentRecordsRaw] = await Promise.all([
      this.redis.get<number>(dailyKey),
      this.redis.get<number>(monthlyKey),
      this.redis.get<number>(`${dailyKey}:count`),
      this.redis.lrange(`ai:costs:daily:${this.formatDate(now)}`, 0, 9) // Last 10 records
    ])

    const dailyNum = Number(daily) || 0
    const monthlyNum = Number(monthly) || 0
    const requestCountNum = Number(requestCount) || 0

    const recentRecords = (recentRecordsRaw || [])
      .map(record => {
        try {
          return JSON.parse(record as string) as CostRecord
        } catch {
          return null
        }
      })
      .filter((r): r is CostRecord => r !== null)

    const averageCostPerRequest = requestCountNum > 0 ? dailyNum / requestCountNum : 0

    return {
      daily: dailyNum,
      monthly: monthlyNum,
      requestCount: requestCountNum,
      recentRecords,
      averageCostPerRequest
    }
  }

  /**
   * Reset daily costs (admin function for testing)
   */
  async resetDailyCosts(): Promise<void> {
    const dailyKey = this.getDailyKey(new Date())
    await this.redis.del(dailyKey, `${dailyKey}:count`)
    console.log('⚠️  Daily AI costs reset')
  }

  /**
   * Helper methods for Redis keys
   */
  private getDailyKey(date: Date): string {
    return `ai:cost:daily:${this.formatDate(date)}`
  }

  private getMonthlyKey(date: Date): string {
    return `ai:cost:monthly:${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  private getEndOfDay(date: Date): number {
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)
    return Math.floor(endOfDay.getTime() / 1000)
  }

  private getEndOfMonth(date: Date): number {
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
    return Math.floor(endOfMonth.getTime() / 1000)
  }
}

// Singleton instance
let costTrackerInstance: AICostTracker | null = null

export function getCostTracker(): AICostTracker {
  if (!costTrackerInstance) {
    costTrackerInstance = new AICostTracker()
  }
  return costTrackerInstance
}

/**
 * Budget exceeded error class
 */
export class BudgetExceededError extends Error {
  constructor(
    public budgetStatus: BudgetStatus,
    message?: string
  ) {
    super(message || budgetStatus.message || 'AI budget limit exceeded')
    this.name = 'BudgetExceededError'
  }
}
