import { describe, it, expect } from 'vitest'
import { Money } from '@/lib/domain/value-objects/Money'

describe('Money Value Object', () => {
  describe('fromDollars', () => {
    it('should create money from dollar amount', () => {
      const result = Money.fromDollars(100.5)
      expect(result.isOk()).toBe(true)

      const money = result.unwrap()
      expect(money.dollars).toBe(100.5)
      expect(money.cents).toBe(10050)
    })

    it('should handle whole dollar amounts', () => {
      const result = Money.fromDollars(100)
      expect(result.isOk()).toBe(true)
      expect(result.unwrap().cents).toBe(10000)
    })

    it('should reject negative amounts', () => {
      const result = Money.fromDollars(-10)
      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('cannot be negative')
    })

    it('should reject NaN', () => {
      const result = Money.fromDollars(NaN)
      expect(result.isErr()).toBe(true)
    })

    it('should reject infinity', () => {
      const result = Money.fromDollars(Infinity)
      expect(result.isErr()).toBe(true)
    })

    it('should handle floating-point precision correctly', () => {
      const result = Money.fromDollars(0.1 + 0.2) // Classic JS problem
      expect(result.isOk()).toBe(true)
      expect(result.unwrap().cents).toBe(30) // Should be 30 cents, not 30.000000000000004
    })
  })

  describe('fromCents', () => {
    it('should create money from cents', () => {
      const result = Money.fromCents(10050)
      expect(result.isOk()).toBe(true)

      const money = result.unwrap()
      expect(money.cents).toBe(10050)
      expect(money.dollars).toBe(100.5)
    })

    it('should reject non-integer cents', () => {
      const result = Money.fromCents(100.5)
      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('must be an integer')
    })

    it('should reject negative cents', () => {
      const result = Money.fromCents(-100)
      expect(result.isErr()).toBe(true)
    })
  })

  describe('zero', () => {
    it('should create a zero money value', () => {
      const money = Money.zero()
      expect(money.cents).toBe(0)
      expect(money.dollars).toBe(0)
      expect(money.isZero()).toBe(true)
    })
  })

  describe('add', () => {
    it('should add two money values', () => {
      const m1 = Money.fromDollars(10).unwrap()
      const m2 = Money.fromDollars(5).unwrap()
      const result = m1.add(m2)

      expect(result.isOk()).toBe(true)
      expect(result.unwrap().dollars).toBe(15)
    })

    it('should reject adding different currencies', () => {
      const m1 = Money.fromDollars(10, 'USD').unwrap()
      const m2 = Money.fromDollars(5, 'EUR').unwrap()
      const result = m1.add(m2)

      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('different currencies')
    })
  })

  describe('subtract', () => {
    it('should subtract two money values', () => {
      const m1 = Money.fromDollars(10).unwrap()
      const m2 = Money.fromDollars(5).unwrap()
      const result = m1.subtract(m2)

      expect(result.isOk()).toBe(true)
      expect(result.unwrap().dollars).toBe(5)
    })

    it('should reject subtraction resulting in negative', () => {
      const m1 = Money.fromDollars(5).unwrap()
      const m2 = Money.fromDollars(10).unwrap()
      const result = m1.subtract(m2)

      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('negative amount')
    })

    it('should reject subtracting different currencies', () => {
      const m1 = Money.fromDollars(10, 'USD').unwrap()
      const m2 = Money.fromDollars(5, 'EUR').unwrap()
      const result = m1.subtract(m2)

      expect(result.isErr()).toBe(true)
    })
  })

  describe('multiply', () => {
    it('should multiply by a factor', () => {
      const money = Money.fromDollars(10).unwrap()
      const result = money.multiply(2.5)

      expect(result.isOk()).toBe(true)
      expect(result.unwrap().dollars).toBe(25)
    })

    it('should round correctly', () => {
      const money = Money.fromDollars(10).unwrap()
      const result = money.multiply(1.5)

      expect(result.isOk()).toBe(true)
      expect(result.unwrap().dollars).toBe(15)
    })

    it('should reject negative factor', () => {
      const money = Money.fromDollars(10).unwrap()
      const result = money.multiply(-2)

      expect(result.isErr()).toBe(true)
    })
  })

  describe('divide', () => {
    it('should divide by a divisor', () => {
      const money = Money.fromDollars(10).unwrap()
      const result = money.divide(2)

      expect(result.isOk()).toBe(true)
      expect(result.unwrap().dollars).toBe(5)
    })

    it('should reject division by zero', () => {
      const money = Money.fromDollars(10).unwrap()
      const result = money.divide(0)

      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('divide by zero')
    })

    it('should reject negative divisor', () => {
      const money = Money.fromDollars(10).unwrap()
      const result = money.divide(-2)

      expect(result.isErr()).toBe(true)
    })
  })

  describe('applyDiscount', () => {
    it('should apply percentage discount', () => {
      const money = Money.fromDollars(100).unwrap()
      const result = money.applyDiscount(20) // 20% off

      expect(result.isOk()).toBe(true)
      expect(result.unwrap().dollars).toBe(80)
    })

    it('should reject discount over 100%', () => {
      const money = Money.fromDollars(100).unwrap()
      const result = money.applyDiscount(150)

      expect(result.isErr()).toBe(true)
    })

    it('should reject negative discount', () => {
      const money = Money.fromDollars(100).unwrap()
      const result = money.applyDiscount(-10)

      expect(result.isErr()).toBe(true)
    })
  })

  describe('percentage', () => {
    it('should calculate percentage of amount', () => {
      const money = Money.fromDollars(100).unwrap()
      const result = money.percentage(15) // 15%

      expect(result.isOk()).toBe(true)
      expect(result.unwrap().dollars).toBe(15)
    })
  })

  describe('comparisons', () => {
    it('should compare greater than', () => {
      const m1 = Money.fromDollars(10).unwrap()
      const m2 = Money.fromDollars(5).unwrap()
      expect(m1.greaterThan(m2)).toBe(true)
      expect(m2.greaterThan(m1)).toBe(false)
    })

    it('should compare less than', () => {
      const m1 = Money.fromDollars(5).unwrap()
      const m2 = Money.fromDollars(10).unwrap()
      expect(m1.lessThan(m2)).toBe(true)
      expect(m2.lessThan(m1)).toBe(false)
    })

    it('should compare greater than or equal', () => {
      const m1 = Money.fromDollars(10).unwrap()
      const m2 = Money.fromDollars(10).unwrap()
      const m3 = Money.fromDollars(5).unwrap()

      expect(m1.greaterThanOrEqual(m2)).toBe(true)
      expect(m1.greaterThanOrEqual(m3)).toBe(true)
    })

    it('should compare less than or equal', () => {
      const m1 = Money.fromDollars(10).unwrap()
      const m2 = Money.fromDollars(10).unwrap()
      const m3 = Money.fromDollars(15).unwrap()

      expect(m1.lessThanOrEqual(m2)).toBe(true)
      expect(m1.lessThanOrEqual(m3)).toBe(true)
    })
  })

  describe('isZero', () => {
    it('should return true for zero amount', () => {
      const money = Money.zero()
      expect(money.isZero()).toBe(true)
    })

    it('should return false for non-zero amount', () => {
      const money = Money.fromDollars(10).unwrap()
      expect(money.isZero()).toBe(false)
    })
  })

  describe('isPositive', () => {
    it('should return true for positive amount', () => {
      const money = Money.fromDollars(10).unwrap()
      expect(money.isPositive()).toBe(true)
    })

    it('should return false for zero amount', () => {
      const money = Money.zero()
      expect(money.isPositive()).toBe(false)
    })
  })

  describe('equals', () => {
    it('should return true for equal amounts', () => {
      const m1 = Money.fromDollars(10).unwrap()
      const m2 = Money.fromDollars(10).unwrap()
      expect(m1.equals(m2)).toBe(true)
    })

    it('should return false for different amounts', () => {
      const m1 = Money.fromDollars(10).unwrap()
      const m2 = Money.fromDollars(15).unwrap()
      expect(m1.equals(m2)).toBe(false)
    })

    it('should return false for different currencies', () => {
      const m1 = Money.fromDollars(10, 'USD').unwrap()
      const m2 = Money.fromDollars(10, 'EUR').unwrap()
      expect(m1.equals(m2)).toBe(false)
    })
  })

  describe('toString', () => {
    it('should format USD correctly', () => {
      const money = Money.fromDollars(100.5, 'USD').unwrap()
      expect(money.toString()).toBe('$100.50')
    })
  })

  describe('toFormattedString', () => {
    it('should format with thousands separator', () => {
      const money = Money.fromDollars(1234567.89, 'USD').unwrap()
      expect(money.toFormattedString()).toBe('$1,234,567.89')
    })

    it('should format small amounts correctly', () => {
      const money = Money.fromDollars(99.99, 'USD').unwrap()
      expect(money.toFormattedString()).toBe('$99.99')
    })
  })

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const money = Money.fromDollars(100.5).unwrap()
      const json = money.toJSON()

      expect(json.amount).toBe(100.5)
      expect(json.cents).toBe(10050)
      expect(json.currency).toBe('USD')
      expect(json.formatted).toBe('$100.50')
    })

    it('should deserialize from JSON', () => {
      const json = { cents: 10050, currency: 'USD' as const }
      const result = Money.fromJSON(json)

      expect(result.isOk()).toBe(true)
      expect(result.unwrap().dollars).toBe(100.5)
    })
  })

  describe('sum', () => {
    it('should sum multiple money values', () => {
      const amounts = [
        Money.fromDollars(10).unwrap(),
        Money.fromDollars(20).unwrap(),
        Money.fromDollars(30).unwrap(),
      ]
      const result = Money.sum(amounts)

      expect(result.isOk()).toBe(true)
      expect(result.unwrap().dollars).toBe(60)
    })

    it('should return zero for empty array', () => {
      const result = Money.sum([])
      expect(result.isOk()).toBe(true)
      expect(result.unwrap().isZero()).toBe(true)
    })

    it('should reject mixed currencies', () => {
      const amounts = [Money.fromDollars(10, 'USD').unwrap(), Money.fromDollars(20, 'EUR').unwrap()]
      const result = Money.sum(amounts)

      expect(result.isErr()).toBe(true)
    })
  })
})
