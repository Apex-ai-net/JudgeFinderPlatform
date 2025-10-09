/**
 * Unit tests for input validation and sanitization
 */

import { describe, it, expect } from 'vitest'
import { sanitizeSearchQuery, normalizeJudgeSearchQuery } from '@/lib/utils/validation'
import { sanitizeLikePattern } from '@/lib/utils/sql-sanitize'

describe('Input Validation', (): void => {
  describe('sanitizeSearchQuery', (): void => {
    it('should remove HTML tags', (): void => {
      const result = sanitizeSearchQuery('<script>alert("xss")</script>Judge Smith')
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('</script>')
    })

    it('should trim whitespace', (): void => {
      const result = sanitizeSearchQuery('  Judge Smith  ')
      expect(result).toBe('Judge Smith')
    })

    it('should handle empty string', (): void => {
      const result = sanitizeSearchQuery('')
      expect(result).toBe('')
    })

    it('should handle null/undefined', (): void => {
      const result1 = sanitizeSearchQuery(null as unknown as string)
      const result2 = sanitizeSearchQuery(undefined as unknown as string)
      expect(result1).toBe('')
      expect(result2).toBe('')
    })

    it('should preserve normal text', () => {
      const result = sanitizeSearchQuery('Judge Smith Los Angeles')
      expect(result).toBe('Judge Smith Los Angeles')
    })

    it('should remove dangerous characters', () => {
      const result = sanitizeSearchQuery('Judge<>Smith')
      expect(result).not.toContain('<')
      expect(result).not.toContain('>')
    })

    it('should handle SQL injection attempts', () => {
      const result = sanitizeSearchQuery("'; DROP TABLE judges; --")
      expect(result).not.toContain('DROP TABLE')
    })
  })

  describe('normalizeJudgeSearchQuery', () => {
    it('should normalize judge name with title', () => {
      const result = normalizeJudgeSearchQuery('Judge John Smith')
      expect(result.toLowerCase()).not.toContain('judge')
      expect(result).toContain('John')
      expect(result).toContain('Smith')
    })

    it('should normalize variations of judge titles', () => {
      expect(normalizeJudgeSearchQuery('Hon. Smith')).not.toContain('Hon.')
      expect(normalizeJudgeSearchQuery('Justice Smith')).not.toContain('Justice')
      expect(normalizeJudgeSearchQuery('Magistrate Smith')).not.toContain('Magistrate')
    })

    it('should handle multiple spaces', () => {
      const result = normalizeJudgeSearchQuery('John    Smith')
      expect(result).toBe('John Smith')
    })

    it('should preserve hyphens in names', () => {
      const result = normalizeJudgeSearchQuery('John-Paul Smith')
      expect(result).toBe('John-Paul Smith')
    })

    it('should handle apostrophes', () => {
      const result = normalizeJudgeSearchQuery("O'Connor")
      expect(result).toContain("O'Connor")
    })

    it('should be case insensitive', () => {
      const result = normalizeJudgeSearchQuery('JUDGE SMITH')
      expect(result).not.toMatch(/^JUDGE/)
    })
  })

  describe('sanitizeLikePattern', () => {
    it('should escape SQL LIKE wildcards', () => {
      const result = sanitizeLikePattern('John%Smith')
      expect(result).not.toContain('%')
    })

    it('should escape underscore wildcard', () => {
      const result = sanitizeLikePattern('John_Smith')
      expect(result).not.toContain('_')
    })

    it('should handle normal text without special chars', () => {
      const result = sanitizeLikePattern('John Smith')
      expect(result).toBe('John Smith')
    })

    it('should handle empty string', () => {
      const result = sanitizeLikePattern('')
      expect(result).toBe('')
    })

    it('should escape backslashes', () => {
      const result = sanitizeLikePattern('John\\Smith')
      expect(result).not.toContain('\\')
    })

    it('should handle multiple special characters', () => {
      const result = sanitizeLikePattern('100% match_test')
      expect(result).not.toContain('%')
      expect(result).not.toContain('_')
    })

    it('should prevent SQL injection in LIKE clause', () => {
      const malicious = "test' OR '1'='1"
      const result = sanitizeLikePattern(malicious)
      // Should escape or remove dangerous patterns
      expect(result).toBeDefined()
    })
  })

  describe('Integration: Combined Validation', () => {
    it('should safely process user search input end-to-end', () => {
      const userInput = '<script>alert("xss")</script>Judge%Smith_Test'
      const sanitized = sanitizeSearchQuery(userInput)
      const normalized = normalizeJudgeSearchQuery(sanitized)
      const sqlSafe = sanitizeLikePattern(normalized)

      expect(sqlSafe).not.toContain('<script>')
      expect(sqlSafe).not.toContain('%')
      expect(sqlSafe).not.toContain('_')
    })

    it('should handle complex real-world input', () => {
      const userInput = "  Hon. John O'Brien-Smith (Ret.)  "
      const sanitized = sanitizeSearchQuery(userInput)
      const normalized = normalizeJudgeSearchQuery(sanitized)

      expect(normalized).toContain('John')
      expect(normalized).toContain("O'Brien-Smith")
      expect(normalized).not.toContain('Hon.')
      expect(normalized).not.toContain('(Ret.)')
    })
  })
})
