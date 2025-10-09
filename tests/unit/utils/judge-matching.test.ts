/**
 * Unit tests for judge name matching and normalization
 * Tests the critical business logic for matching judge names with 95%+ accuracy
 *
 * Key requirements:
 * - Handle name variants (Jr., III, hyphenated names)
 * - Normalize names for consistent comparison
 * - Generate name variations for database lookup
 * - Test hierarchical fallback mechanisms
 */

import { describe, it, expect } from 'vitest'
import {
  normalizeName,
  generateNameVariations,
  parseJudgeName,
  generateSlug,
  isValidSlug,
  createCanonicalSlug,
  generateSlugVariations,
  isValidSlugVariation,
  slugToName,
} from '@/lib/utils/slug'

describe('Judge Name Matching', () => {
  describe('normalizeName', () => {
    it('should normalize basic names correctly', () => {
      expect(normalizeName('John Smith')).toBe('John Smith')
      expect(normalizeName('  John  Smith  ')).toBe('John Smith')
      expect(normalizeName('JOHN SMITH')).toBe('JOHN SMITH')
    })

    it('should handle multiple spaces correctly', () => {
      expect(normalizeName('Allen  L. Norris')).toBe('Allen L. Norris')
      expect(normalizeName('John   Robert    Smith')).toBe('John Robert Smith')
    })

    it('should preserve initials with periods', () => {
      expect(normalizeName('Mary K. Johnson')).toBe('Mary K. Johnson')
      expect(normalizeName('J. Michael Anderson')).toBe('J. Michael Anderson')
      expect(normalizeName('A.B.C. Washington')).toBe('A.B.C. Washington')
    })

    it('should handle empty or invalid input', () => {
      expect(normalizeName('')).toBe('')
      expect(normalizeName('   ')).toBe('')
      expect(normalizeName(null as any)).toBe('')
      expect(normalizeName(undefined as any)).toBe('')
    })

    it('should remove excessive periods', () => {
      expect(normalizeName('J... Smith')).toBe('J. Smith')
      expect(normalizeName('Mary K.... Johnson')).toBe('Mary K. Johnson')
    })
  })

  describe('parseJudgeName', () => {
    it('should parse simple two-part names', () => {
      const result = parseJudgeName('John Smith')
      expect(result.firstName).toBe('John')
      expect(result.lastName).toBe('Smith')
      expect(result.middleName).toBeUndefined()
      expect(result.suffix).toBeUndefined()
    })

    it('should parse names with middle names', () => {
      const result = parseJudgeName('John Robert Smith')
      expect(result.firstName).toBe('John')
      expect(result.middleName).toBe('Robert')
      expect(result.lastName).toBe('Smith')
    })

    it('should parse names with middle initials', () => {
      const result = parseJudgeName('Mary K. Johnson')
      expect(result.firstName).toBe('Mary')
      expect(result.lastName).toBe('Johnson')
      expect(result.initials).toContain('K')
    })

    it('should handle Jr. suffix correctly', () => {
      const result = parseJudgeName('William James Thompson Jr.')
      expect(result.firstName).toBe('William')
      expect(result.middleName).toBe('James')
      expect(result.lastName).toBe('Thompson')
      expect(result.suffix).toBe('Jr.')
    })

    it('should handle Roman numeral suffixes (III)', () => {
      const result = parseJudgeName('Charles Edward Reynolds III')
      expect(result.firstName).toBe('Charles')
      expect(result.middleName).toBe('Edward')
      expect(result.lastName).toBe('Reynolds')
      expect(result.suffix).toBe('III')
    })

    it('should handle Sr. suffix', () => {
      const result = parseJudgeName('Robert Davis Sr.')
      expect(result.firstName).toBe('Robert')
      expect(result.lastName).toBe('Davis')
      expect(result.suffix).toBe('Sr.')
    })

    it('should handle hyphenated last names', () => {
      const result = parseJudgeName('Jennifer Anne Parker-Williams')
      expect(result.firstName).toBe('Jennifer')
      expect(result.middleName).toBe('Anne')
      expect(result.lastName).toBe('Parker-Williams')
    })

    it('should handle single letter first names', () => {
      const result = parseJudgeName('J. Michael Anderson')
      expect(result.firstName).toBe('J.')
      expect(result.lastName).toBe('Anderson')
      expect(result.initials).toContain('J')
    })

    it('should handle multiple initials', () => {
      const result = parseJudgeName('A. B. C. Washington')
      expect(result.firstName).toBe('A.')
      expect(result.lastName).toBe('Washington')
      expect(result.initials.length).toBeGreaterThan(0)
    })

    it('should return empty structure for invalid input', () => {
      const result = parseJudgeName('')
      expect(result.firstName).toBe('')
      expect(result.lastName).toBe('')
      expect(result.initials).toEqual([])
    })
  })

  describe('generateNameVariations', () => {
    it('should generate variations for simple names', () => {
      const variations = generateNameVariations('John Smith')
      expect(variations).toContain('John Smith')
      expect(variations.length).toBeGreaterThan(1)
    })

    it('should handle double space variations', () => {
      const variations = generateNameVariations('Allen L. Norris')
      expect(variations).toContain('Allen L. Norris')
      expect(variations).toContain('Allen  L. Norris')
      expect(variations.some((v) => v.includes('Allen  L.'))).toBe(true)
    })

    it('should generate variations without periods', () => {
      const variations = generateNameVariations('Mary K. Johnson')
      expect(variations).toContain('Mary K. Johnson')
      expect(variations).toContain('Mary K Johnson')
    })

    it('should generate first-last only variations', () => {
      const variations = generateNameVariations('John Robert Smith')
      expect(variations).toContain('John Smith')
    })

    it('should generate reversed name format', () => {
      const variations = generateNameVariations('John Smith')
      expect(variations).toContain('Smith, John')
    })

    it('should limit variations to prevent excessive queries', () => {
      const variations = generateNameVariations('A. B. C. D. E. F. Washington')
      expect(variations.length).toBeLessThanOrEqual(20)
    })

    it('should filter out empty variations', () => {
      const variations = generateNameVariations('John Smith')
      expect(variations.every((v) => v.trim().length > 0)).toBe(true)
    })

    it('should handle names with Jr. suffix', () => {
      const variations = generateNameVariations('William Thompson Jr.')
      expect(variations.length).toBeGreaterThan(1)
      expect(variations.some((v) => v.includes('Jr'))).toBe(true)
    })

    it('should normalize spacing variations', () => {
      const variations = generateNameVariations('John  Smith')
      expect(variations).toContain('John Smith')
    })

    it('should handle hyphenated names', () => {
      const variations = generateNameVariations('Parker-Williams')
      expect(variations).toContain('Parker-Williams')
    })
  })

  describe('generateSlug', () => {
    it('should generate valid slugs for simple names', () => {
      expect(generateSlug('John Smith')).toBe('john-smith')
      expect(generateSlug('Mary Johnson')).toBe('mary-johnson')
    })

    it('should handle names with middle names', () => {
      expect(generateSlug('John Robert Smith')).toBe('john-robert-smith')
    })

    it('should handle names with initials', () => {
      expect(generateSlug('Mary K. Johnson')).toBe('mary-k-johnson')
      expect(generateSlug('J. Michael Anderson')).toBe('j-michael-anderson')
    })

    it('should handle Jr. suffix', () => {
      expect(generateSlug('William Thompson Jr.')).toBe('william-thompson-jr')
    })

    it('should handle III suffix', () => {
      expect(generateSlug('Charles Reynolds III')).toBe('charles-reynolds-iii')
    })

    it('should handle hyphenated names', () => {
      expect(generateSlug('Jennifer Parker-Williams')).toBe('jennifer-parkerwilliams')
    })

    it('should remove special characters', () => {
      expect(generateSlug("O'Connor")).toBe('oconnor')
      expect(generateSlug('Smith, Jr.')).toBe('smith-jr')
    })

    it('should handle multiple consecutive spaces', () => {
      expect(generateSlug('John  Robert  Smith')).toBe('john-robert-smith')
    })

    it('should return fallback for invalid input', () => {
      expect(generateSlug('')).toBe('unknown-judge')
      expect(generateSlug('   ')).toBe('unknown-judge')
      expect(generateSlug(null as any)).toBe('unknown-judge')
    })

    it('should convert to lowercase', () => {
      expect(generateSlug('JOHN SMITH')).toBe('john-smith')
    })

    it('should remove leading and trailing hyphens', () => {
      expect(generateSlug('-John Smith-')).toBe('john-smith')
    })

    it('should replace multiple hyphens with single hyphen', () => {
      const slug = generateSlug('John---Smith')
      expect(slug).not.toContain('---')
      expect(slug).toBe('john-smith')
    })
  })

  describe('isValidSlug', () => {
    it('should validate correct slugs', () => {
      expect(isValidSlug('john-smith')).toBe(true)
      expect(isValidSlug('mary-k-johnson')).toBe(true)
      expect(isValidSlug('william-thompson-jr')).toBe(true)
    })

    it('should reject invalid slugs', () => {
      expect(isValidSlug('')).toBe(false)
      expect(isValidSlug('John Smith')).toBe(false)
      expect(isValidSlug('john_smith')).toBe(false)
      expect(isValidSlug('john--smith')).toBe(false)
      expect(isValidSlug('-john-smith')).toBe(false)
      expect(isValidSlug('john-smith-')).toBe(false)
    })

    it('should enforce length requirements', () => {
      expect(isValidSlug('j')).toBe(false)
      expect(isValidSlug('j'.repeat(101))).toBe(false)
      expect(isValidSlug('john-smith')).toBe(true)
    })

    it('should allow numbers in slugs', () => {
      expect(isValidSlug('judge-123')).toBe(true)
      expect(isValidSlug('john-smith-2')).toBe(true)
    })

    it('should reject null or undefined', () => {
      expect(isValidSlug(null as any)).toBe(false)
      expect(isValidSlug(undefined as any)).toBe(false)
    })
  })

  describe('createCanonicalSlug', () => {
    it('should create canonical slugs', () => {
      expect(createCanonicalSlug('John Robert Smith')).toBe('john-robert-smith')
      expect(createCanonicalSlug('Mary K. Johnson')).toBe('mary-k-johnson')
    })

    it('should include suffixes in canonical slug', () => {
      expect(createCanonicalSlug('William Thompson Jr.')).toBe('william-thompson-jr')
      expect(createCanonicalSlug('Charles Reynolds III')).toBe('charles-reynolds-iii')
    })

    it('should handle edge cases gracefully', () => {
      const slug = createCanonicalSlug('')
      expect(slug).toBe('unknown-judge')
    })
  })

  describe('generateSlugVariations', () => {
    it('should include canonical slug first', () => {
      const variations = generateSlugVariations('John Robert Smith')
      expect(variations[0]).toBe('john-robert-smith')
    })

    it('should generate variations with titles', () => {
      const variations = generateSlugVariations('John Smith')
      expect(variations).toContain('judge-john-smith')
      expect(variations).toContain('justice-john-smith')
    })

    it('should generate first-last only variation', () => {
      const variations = generateSlugVariations('John Robert Smith')
      expect(variations).toContain('john-smith')
    })

    it('should filter out invalid slugs', () => {
      const variations = generateSlugVariations('John Smith')
      expect(variations.every((slug) => isValidSlug(slug))).toBe(true)
    })

    it('should deduplicate variations', () => {
      const variations = generateSlugVariations('John Smith')
      const uniqueVariations = [...new Set(variations)]
      expect(variations.length).toBe(uniqueVariations.length)
    })
  })

  describe('isValidSlugVariation', () => {
    it('should validate slug variations', () => {
      expect(isValidSlugVariation('john-smith', 'John Smith')).toBe(true)
      expect(isValidSlugVariation('judge-john-smith', 'John Smith')).toBe(true)
    })

    it('should reject invalid variations', () => {
      expect(isValidSlugVariation('jane-doe', 'John Smith')).toBe(false)
      expect(isValidSlugVariation('invalid slug', 'John Smith')).toBe(false)
    })

    it('should handle empty input', () => {
      expect(isValidSlugVariation('', 'John Smith')).toBe(false)
      expect(isValidSlugVariation('john-smith', '')).toBe(false)
    })
  })

  describe('slugToName', () => {
    it('should convert slug to readable name', () => {
      expect(slugToName('john-smith')).toBe('John Smith')
      expect(slugToName('mary-k-johnson')).toBe('Mary K. Johnson')
    })

    it('should handle initials correctly', () => {
      expect(slugToName('j-michael-anderson')).toBe('J. Michael Anderson')
    })

    it('should handle roman numerals', () => {
      expect(slugToName('charles-reynolds-iii')).toBe('Charles Reynolds III')
    })

    it('should capitalize each word', () => {
      expect(slugToName('william-james-thompson')).toBe('William James Thompson')
    })
  })
})
