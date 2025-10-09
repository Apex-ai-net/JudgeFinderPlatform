import { describe, it, expect } from 'vitest'
import { AdPricingService } from '@/lib/domain/services/AdPricingService'

describe('AdPricingService', () => {
  const service = new AdPricingService()

  describe('calculatePricing', () => {
    it('should calculate basic state court pricing', () => {
      const result = service.calculatePricing({
        tier: 'basic',
        courtLevel: 'state',
        isExclusive: false,
        isPremiumJudge: false,
        bundleSize: 1,
        durationMonths: 1,
      })

      expect(result.isOk()).toBe(true)
      const breakdown = result.unwrap()
      expect(breakdown.basePrice.dollars).toBe(299)
      expect(breakdown.finalPrice.dollars).toBe(299)
    })

    it('should apply federal court multiplier (2x)', () => {
      const result = service.calculatePricing({
        tier: 'basic',
        courtLevel: 'federal',
        isExclusive: false,
        isPremiumJudge: false,
        bundleSize: 1,
        durationMonths: 1,
      })

      expect(result.isOk()).toBe(true)
      const breakdown = result.unwrap()
      expect(breakdown.courtLevelMultiplier).toBe(2.0)
      expect(breakdown.finalPrice.dollars).toBe(598) // 299 * 2
    })

    it('should apply premium judge multiplier (1.3x)', () => {
      const result = service.calculatePricing({
        tier: 'basic',
        courtLevel: 'state',
        isExclusive: false,
        isPremiumJudge: true,
        bundleSize: 1,
        durationMonths: 1,
      })

      expect(result.isOk()).toBe(true)
      const breakdown = result.unwrap()
      expect(breakdown.premiumMultiplier).toBe(1.3)
      expect(breakdown.finalPrice.dollars).toBeCloseTo(388.7, 1) // 299 * 1.3
    })

    it('should apply exclusive placement multiplier (1.5x)', () => {
      const result = service.calculatePricing({
        tier: 'basic',
        courtLevel: 'state',
        isExclusive: true,
        isPremiumJudge: false,
        bundleSize: 1,
        durationMonths: 1,
      })

      expect(result.isOk()).toBe(true)
      const breakdown = result.unwrap()
      expect(breakdown.exclusiveMultiplier).toBe(1.5)
      expect(breakdown.finalPrice.dollars).toBeCloseTo(448.5, 1) // 299 * 1.5
    })

    it('should apply volume discount for 3+ spots (10%)', () => {
      const result = service.calculatePricing({
        tier: 'basic',
        courtLevel: 'state',
        isExclusive: false,
        isPremiumJudge: false,
        bundleSize: 3,
        durationMonths: 1,
      })

      expect(result.isOk()).toBe(true)
      const breakdown = result.unwrap()
      expect(breakdown.volumeDiscount).toBe(0.1)
      // 299 * 3 = 897, minus 10% = 807.30
      expect(breakdown.finalPrice.dollars).toBeCloseTo(807.3, 1)
    })

    it('should apply volume discount for 5+ spots (15%)', () => {
      const result = service.calculatePricing({
        tier: 'basic',
        courtLevel: 'state',
        isExclusive: false,
        isPremiumJudge: false,
        bundleSize: 5,
        durationMonths: 1,
      })

      expect(result.isOk()).toBe(true)
      const breakdown = result.unwrap()
      expect(breakdown.volumeDiscount).toBe(0.15)
      // 299 * 5 = 1495, minus 15% = 1270.75
      expect(breakdown.finalPrice.dollars).toBeCloseTo(1270.75, 1)
    })

    it('should apply volume discount for 10+ spots (20%)', () => {
      const result = service.calculatePricing({
        tier: 'basic',
        courtLevel: 'state',
        isExclusive: false,
        isPremiumJudge: false,
        bundleSize: 10,
        durationMonths: 1,
      })

      expect(result.isOk()).toBe(true)
      const breakdown = result.unwrap()
      expect(breakdown.volumeDiscount).toBe(0.2)
      // 299 * 10 = 2990, minus 20% = 2392
      expect(breakdown.finalPrice.dollars).toBe(2392)
    })

    it('should apply annual discount (2 months free)', () => {
      const result = service.calculatePricing({
        tier: 'basic',
        courtLevel: 'state',
        isExclusive: false,
        isPremiumJudge: false,
        bundleSize: 1,
        durationMonths: 12,
      })

      expect(result.isOk()).toBe(true)
      const breakdown = result.unwrap()
      expect(breakdown.annualDiscount).toBeCloseTo(0.1667, 4)
      // 299 * 12 = 3588, minus ~16.67% = ~2990
      expect(breakdown.finalPrice.dollars).toBeCloseTo(2990, 0)
    })

    it('should combine volume and annual discounts', () => {
      const result = service.calculatePricing({
        tier: 'basic',
        courtLevel: 'state',
        isExclusive: false,
        isPremiumJudge: false,
        bundleSize: 5,
        durationMonths: 12,
      })

      expect(result.isOk()).toBe(true)
      const breakdown = result.unwrap()
      // Volume: 15%, Annual: 16.67% = 31.67% total
      expect(breakdown.volumeDiscount + breakdown.annualDiscount).toBeCloseTo(0.3167, 3)
    })

    it('should calculate correct price per month for annual', () => {
      const result = service.calculatePricing({
        tier: 'basic',
        courtLevel: 'state',
        isExclusive: false,
        isPremiumJudge: false,
        bundleSize: 1,
        durationMonths: 12,
      })

      expect(result.isOk()).toBe(true)
      const breakdown = result.unwrap()
      // Total ~2990, divided by 12 = ~249.17
      expect(breakdown.pricePerMonth.dollars).toBeCloseTo(249.17, 1)
    })

    it('should validate bundle size minimum', () => {
      const result = service.calculatePricing({
        tier: 'basic',
        courtLevel: 'state',
        isExclusive: false,
        isPremiumJudge: false,
        bundleSize: 0,
        durationMonths: 1,
      })

      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('at least 1')
    })

    it('should validate bundle size maximum', () => {
      const result = service.calculatePricing({
        tier: 'basic',
        courtLevel: 'state',
        isExclusive: false,
        isPremiumJudge: false,
        bundleSize: 51,
        durationMonths: 1,
      })

      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('cannot exceed 50')
    })

    it('should validate duration minimum', () => {
      const result = service.calculatePricing({
        tier: 'basic',
        courtLevel: 'state',
        isExclusive: false,
        isPremiumJudge: false,
        bundleSize: 1,
        durationMonths: 0,
      })

      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('at least 1 month')
    })

    it('should validate duration maximum', () => {
      const result = service.calculatePricing({
        tier: 'basic',
        courtLevel: 'state',
        isExclusive: false,
        isPremiumJudge: false,
        bundleSize: 1,
        durationMonths: 37,
      })

      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('cannot exceed 36')
    })
  })

  describe('calculateMonthlyPrice', () => {
    it('should return monthly price without full breakdown', () => {
      const result = service.calculateMonthlyPrice({
        tier: 'standard',
        courtLevel: 'state',
        isExclusive: false,
        isPremiumJudge: false,
        bundleSize: 1,
        durationMonths: 1,
      })

      expect(result.isOk()).toBe(true)
      expect(result.unwrap().dollars).toBe(499)
    })
  })

  describe('estimateAnnualSavings', () => {
    it('should calculate annual savings correctly', () => {
      const result = service.estimateAnnualSavings('basic', 'state')

      expect(result.isOk()).toBe(true)
      const savings = result.unwrap()
      // Monthly: 299 * 12 = 3588
      // Annual: ~2990
      // Savings: ~598 (2 months)
      expect(savings.dollars).toBeCloseTo(598, 0)
    })

    it('should show higher savings for premium tiers', () => {
      const basicResult = service.estimateAnnualSavings('basic', 'state')
      const premiumResult = service.estimateAnnualSavings('premium', 'state')

      expect(basicResult.isOk()).toBe(true)
      expect(premiumResult.isOk()).toBe(true)

      const basicSavings = basicResult.unwrap()
      const premiumSavings = premiumResult.unwrap()

      expect(premiumSavings.greaterThan(basicSavings)).toBe(true)
    })
  })

  describe('compareTiers', () => {
    it('should compare all tiers for state court', () => {
      const result = service.compareTiers('state', 1)

      expect(result.isOk()).toBe(true)
      const comparison = result.unwrap()

      expect(comparison.basic.finalPrice.dollars).toBe(299)
      expect(comparison.standard.finalPrice.dollars).toBe(499)
      expect(comparison.premium.finalPrice.dollars).toBe(799)
      expect(comparison.enterprise.finalPrice.dollars).toBe(1499)
    })

    it('should compare all tiers for federal court', () => {
      const result = service.compareTiers('federal', 1)

      expect(result.isOk()).toBe(true)
      const comparison = result.unwrap()

      // All prices should be 2x state prices
      expect(comparison.basic.finalPrice.dollars).toBe(598)
      expect(comparison.standard.finalPrice.dollars).toBe(998)
      expect(comparison.premium.finalPrice.dollars).toBe(1598)
      expect(comparison.enterprise.finalPrice.dollars).toBe(2998)
    })
  })

  describe('calculateROIThreshold', () => {
    it('should calculate break-even clients', () => {
      const pricing = service
        .calculatePricing({
          tier: 'basic',
          courtLevel: 'state',
          isExclusive: false,
          isPremiumJudge: false,
          bundleSize: 1,
          durationMonths: 1,
        })
        .unwrap()

      const result = service.calculateROIThreshold(pricing, 1500)

      expect(result.isOk()).toBe(true)
      // 299 / 1500 = 0.199, rounded up = 1 client
      expect(result.unwrap()).toBe(1)
    })

    it('should round up for partial clients', () => {
      const pricing = service
        .calculatePricing({
          tier: 'premium',
          courtLevel: 'state',
          isExclusive: false,
          isPremiumJudge: false,
          bundleSize: 1,
          durationMonths: 1,
        })
        .unwrap()

      const result = service.calculateROIThreshold(pricing, 300)

      expect(result.isOk()).toBe(true)
      // 799 / 300 = 2.66, rounded up = 3 clients
      expect(result.unwrap()).toBe(3)
    })

    it('should reject non-positive client value', () => {
      const pricing = service
        .calculatePricing({
          tier: 'basic',
          courtLevel: 'state',
          isExclusive: false,
          isPremiumJudge: false,
          bundleSize: 1,
          durationMonths: 1,
        })
        .unwrap()

      const result = service.calculateROIThreshold(pricing, 0)

      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('must be positive')
    })
  })

  describe('recommendTier', () => {
    it('should recommend basic for low budget', () => {
      const tier = service.recommendTier(300, 'state')
      expect(tier).toBe('basic')
    })

    it('should recommend standard for medium budget', () => {
      const tier = service.recommendTier(500, 'state')
      expect(tier).toBe('standard')
    })

    it('should recommend premium for high budget', () => {
      const tier = service.recommendTier(800, 'state')
      expect(tier).toBe('premium')
    })

    it('should recommend enterprise for very high budget', () => {
      const tier = service.recommendTier(1500, 'state')
      expect(tier).toBe('enterprise')
    })

    it('should account for federal multiplier', () => {
      // 600 for federal should recommend basic (600 / 2 = 300)
      const tier = service.recommendTier(600, 'federal')
      expect(tier).toBe('basic')
    })
  })

  describe('complex pricing scenarios', () => {
    it('should handle premium federal exclusive annual bundle correctly', () => {
      const result = service.calculatePricing({
        tier: 'premium',
        courtLevel: 'federal',
        isExclusive: true,
        isPremiumJudge: true,
        bundleSize: 5,
        durationMonths: 12,
      })

      expect(result.isOk()).toBe(true)
      const breakdown = result.unwrap()

      // Base: 799
      // Multipliers: 2 (federal) * 1.5 (exclusive) * 1.3 (premium) = 3.9
      // Bundle: 5 spots
      // Duration: 12 months
      // Subtotal: 799 * 3.9 * 5 * 12 = 187,362
      // Discounts: 15% (volume) + 16.67% (annual) = 31.67%, capped at 35%

      expect(breakdown.courtLevelMultiplier).toBe(2.0)
      expect(breakdown.exclusiveMultiplier).toBe(1.5)
      expect(breakdown.premiumMultiplier).toBe(1.3)
      expect(breakdown.finalPrice.isPositive()).toBe(true)
      expect(breakdown.savings.isPositive()).toBe(true)
    })
  })
})
