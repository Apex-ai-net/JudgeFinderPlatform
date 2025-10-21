/**
 * Ad Pricing Domain Service
 *
 * Simplified pricing model: Universal $500/month standard pricing for all judge ads.
 *
 * Business Rules (Updated 2025-10-20):
 * - Standard pricing: $500/month, $5,000/year (all judges, all courts)
 * - Annual subscriptions get 2 months free (10 months pricing)
 * - Volume discounts: 10% for 3+ spots, 15% for 5+ spots, 20% for 10+ spots
 * - No court level multipliers (removed federal 2x premium)
 * - No premium judge multipliers (removed 1.3x premium)
 * - Exclusive placements still available at 1.5x ($750/month)
 */

import { Result, ValidationError } from '../Result'
import { Money } from '../value-objects/Money'

export type CourtLevel = 'federal' | 'state'
export type PricingTier = 'standard' // Simplified to single tier

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
  // Universal standard pricing (in dollars)
  private readonly BASE_PRICE = 500 // $500/month for all judges

  // Removed court level multipliers (was federal: 2.0, state: 1.0)
  // Now all courts use same pricing

  // Removed premium judge multiplier (was 1.3x)
  // Now all judges use same pricing

  // Exclusive placement multiplier (optional premium)
  private readonly EXCLUSIVE_MULTIPLIER = 1.5 // $750/month

  // Volume discount thresholds (unchanged)
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

    // Get base price (universal $500)
    const basePriceResult = Money.fromDollars(this.BASE_PRICE)
    if (basePriceResult.isErr()) {
      return Result.err(basePriceResult.error())
    }
    const basePrice = basePriceResult.unwrap()

    // Court level multiplier removed (now 1.0 for all)
    const courtLevelMultiplier = 1.0

    // Premium judge multiplier removed (now 1.0 for all)
    const premiumMultiplier = 1.0

    // Apply exclusive multiplier (only variable pricing)
    const exclusiveMultiplier = factors.isExclusive ? this.EXCLUSIVE_MULTIPLIER : 1.0

    // Calculate subtotal with multipliers
    const totalMultiplier = exclusiveMultiplier // Simplified: only exclusive matters
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
   * Compares pricing across tiers (simplified - only standard tier exists)
   * Kept for backwards compatibility
   */
  compareTiers(
    courtLevel: CourtLevel,
    durationMonths: number = 1
  ): Result<Record<PricingTier, PricingBreakdown>, ValidationError> {
    const factors: PricingFactors = {
      tier: 'standard',
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

    // Return single standard tier (no more tiered pricing)
    return Result.ok({
      standard: breakdown.unwrap(),
    } as Record<PricingTier, PricingBreakdown>)
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
   * Simplified: always returns 'standard' (single tier model)
   */
  recommendTier(monthlyBudget: number, courtLevel: CourtLevel): PricingTier {
    // Always return standard tier (universal $500 pricing)
    return 'standard'
  }
}
