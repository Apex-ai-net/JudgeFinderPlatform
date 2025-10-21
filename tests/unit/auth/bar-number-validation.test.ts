/**
 * Unit tests for bar number validation logic
 */

import { describe, it, expect } from 'vitest'
import { VALID_BAR_NUMBERS, INVALID_BAR_NUMBERS } from '../../fixtures/auth'

describe('Bar Number Validation', () => {
  // Test the regex pattern used in the verify-bar route
  const BAR_NUMBER_REGEX = /^[A-Z0-9\-]{3,20}$/

  describe('Valid Bar Numbers', () => {
    it('should accept valid California bar number', () => {
      const cleaned = VALID_BAR_NUMBERS.california.trim().toUpperCase()
      expect(BAR_NUMBER_REGEX.test(cleaned)).toBe(true)
    })

    it('should accept valid California bar number (alternative format)', () => {
      const cleaned = VALID_BAR_NUMBERS.california2.trim().toUpperCase()
      expect(BAR_NUMBER_REGEX.test(cleaned)).toBe(true)
    })

    it('should accept valid New York bar number', () => {
      const cleaned = VALID_BAR_NUMBERS.newYork.trim().toUpperCase()
      expect(BAR_NUMBER_REGEX.test(cleaned)).toBe(true)
    })

    it('should accept valid Texas bar number', () => {
      const cleaned = VALID_BAR_NUMBERS.texas.trim().toUpperCase()
      expect(BAR_NUMBER_REGEX.test(cleaned)).toBe(true)
    })

    it('should accept bar number with hyphens', () => {
      const barNumber = 'CA-123-456'
      expect(BAR_NUMBER_REGEX.test(barNumber)).toBe(true)
    })

    it('should accept 6-digit California bar number', () => {
      const barNumber = '123456'
      expect(BAR_NUMBER_REGEX.test(barNumber)).toBe(true)
    })

    it('should accept minimum length (3 characters)', () => {
      const barNumber = 'ABC'
      expect(BAR_NUMBER_REGEX.test(barNumber)).toBe(true)
    })

    it('should accept maximum length (20 characters)', () => {
      const barNumber = 'CA12345678901234567'
      expect(BAR_NUMBER_REGEX.test(barNumber)).toBe(true)
    })

    it('should handle lowercase to uppercase conversion', () => {
      const barNumber = 'ca123456'
      const cleaned = barNumber.trim().toUpperCase()
      expect(BAR_NUMBER_REGEX.test(cleaned)).toBe(true)
    })

    it('should handle whitespace trimming', () => {
      const barNumber = '  CA123456  '
      const cleaned = barNumber.trim().toUpperCase()
      expect(BAR_NUMBER_REGEX.test(cleaned)).toBe(true)
    })
  })

  describe('Invalid Bar Numbers', () => {
    it('should reject too short bar number', () => {
      const cleaned = INVALID_BAR_NUMBERS.tooShort.trim().toUpperCase()
      expect(BAR_NUMBER_REGEX.test(cleaned)).toBe(false)
    })

    it('should reject too long bar number', () => {
      const cleaned = INVALID_BAR_NUMBERS.tooLong.trim().toUpperCase()
      expect(BAR_NUMBER_REGEX.test(cleaned)).toBe(false)
    })

    it('should reject bar number with invalid characters', () => {
      const cleaned = INVALID_BAR_NUMBERS.invalidChars.trim().toUpperCase()
      expect(BAR_NUMBER_REGEX.test(cleaned)).toBe(false)
    })

    it('should reject empty bar number', () => {
      const cleaned = INVALID_BAR_NUMBERS.empty.trim().toUpperCase()
      expect(BAR_NUMBER_REGEX.test(cleaned)).toBe(false)
    })

    it('should reject bar number with special characters', () => {
      const barNumber = 'CA@123#456'
      expect(BAR_NUMBER_REGEX.test(barNumber)).toBe(false)
    })

    it('should reject bar number with spaces', () => {
      const barNumber = 'CA 123 456'
      expect(BAR_NUMBER_REGEX.test(barNumber)).toBe(false)
    })

    it('should reject bar number with lowercase letters (before normalization)', () => {
      const barNumber = 'ca123456'
      expect(BAR_NUMBER_REGEX.test(barNumber)).toBe(false)
    })

    it('should reject bar number with SQL injection attempt', () => {
      const barNumber = "CA'; DROP TABLE users; --"
      expect(BAR_NUMBER_REGEX.test(barNumber)).toBe(false)
    })

    it('should reject bar number with XSS attempt', () => {
      const cleaned = INVALID_BAR_NUMBERS.specialChars.trim().toUpperCase()
      expect(BAR_NUMBER_REGEX.test(cleaned)).toBe(false)
    })

    it('should reject bar number with unicode characters', () => {
      const barNumber = 'CA判官123'
      expect(BAR_NUMBER_REGEX.test(barNumber)).toBe(false)
    })

    it('should reject bar number with dots', () => {
      const barNumber = 'CA.123.456'
      expect(BAR_NUMBER_REGEX.test(barNumber)).toBe(false)
    })

    it('should reject bar number with underscores', () => {
      const barNumber = 'CA_123_456'
      expect(BAR_NUMBER_REGEX.test(barNumber)).toBe(false)
    })

    it('should reject bar number that is exactly 2 characters', () => {
      const barNumber = 'CA'
      expect(BAR_NUMBER_REGEX.test(barNumber)).toBe(false)
    })

    it('should reject bar number that is exactly 21 characters', () => {
      const barNumber = 'CA1234567890123456789' // 21 chars
      expect(BAR_NUMBER_REGEX.test(barNumber)).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle null input safely', () => {
      const barNumber = null
      const cleaned = String(barNumber || '').trim().toUpperCase()
      expect(BAR_NUMBER_REGEX.test(cleaned)).toBe(false)
    })

    it('should handle undefined input safely', () => {
      const barNumber = undefined
      const cleaned = String(barNumber || '').trim().toUpperCase()
      expect(BAR_NUMBER_REGEX.test(cleaned)).toBe(false)
    })

    it('should handle numeric input', () => {
      const barNumber = 123456
      const cleaned = String(barNumber).trim().toUpperCase()
      expect(BAR_NUMBER_REGEX.test(cleaned)).toBe(true)
    })

    it('should handle bar number with leading zeros', () => {
      const barNumber = '000123456'
      expect(BAR_NUMBER_REGEX.test(barNumber)).toBe(true)
    })

    it('should handle bar number with only numbers', () => {
      const barNumber = '1234567890'
      expect(BAR_NUMBER_REGEX.test(barNumber)).toBe(true)
    })

    it('should handle bar number with only letters', () => {
      const barNumber = 'ABCDEFG'
      expect(BAR_NUMBER_REGEX.test(barNumber)).toBe(true)
    })

    it('should handle bar number with mixed case (after normalization)', () => {
      const barNumber = 'CaLiFoRnIa123456'
      const cleaned = barNumber.trim().toUpperCase()
      expect(BAR_NUMBER_REGEX.test(cleaned)).toBe(true)
    })
  })

  describe('Format-Specific Patterns', () => {
    it('should accept California format: CA followed by 6 digits', () => {
      const barNumber = 'CA123456'
      expect(BAR_NUMBER_REGEX.test(barNumber)).toBe(true)
    })

    it('should accept state code + number format', () => {
      const patterns = ['NY789012', 'TX345678', 'FL111222', 'IL333444']
      patterns.forEach((pattern) => {
        expect(BAR_NUMBER_REGEX.test(pattern)).toBe(true)
      })
    })

    it('should accept hyphenated format', () => {
      const patterns = ['CA-123-456', '12-3456-78', 'ABC-DEF-GHI']
      patterns.forEach((pattern) => {
        expect(BAR_NUMBER_REGEX.test(pattern)).toBe(true)
      })
    })
  })
})
