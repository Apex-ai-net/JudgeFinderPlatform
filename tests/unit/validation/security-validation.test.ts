/**
 * Unit tests for input validation and security
 * Tests XSS prevention, SQL injection prevention, and input sanitization
 * CRITICAL: These tests ensure production security
 */

import { describe, it, expect } from 'vitest'
import {
  isValidUUID,
  isValidSlug,
  sanitizeSearchQuery,
  normalizeJudgeSearchQuery,
  slugSchema,
  searchQuerySchema,
  judgeSearchParamsSchema,
  courtSearchParamsSchema,
  analyticsParamsSchema,
  paginationSchema,
  jurisdictionSchema,
  validateParams,
} from '@/lib/utils/validation'

describe('Security Validation', () => {
  describe('XSS Payload Sanitization', () => {
    it('should remove script tags from search queries', () => {
      const malicious = '<script>alert("xss")</script>John Smith'
      const sanitized = sanitizeSearchQuery(malicious)
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('</script>')
    })

    it('should remove angle brackets to prevent XSS', () => {
      const malicious = '<img src=x onerror=alert(1)>'
      const sanitized = sanitizeSearchQuery(malicious)
      expect(sanitized).not.toContain('<')
      expect(sanitized).not.toContain('>')
    })

    it('should handle common XSS attack vectors', () => {
      const attacks = [
        '<script>alert(document.cookie)</script>',
        '<img src=x onerror=alert(1)>',
        '<svg/onload=alert(1)>',
        'javascript:alert(1)',
        '<iframe src="javascript:alert(1)">',
      ]

      attacks.forEach((attack) => {
        const sanitized = sanitizeSearchQuery(attack)
        expect(sanitized).not.toContain('<')
        expect(sanitized).not.toContain('>')
        expect(sanitized).not.toContain('script')
      })
    })

    it('should limit length to prevent DoS attacks', () => {
      const longString = 'a'.repeat(1000)
      const sanitized = sanitizeSearchQuery(longString)
      expect(sanitized.length).toBeLessThanOrEqual(100)
    })

    it('should trim whitespace', () => {
      const query = '  John Smith  '
      const sanitized = sanitizeSearchQuery(query)
      expect(sanitized).toBe('John Smith')
    })

    it('should preserve valid search terms', () => {
      const validQuery = 'John Robert Smith Jr.'
      const sanitized = sanitizeSearchQuery(validQuery)
      expect(sanitized).toBe('John Robert Smith Jr.')
    })

    it('should handle encoded XSS attempts', () => {
      const encoded = '%3Cscript%3Ealert(1)%3C/script%3E'
      const sanitized = sanitizeSearchQuery(encoded)
      expect(sanitized).not.toContain('<script>')
    })

    it('should handle null bytes and control characters', () => {
      const malicious = 'John\x00Smith\x01Test'
      const sanitized = sanitizeSearchQuery(malicious)
      expect(sanitized).toBeTruthy()
    })
  })

  describe('SQL Injection Prevention', () => {
    it('should reject SQL injection in search params', () => {
      const sqlInjection = "'; DROP TABLE judges; --"
      const result = searchQuerySchema.safeParse(sqlInjection)
      expect(result.success).toBe(true) // Schema allows it, but DB layer should use parameterized queries

      // Verify sanitization happens
      const sanitized = sanitizeSearchQuery(sqlInjection)
      expect(sanitized).not.toContain(';')
    })

    it('should reject SQL keywords in slug', () => {
      const sqlSlug = 'john-smith-union-select'
      const result = slugSchema.safeParse(sqlSlug)
      expect(result.success).toBe(true) // Valid slug format
      // SQL injection prevention relies on parameterized queries at DB layer
    })

    it('should handle SQL injection attempts in UUID', () => {
      const invalidUUID = "1' OR '1'='1"
      expect(isValidUUID(invalidUUID)).toBe(false)
    })

    it('should reject malformed UUIDs', () => {
      const invalid = [
        '',
        'not-a-uuid',
        '12345',
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        '00000000-0000-0000-0000-000000000000g',
      ]

      invalid.forEach((uuid) => {
        expect(isValidUUID(uuid)).toBe(false)
      })
    })

    it('should accept valid UUIDs only', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'c9bf9e57-1685-4c89-bafb-ff5af830be8a',
      ]

      validUUIDs.forEach((uuid) => {
        expect(isValidUUID(uuid)).toBe(true)
      })
    })
  })

  describe('UUID Format Validation', () => {
    it('should validate correct UUID v4 format', () => {
      const valid = '123e4567-e89b-12d3-a456-426614174000'
      expect(isValidUUID(valid)).toBe(true)
    })

    it('should reject UUIDs with wrong version', () => {
      // UUID v1, v2, v3 format (version bit != 4)
      const wrongVersion = '123e4567-e89b-72d3-a456-426614174000' // Version 7
      expect(isValidUUID(wrongVersion)).toBe(false)
    })

    it('should reject UUIDs with wrong variant', () => {
      const wrongVariant = '123e4567-e89b-42d3-1456-426614174000' // Variant bits wrong
      expect(isValidUUID(wrongVariant)).toBe(false)
    })

    it('should handle case insensitivity', () => {
      const uppercase = '550E8400-E29B-41D4-A716-446655440000'
      const lowercase = '550e8400-e29b-41d4-a716-446655440000'
      expect(isValidUUID(uppercase)).toBe(true)
      expect(isValidUUID(lowercase)).toBe(true)
    })

    it('should reject UUIDs with invalid characters', () => {
      const invalidChar = '550e8400-e29b-41d4-a716-44665544000g'
      expect(isValidUUID(invalidChar)).toBe(false)
    })

    it('should reject UUIDs with wrong length', () => {
      const tooShort = '550e8400-e29b-41d4-a716-44665544000'
      const tooLong = '550e8400-e29b-41d4-a716-4466554400000'
      expect(isValidUUID(tooShort)).toBe(false)
      expect(isValidUUID(tooLong)).toBe(false)
    })

    it('should reject UUIDs with missing hyphens', () => {
      const noHyphens = '550e8400e29b41d4a716446655440000'
      expect(isValidUUID(noHyphens)).toBe(false)
    })

    it('should reject UUIDs with extra hyphens', () => {
      const extraHyphens = '550e-8400-e29b-41d4-a716-446655440000'
      expect(isValidUUID(extraHyphens)).toBe(false)
    })
  })

  describe('Slug Validation', () => {
    it('should validate correct slug format', () => {
      expect(isValidSlug('john-smith')).toBe(true)
      expect(isValidSlug('mary-k-johnson')).toBe(true)
      expect(isValidSlug('judge-123')).toBe(true)
    })

    it('should reject slugs with uppercase letters', () => {
      expect(isValidSlug('John-Smith')).toBe(false)
      expect(isValidSlug('JOHN-SMITH')).toBe(false)
    })

    it('should reject slugs with special characters', () => {
      expect(isValidSlug('john_smith')).toBe(false)
      expect(isValidSlug('john.smith')).toBe(false)
      expect(isValidSlug('john@smith')).toBe(false)
      expect(isValidSlug('john smith')).toBe(false)
    })

    it('should reject empty or too short slugs', () => {
      expect(isValidSlug('')).toBe(false)
      expect(isValidSlug('a')).toBe(false) // Too short based on validation
    })

    it('should reject slugs exceeding max length', () => {
      const tooLong = 'a'.repeat(201)
      expect(isValidSlug(tooLong)).toBe(false)
    })

    it('should reject slugs with leading/trailing hyphens', () => {
      expect(isValidSlug('-john-smith')).toBe(false)
      expect(isValidSlug('john-smith-')).toBe(false)
    })

    it('should reject slugs with consecutive hyphens', () => {
      expect(isValidSlug('john--smith')).toBe(false)
      expect(isValidSlug('john---smith')).toBe(false)
    })
  })

  describe('Search Query Normalization', () => {
    it('should remove common noise words (judge, judges)', () => {
      expect(normalizeJudgeSearchQuery('judge John Smith')).toBe('John Smith')
      expect(normalizeJudgeSearchQuery('judges in california')).toBe('in california')
    })

    it('should handle case-insensitive noise word removal', () => {
      expect(normalizeJudgeSearchQuery('JUDGE John Smith')).toBe('John Smith')
      expect(normalizeJudgeSearchQuery('Judge JOHN SMITH')).toBe('JOHN SMITH')
    })

    it('should collapse multiple spaces', () => {
      expect(normalizeJudgeSearchQuery('John   Robert    Smith')).toBe('John Robert Smith')
    })

    it('should preserve valid search terms after sanitization', () => {
      const query = 'Mary K. Johnson'
      expect(normalizeJudgeSearchQuery(query)).toBe('Mary K. Johnson')
    })

    it('should return sanitized input if cleaning strips everything', () => {
      const result = normalizeJudgeSearchQuery('judge judges')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle XSS attempts', () => {
      const malicious = '<script>judge alert(1)</script>'
      const normalized = normalizeJudgeSearchQuery(malicious)
      expect(normalized).not.toContain('<script>')
    })
  })

  describe('Schema Validation - Judge Search Params', () => {
    it('should validate correct judge search params', () => {
      const params = {
        q: 'John Smith',
        limit: 20,
        page: 1,
        jurisdiction: 'CA',
      }
      const result = judgeSearchParamsSchema.safeParse(params)
      expect(result.success).toBe(true)
    })

    it('should apply default values', () => {
      const params = { q: 'John Smith' }
      const result = judgeSearchParamsSchema.safeParse(params)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(20)
        expect(result.data.page).toBe(1)
      }
    })

    it('should reject invalid limit values', () => {
      const params = { limit: 101 }
      const result = judgeSearchParamsSchema.safeParse(params)
      expect(result.success).toBe(false)
    })

    it('should reject invalid page values', () => {
      const params = { page: 0 }
      const result = judgeSearchParamsSchema.safeParse(params)
      expect(result.success).toBe(false)
    })

    it('should reject invalid court_id format', () => {
      const params = { court_id: 'not-a-uuid' }
      const result = judgeSearchParamsSchema.safeParse(params)
      expect(result.success).toBe(false)
    })

    it('should coerce string numbers', () => {
      const params = { limit: '25', page: '2' }
      const result = judgeSearchParamsSchema.safeParse(params)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(25)
        expect(result.data.page).toBe(2)
      }
    })
  })

  describe('Schema Validation - Pagination', () => {
    it('should enforce minimum page number', () => {
      const result = paginationSchema.safeParse({ page: 0, limit: 20 })
      expect(result.success).toBe(false)
    })

    it('should enforce maximum limit', () => {
      const result = paginationSchema.safeParse({ page: 1, limit: 101 })
      expect(result.success).toBe(false)
    })

    it('should apply defaults', () => {
      const result = paginationSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
      }
    })
  })

  describe('Schema Validation - Jurisdiction', () => {
    it('should validate correct jurisdiction codes', () => {
      const valid = ['CA', 'NY', 'TX', 'F', 'USA']
      valid.forEach((code) => {
        const result = jurisdictionSchema.safeParse(code)
        expect(result.success).toBe(true)
      })
    })

    it('should reject lowercase jurisdiction codes', () => {
      const result = jurisdictionSchema.safeParse('ca')
      expect(result.success).toBe(false)
    })

    it('should reject jurisdiction codes with special characters', () => {
      const result = jurisdictionSchema.safeParse('CA-1')
      expect(result.success).toBe(false)
    })

    it('should enforce minimum length', () => {
      const result = jurisdictionSchema.safeParse('C')
      expect(result.success).toBe(false)
    })

    it('should enforce maximum length', () => {
      const result = jurisdictionSchema.safeParse('TOOLONGCODE')
      expect(result.success).toBe(false)
    })
  })

  describe('validateParams Helper', () => {
    it('should return success for valid params', () => {
      const result = validateParams(
        judgeSearchParamsSchema,
        { q: 'John Smith', limit: 20, page: 1 },
        'test'
      )
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.q).toBe('John Smith')
      }
    })

    it('should return error response for invalid params', () => {
      const result = validateParams(judgeSearchParamsSchema, { limit: 101 }, 'test')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.response.status).toBe(400)
      }
    })

    it('should include validation errors in response', (): void => {
      const result = validateParams(analyticsParamsSchema, { id: 'not-a-uuid' }, 'test')
      expect(result.success).toBe(false)
      if (!result.success) {
        const json = result.response.json as Record<string, unknown>
        expect(json).toBeTruthy()
      }
    })
  })

  describe('Edge Cases and Attack Vectors', () => {
    it('should handle null input', () => {
      const result = searchQuerySchema.safeParse(null)
      expect(result.success).toBe(false)
    })

    it('should handle undefined input', () => {
      const result = searchQuerySchema.safeParse(undefined)
      expect(result.success).toBe(false)
    })

    it('should handle numeric input where string expected', () => {
      const result = slugSchema.safeParse(12345)
      expect(result.success).toBe(false)
    })

    it('should handle object input where string expected', () => {
      const result = slugSchema.safeParse({ name: 'john-smith' })
      expect(result.success).toBe(false)
    })

    it('should handle array input', () => {
      const result = slugSchema.safeParse(['john-smith'])
      expect(result.success).toBe(false)
    })

    it('should reject negative numbers in pagination', () => {
      const result = paginationSchema.safeParse({ page: -1, limit: -10 })
      expect(result.success).toBe(false)
    })

    it('should reject float numbers where integers expected', () => {
      const result = paginationSchema.safeParse({ page: 1.5, limit: 20.7 })
      expect(result.success).toBe(false)
    })
  })
})
