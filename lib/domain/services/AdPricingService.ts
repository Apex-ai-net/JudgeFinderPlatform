/**
 * Ad Pricing Domain Service
 *
 * Encapsulates complex pricing calculations for advertising.
 * Implements tiered pricing, volume discounts, and court level multipliers.
 *
 * Business Rules:
 * - Federal court ads cost 2x state court ads
 * - Volume discounts: 10% for 3+ spots, 15% for 5+ spots, 20% for 10+ spots
 * - Annual subscriptions get 2 months free
 * - Exclusive placements cost 1.5x base price
 * - Premium judges (1000+ cases) cost 1.3x base price
 */

import { Result, ValidationError } from '../Result'
import { Money } from '../value-objects/Money'

export type CourtLevel = 'federal' | 'state'
export type PricingTier = 'basic' | 'standard' | 'premium' | 'enterprise'

export interface PricingFactors {
  courtLevel: CourtLevel
  tier: PricingTier
  isExclusive: boolean
  isPremiumJudge: boolean
  bundleSize: number
  durationMonths: number
}

export interface PricingBreakdown {
  basePrice: Money
  courtLevelMultiplier: number
  premiumMultiplier: number
  exclusiveMultiplier: number
  volumeDiscount: number
  annualDiscount: number
  subtotal: Money
  totalDiscount: Money
  finalPrice: Money
  pricePerMonth: Money
  savings: Money
}

/**
 * Ad Pricing Domain Service
 *
 * Calculates pricing for advertising spots with complex business rules.
 */
export class AdPricingService {
  // Base monthly prices by tier (in dollars)
  private readonly BASE_PRICES: Record<PricingTier, number> = {
    basic: 299,
    standard: 499,
    premium: 799,
    enterprise: 1499,
  }

  // Court level multipliers
  private readonly COURT_LEVEL_MULTIPLIERS: Record<CourtLevel, number> = {
    federal: 2.0,
    state: 1.0,
  }

  // Premium judge multiplier
  private readonly PREMIUM_JUDGE_MULTIPLIER = 1.3

  // Exclusive placement multiplier
  private readonly EXCLUSIVE_MULTIPLIER = 1.5

  // Volume discount thresholds
  private readonly VOLUME_DISCOUNTS = [
    { threshold: 10, discount: 0.2 }, // 20% off for 10+ spots
    { threshold: 5, discount: 0.15 }, // 15% off for 5+ spots
    { threshold: 3, discount: 0.1 }, // 10% off for 3+ spots
  ]

  // Annual discount (2 months free = 16.67% off)
  private readonly ANNUAL_DISCOUNT = 2 / 12 // 2 months free

  /**
   * Calculates full pricing breakdown
   */
  calculatePricing(factors: PricingFactors): Result<PricingBreakdown, ValidationError> {
    // Validate inputs
    const validation = this.validateFactors(factors)
    if (validation.isErr()) {
      return validation
    }

    // Get base price
    const basePriceResult = Money.fromDollars(this.BASE_PRICES[factors.tier])
    if (basePriceResult.isErr()) {
      return Result.err(basePriceResult.error())
    }
    const basePrice = basePriceResult.unwrap()

    // Apply court level multiplier
    const courtLevelMultiplier = this.COURT_LEVEL_MULTIPLIERS[factors.courtLevel]

    // Apply premium judge multiplier
    const premiumMultiplier = factors.isPremiumJudge ? this.PREMIUM_JUDGE_MULTIPLIER : 1.0

    // Apply exclusive multiplier
    const exclusiveMultiplier = factors.isExclusive ? this.EXCLUSIVE_MULTIPLIER : 1.0

    // Calculate subtotal with multipliers
    const totalMultiplier = courtLevelMultiplier * premiumMultiplier * exclusiveMultiplier
    const subtotalResult = basePrice
      .multiply(totalMultiplier)
      .flatMap((price) => price.multiply(factors.bundleSize))
      .flatMap((price) => price.multiply(factors.durationMonths))

    if (subtotalResult.isErr()) {
      return Result.err(subtotalResult.error())
    }
    const subtotal = subtotalResult.unwrap()

    // Calculate volume discount
    const volumeDiscount = this.getVolumeDiscount(factors.bundleSize)

    // Calculate annual discount
    const annualDiscount = factors.durationMonths >= 12 ? this.ANNUAL_DISCOUNT : 0

    // Total discount percentage
    const totalDiscountPercentage = Math.min(
      volumeDiscount + annualDiscount,
      0.35 // Cap at 35% total discount
    )

    // Apply discounts
    const finalPriceResult = subtotal.applyDiscount(totalDiscountPercentage * 100)
    if (finalPriceResult.isErr()) {
      return Result.err(finalPriceResult.error())
    }
    const finalPrice = finalPriceResult.unwrap()

    // Calculate total savings
    const savingsResult = subtotal.subtract(finalPrice)
    if (savingsResult.isErr()) {
      return Result.err(savingsResult.error())
    }
    const savings = savingsResult.unwrap()

    // Calculate price per month
    const pricePerMonthResult = finalPrice.divide(factors.durationMonths)
    if (pricePerMonthResult.isErr()) {
      return Result.err(pricePerMonthResult.error())
    }
    const pricePerMonth = pricePerMonthResult.unwrap()

    return Result.ok({
      basePrice,
      courtLevelMultiplier,
      premiumMultiplier,
      exclusiveMultiplier,
      volumeDiscount,
      annualDiscount,
      subtotal,
      totalDiscount: savings,
      finalPrice,
      pricePerMonth,
      savings,
    })
  }

  /**
   * Calculates simple monthly price without full breakdown
   */
  calculateMonthlyPrice(factors: PricingFactors): Result<Money, ValidationError> {
    return this.calculatePricing(factors).map((breakdown) => breakdown.pricePerMonth)
  }

  /**
   * Gets volume discount percentage based on bundle size
   */
  private getVolumeDiscount(bundleSize: number): number {
    for (const tier of this.VOLUME_DISCOUNTS) {
      if (bundleSize >= tier.threshold) {
        return tier.discount
      }
    }
    return 0
  }

  /**
   * Validates pricing factors
   */
  private validateFactors(factors: PricingFactors): Result<void, ValidationError> {
    if (factors.bundleSize < 1) {
      return Result.err(
        new ValidationError('Bundle size must be at least 1', {
          bundleSize: factors.bundleSize,
        })
      )
    }

    if (factors.bundleSize > 50) {
      return Result.err(
        new ValidationError('Bundle size cannot exceed 50', {
          bundleSize: factors.bundleSize,
        })
      )
    }

    if (factors.durationMonths < 1) {
      return Result.err(
        new ValidationError('Duration must be at least 1 month', {
          durationMonths: factors.durationMonths,
        })
      )
    }

    if (factors.durationMonths > 36) {
      return Result.err(
        new ValidationError('Duration cannot exceed 36 months', {
          durationMonths: factors.durationMonths,
        })
      )
    }

    return Result.ok(undefined)
  }

  /**
   * Estimates annual savings for annual subscription
   */
  estimateAnnualSavings(tier: PricingTier, courtLevel: CourtLevel): Result<Money, ValidationError> {
    const monthlyFactors: PricingFactors = {
      tier,
      courtLevel,
      isExclusive: false,
      isPremiumJudge: false,
      bundleSize: 1,
      durationMonths: 1,
    }

    const annualFactors: PricingFactors = {
      ...monthlyFactors,
      durationMonths: 12,
    }

    const monthlyResult = this.calculateMonthlyPrice(monthlyFactors)
    const annualResult = this.calculateMonthlyPrice(annualFactors)

    return Result.combine([monthlyResult, annualResult]).flatMap(([monthlyPrice, annualPrice]) => {
      // Calculate what 12 months would cost at monthly rate
      const yearlyAtMonthlyRateResult = monthlyPrice.multiply(12)
      if (yearlyAtMonthlyRateResult.isErr()) {
        return yearlyAtMonthlyRateResult
      }

      const yearlyAtMonthlyRate = yearlyAtMonthlyRateResult.unwrap()

      // Calculate actual annual cost
      const actualAnnualCostResult = annualPrice.multiply(12)
      if (actualAnnualCostResult.isErr()) {
        return actualAnnualCostResult
      }

      const actualAnnualCost = actualAnnualCostResult.unwrap()

      // Savings is the difference
      return yearlyAtMonthlyRate.subtract(actualAnnualCost)
    })
  }

  /**
   * Compares pricing across tiers
   */
  compareTiers(
    courtLevel: CourtLevel,
    durationMonths: number = 1
  ): Result<Record<PricingTier, PricingBreakdown>, ValidationError> {
    const tiers: PricingTier[] = ['basic', 'standard', 'premium', 'enterprise']
    const results: Partial<Record<PricingTier, PricingBreakdown>> = {}

    for (const tier of tiers) {
      const factors: PricingFactors = {
        tier,
        courtLevel,
        isExclusive: false,
        isPremiumJudge: false,
        bundleSize: 1,
        durationMonths,
      }

      const breakdown = this.calculatePricing(factors)
      if (breakdown.isErr()) {
        return breakdown
      }

      results[tier] = breakdown.unwrap()
    }

    return Result.ok(results as Record<PricingTier, PricingBreakdown>)
  }

  /**
   * Calculates ROI threshold
   * Estimates how many conversions needed to break even
   */
  calculateROIThreshold(
    pricing: PricingBreakdown,
    averageClientValue: number
  ): Result<number, ValidationError> {
    if (averageClientValue <= 0) {
      return Result.err(
        new ValidationError('Average client value must be positive', {
          averageClientValue,
        })
      )
    }

    // How many clients needed to cover ad cost
    const breakEvenClients = Math.ceil(pricing.finalPrice.dollars / averageClientValue)

    return Result.ok(breakEvenClients)
  }

  /**
   * Gets recommended tier based on monthly budget
   */
  recommendTier(monthlyBudget: number, courtLevel: CourtLevel): PricingTier {
    const budgetResult = Money.fromDollars(monthlyBudget)
    if (budgetResult.isErr()) {
      return 'basic'
    }

    const budget = budgetResult.unwrap()
    const multiplier = this.COURT_LEVEL_MULTIPLIERS[courtLevel]

    // Adjust budget by court level
    const effectiveBudget = budget.dollars / multiplier

    if (effectiveBudget >= this.BASE_PRICES.enterprise) {
      return 'enterprise'
    } else if (effectiveBudget >= this.BASE_PRICES.premium) {
      return 'premium'
    } else if (effectiveBudget >= this.BASE_PRICES.standard) {
      return 'standard'
    } else {
      return 'basic'
    }
  }
}
