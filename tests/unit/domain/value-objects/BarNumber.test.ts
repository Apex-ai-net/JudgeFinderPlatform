import { describe, it, expect } from 'vitest'
import { BarNumber } from '@/lib/domain/value-objects/BarNumber'

describe('BarNumber Value Object', () => {
  describe('create', () => {
    it('should create a valid bar number', () => {
      const result = BarNumber.create('CA', '123456')
      expect(result.isOk()).toBe(true)

      const barNumber = result.unwrap()
      expect(barNumber.state).toBe('CA')
      expect(barNumber.number).toBe('123456')
    })

    it('should normalize state code to uppercase', () => {
      const result = BarNumber.create('ca', '123456')
      expect(result.isOk()).toBe(true)
      expect(result.unwrap().state).toBe('CA')
    })

    it('should reject invalid state code', () => {
      const result = BarNumber.create('XX', '123456')
      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('Invalid state code')
    })

    it('should reject empty bar number', () => {
      const result = BarNumber.create('CA', '')
      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('cannot be empty')
    })

    it('should reject bar number with invalid characters', () => {
      const result = BarNumber.create('CA', '123@456')
      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('only letters, numbers')
    })

    it('should reject bar number that is too short', () => {
      const result = BarNumber.create('CA', '123')
      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('between 4 and 12')
    })

    it('should reject bar number that is too long', () => {
      const result = BarNumber.create('CA', '1234567890123')
      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('between 4 and 12')
    })

    it('should accept bar numbers with hyphens and spaces', () => {
      const result1 = BarNumber.create('CA', '123-456')
      const result2 = BarNumber.create('NY', '123 456')

      expect(result1.isOk()).toBe(true)
      expect(result2.isOk()).toBe(true)
    })
  })

  describe('parse', () => {
    it('should parse hyphen-separated format', () => {
      const result = BarNumber.parse('CA-123456')
      expect(result.isOk()).toBe(true)

      const barNumber = result.unwrap()
      expect(barNumber.state).toBe('CA')
      expect(barNumber.number).toBe('123456')
    })

    it('should parse space-separated format', () => {
      const result = BarNumber.parse('NY 987654')
      expect(result.isOk()).toBe(true)

      const barNumber = result.unwrap()
      expect(barNumber.state).toBe('NY')
      expect(barNumber.number).toBe('987654')
    })

    it('should reject invalid format', () => {
      const result = BarNumber.parse('123456')
      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('format')
    })

    it('should handle whitespace', () => {
      const result = BarNumber.parse('  CA-123456  ')
      expect(result.isOk()).toBe(true)
      expect(result.unwrap().toString()).toBe('CA-123456')
    })
  })

  describe('toString', () => {
    it('should format as STATE-NUMBER', () => {
      const barNumber = BarNumber.create('CA', '123456').unwrap()
      expect(barNumber.toString()).toBe('CA-123456')
    })
  })

  describe('equals', () => {
    it('should return true for identical bar numbers', () => {
      const bn1 = BarNumber.create('CA', '123456').unwrap()
      const bn2 = BarNumber.create('CA', '123456').unwrap()
      expect(bn1.equals(bn2)).toBe(true)
    })

    it('should return false for different bar numbers', () => {
      const bn1 = BarNumber.create('CA', '123456').unwrap()
      const bn2 = BarNumber.create('CA', '654321').unwrap()
      expect(bn1.equals(bn2)).toBe(false)
    })

    it('should return false for different states', () => {
      const bn1 = BarNumber.create('CA', '123456').unwrap()
      const bn2 = BarNumber.create('NY', '123456').unwrap()
      expect(bn1.equals(bn2)).toBe(false)
    })
  })

  describe('normalize', () => {
    it('should remove spaces and hyphens', () => {
      const barNumber = BarNumber.create('CA', '123-456').unwrap()
      const normalized = barNumber.normalize()
      expect(normalized.number).toBe('123456')
    })

    it('should remove multiple spaces', () => {
      const barNumber = BarNumber.create('NY', '123  456').unwrap()
      const normalized = barNumber.normalize()
      expect(normalized.number).toBe('123456')
    })
  })

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const barNumber = BarNumber.create('CA', '123456').unwrap()
      const json = barNumber.toJSON()

      expect(json.state).toBe('CA')
      expect(json.number).toBe('123456')
      expect(json.full).toBe('CA-123456')
    })

    it('should deserialize from JSON', () => {
      const json = { state: 'CA', number: '123456' }
      const result = BarNumber.fromJSON(json)

      expect(result.isOk()).toBe(true)
      expect(result.unwrap().toString()).toBe('CA-123456')
    })
  })

  describe('DC (District of Columbia)', () => {
    it('should accept DC as a valid state code', () => {
      const result = BarNumber.create('DC', '123456')
      expect(result.isOk()).toBe(true)
      expect(result.unwrap().state).toBe('DC')
    })
  })
})
