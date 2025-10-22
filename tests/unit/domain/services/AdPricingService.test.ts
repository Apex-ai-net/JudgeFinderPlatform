import { describe, it, expect } from 'vitest'
import { AdPricingService } from '@/lib/domain/services/AdPricingService'

describe('AdPricingService', () => {
  const service = new AdPricingService()

  describe('calculatePricing', () => {
    it('should calculate standard state court pricing', () => {
      const result = service.calculatePricing({
        tier: 'standard',
        courtLevel: 'state',
        isExclusive: false,
        isPremiumJudge: false,
        bundleSize: 1,
        durationMonths: 1,
      })

      expect(result.isOk()).toBe(true)
      const breakdown = result.unwrap()
      expect(breakdown.basePrice.dollars).toBe(500)
      expect(breakdown.finalPrice.dollars).toBe(500)
    })

    it('should have no federal court multiplier (universal pricing)', () => {
      const result = service.calculatePricing({
        tier: 'standard',
        courtLevel: 'federal',
        isExclusive: false,
        isPremiumJudge: false,
        bundleSize: 1,
        durationMonths: 1,
      })

      expect(result.isOk()).toBe(true)
      const breakdown = result.unwrap()
      expect(breakdown.courtLevelMultiplier).toBe(1.0)
      expect(breakdown.finalPrice.dollars).toBe(500) // Same as state
    })

    it('should have no premium judge multiplier (universal pricing)', () => {
      const result = service.calculatePricing({
        tier: 'standard',
        courtLevel: 'state',
        isExclusive: false,
        isPremiumJudge: true,
        bundleSize: 1,
        durationMonths: 1,
      })

      expect(result.isOk()).toBe(true)
      const breakdown = result.unwrap()
      expect(breakdown.premiumMultiplier).toBe(1.0)
      expect(breakdown.finalPrice.dollars).toBe(500) // Same as non-premium
    })

    it('should apply exclusive placement multiplier (1.5x)', () => {
      const result = service.calculatePricing({
        tier: 'standard',
        courtLevel: 'state',
        isExclusive: true,
        isPremiumJudge: false,
        bundleSize: 1,
        durationMonths: 1,
      })

      expect(result.isOk()).toBe(true)
      const breakdown = result.unwrap()
      expect(breakdown.exclusiveMultiplier).toBe(1.5)
      expect(breakdown.finalPrice.dollars).toBe(750) // 500 * 1.5
    })

    it('should apply volume discount for 3+ spots (10%)', () => {
      const result = service.calculatePricing({
        tier: 'standard',
        courtLevel: 'state',
        isExclusive: false,
        isPremiumJudge: false,
        bundleSize: 3,
        durationMonths: 1,
      })

      expect(result.isOk()).toBe(true)
      const breakdown = result.unwrap()
      expect(breakdown.volumeDiscount).toBe(0.1)
      // 500 * 3 = 1500, minus 10% = 1350
      expect(breakdown.finalPrice.dollars).toBe(1350)
    })

    it('should apply volume discount for 5+ spots (15%)', () => {
      const result = service.calculatePricing({
        tier: 'standard',
        courtLevel: 'state',
        isExclusive: false,
        isPremiumJudge: false,
        bundleSize: 5,
        durationMonths: 1,
      })

      expect(result.isOk()).toBe(true)
      const breakdown = result.unwrap()
      expect(breakdown.volumeDiscount).toBe(0.15)
      // 500 * 5 = 2500, minus 15% = 2125
      expect(breakdown.finalPrice.dollars).toBe(2125)
    })

    it('should apply volume discount for 10+ spots (20%)', () => {
      const result = service.calculatePricing({
        tier: 'standard',
        courtLevel: 'state',
        isExclusive: false,
        isPremiumJudge: false,
        bundleSize: 10,
        durationMonths: 1,
      })

      expect(result.isOk()).toBe(true)
      const breakdown = result.unwrap()
      expect(breakdown.volumeDiscount).toBe(0.2)
      // 500 * 10 = 5000, minus 20% = 4000
      expect(breakdown.finalPrice.dollars).toBe(4000)
    })

    it('should apply annual discount (2 months free)', () => {
      const result = service.calculatePricing({
        tier: 'standard',
        courtLevel: 'state',
        isExclusive: false,
        isPremiumJudge: false,
        bundleSize: 1,
        durationMonths: 12,
      })

      expect(result.isOk()).toBe(true)
      const breakdown = result.unwrap()
      expect(breakdown.annualDiscount).toBeCloseTo(0.1667, 4)
      // 500 * 12 = 6000, minus ~16.67% = ~5000
      expect(breakdown.finalPrice.dollars).toBe(5000)
    })

    it('should combine volume and annual discounts', () => {
      const result = service.calculatePricing({
        tier: 'standard',
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
        tier: 'standard',
        courtLevel: 'state',
        isExclusive: false,
        isPremiumJudge: false,
        bundleSize: 1,
        durationMonths: 12,
      })

      expect(result.isOk()).toBe(true)
      const breakdown = result.unwrap()
      // Total 5000, divided by 12 = ~416.67
      expect(breakdown.pricePerMonth.dollars).toBeCloseTo(416.67, 1)
    })

    it('should validate bundle size minimum', () => {
      const result = service.calculatePricing({
        tier: 'standard',
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
        tier: 'standard',
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
        tier: 'standard',
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
        tier: 'standard',
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
      expect(result.unwrap().dollars).toBe(500)
    })
  })

  describe('estimateAnnualSavings', () => {
    it('should calculate annual savings correctly', () => {
      const result = service.estimateAnnualSavings('standard', 'state')

      expect(result.isOk()).toBe(true)
      const savings = result.unwrap()
      // Monthly: 500 * 12 = 6000
      // Annual: 5000 (2 months free)
      // Savings: 1000 (2 months)
      expect(savings.dollars).toBeCloseTo(1000, 0)
    })
  })

  describe('compareTiers', () => {
    it('should return standard tier for state court', () => {
      const result = service.compareTiers('state', 1)

      expect(result.isOk()).toBe(true)
      const comparison = result.unwrap()

      // Only standard tier exists now
      expect(comparison.standard).toBeDefined()
      expect(comparison.standard.finalPrice.dollars).toBe(500)
    })

    it('should return standard tier for federal court (same price)', () => {
      const result = service.compareTiers('federal', 1)

      expect(result.isOk()).toBe(true)
      const comparison = result.unwrap()

      // Universal pricing - federal same as state
      expect(comparison.standard).toBeDefined()
      expect(comparison.standard.finalPrice.dollars).toBe(500)
    })
  })

  describe('calculateROIThreshold', () => {
    it('should calculate break-even clients', () => {
      const pricing = service
        .calculatePricing({
          tier: 'standard',
          courtLevel: 'state',
          isExclusive: false,
          isPremiumJudge: false,
          bundleSize: 1,
          durationMonths: 1,
        })
        .unwrap()

      const result = service.calculateROIThreshold(pricing, 1500)

      expect(result.isOk()).toBe(true)
      // 500 / 1500 = 0.333, rounded up = 1 client
      expect(result.unwrap()).toBe(1)
    })

    it('should round up for partial clients', () => {
      const pricing = service
        .calculatePricing({
          tier: 'standard',
          courtLevel: 'state',
          isExclusive: false,
          isPremiumJudge: false,
          bundleSize: 1,
          durationMonths: 1,
        })
        .unwrap()

      const result = service.calculateROIThreshold(pricing, 300)

      expect(result.isOk()).toBe(true)
      // 500 / 300 = 1.67, rounded up = 2 clients
      expect(result.unwrap()).toBe(2)
    })

    it('should reject non-positive client value', () => {
      const pricing = service
        .calculatePricing({
          tier: 'standard',
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
    it('should always recommend standard tier (universal pricing)', () => {
      expect(service.recommendTier(300, 'state')).toBe('standard')
      expect(service.recommendTier(500, 'state')).toBe('standard')
      expect(service.recommendTier(800, 'state')).toBe('standard')
      expect(service.recommendTier(1500, 'state')).toBe('standard')
      expect(service.recommendTier(600, 'federal')).toBe('standard')
    })
  })

  describe('complex pricing scenarios', () => {
    it('should handle exclusive annual bundle correctly', () => {
      const result = service.calculatePricing({
        tier: 'standard',
        courtLevel: 'federal',
        isExclusive: true,
        isPremiumJudge: true, // No longer affects price
        bundleSize: 5,
        durationMonths: 12,
      })

      expect(result.isOk()).toBe(true)
      const breakdown = result.unwrap()

      // Base: 500
      // Multipliers: 1.0 (court) * 1.5 (exclusive) * 1.0 (premium) = 1.5
      // Bundle: 5 spots
      // Duration: 12 months
      // Subtotal: 500 * 1.5 * 5 * 12 = 45,000
      // Discounts: 15% (volume) + 16.67% (annual) = 31.67%

      expect(breakdown.courtLevelMultiplier).toBe(1.0)
      expect(breakdown.exclusiveMultiplier).toBe(1.5)
      expect(breakdown.premiumMultiplier).toBe(1.0)
      expect(breakdown.finalPrice.isPositive()).toBe(true)
      expect(breakdown.savings.isPositive()).toBe(true)
    })
  })
})
