/**
 * Unit tests for AI search intelligence functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  extractLocation,
  extractCaseType,
  processNaturalLanguageQuery,
  generateSearchSuggestions,
} from '@/lib/ai/search-intelligence'

// Mock Google AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn(),
    })),
  })),
}))

describe('Search Intelligence', () => {
  describe('extractLocation', () => {
    it('should extract Los Angeles from query', () => {
      const result = extractLocation('Find judges in Los Angeles')
      expect(result).toBe('Los Angeles')
    })

    it('should extract LA abbreviation', () => {
      const result = extractLocation('Judges in LA county')
      expect(result).toBe('LA')
    })

    it('should extract Orange County', () => {
      const result = extractLocation('Orange County courts')
      expect(result).toBe('Orange County')
    })

    it('should extract San Francisco', () => {
      const result = extractLocation('san francisco judges')
      expect(result).toBe('San Francisco')
    })

    it('should return null for no location match', () => {
      const result = extractLocation('criminal law judges')
      expect(result).toBeNull()
    })

    it('should be case insensitive', () => {
      const result = extractLocation('ORANGE COUNTY')
      expect(result).toBe('Orange County')
    })
  })

  describe('extractCaseType', () => {
    it('should extract criminal case type', () => {
      const result = extractCaseType('criminal defense lawyers')
      expect(result).toBe('criminal')
    })

    it('should extract civil case type', () => {
      const result = extractCaseType('civil litigation judge')
      expect(result).toBe('civil')
    })

    it('should extract family/divorce case type', () => {
      expect(extractCaseType('divorce attorney')).toBe('divorce')
      expect(extractCaseType('family law court')).toBe('family')
      expect(extractCaseType('custody hearing')).toBe('custody')
    })

    it('should extract probate case type', () => {
      const result = extractCaseType('probate court judge')
      expect(result).toBe('probate')
    })

    it('should return null for no case type match', () => {
      const result = extractCaseType('Judge Smith')
      expect(result).toBeNull()
    })

    it('should be case insensitive', () => {
      const result = extractCaseType('CRIMINAL COURT')
      expect(result).toBe('criminal')
    })
  })

  describe('processNaturalLanguageQuery', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should process query with AI successfully', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const mockGenerateContent = vi.fn().mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              intent: {
                type: 'judge',
                searchType: 'name',
                extractedEntities: {
                  names: ['Judge Smith'],
                  locations: ['Los Angeles'],
                },
                confidence: 0.95,
              },
              processedQuery: 'Judge Smith Los Angeles',
              expandedTerms: ['Smith', 'J. Smith'],
              suggestions: ['Try searching for Judge Smith in Los Angeles Superior Court'],
              conversationalResponse: "I understand you're looking for Judge Smith in Los Angeles.",
            }),
        },
      })

      vi.mocked(GoogleGenerativeAI).mockImplementation(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: mockGenerateContent,
            }),
          }) as any
      )

      const result = await processNaturalLanguageQuery('Find Judge Smith in LA')

      expect(result.originalQuery).toBe('Find Judge Smith in LA')
      expect(result.searchIntent.type).toBe('judge')
      expect(result.searchIntent.searchType).toBe('name')
      expect(result.searchIntent.extractedEntities.names).toContain('Judge Smith')
      expect(result.suggestions.length).toBeGreaterThan(0)
    })

    it('should handle AI parsing errors gracefully', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const mockGenerateContent = vi.fn().mockResolvedValue({
        response: {
          text: () => 'Invalid JSON response',
        },
      })

      vi.mocked(GoogleGenerativeAI).mockImplementation(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: mockGenerateContent,
            }),
          }) as any
      )

      const result = await processNaturalLanguageQuery('criminal judges')

      // Should return fallback enhancement
      expect(result.originalQuery).toBe('criminal judges')
      expect(result.searchIntent.confidence).toBeLessThan(1)
    })

    it('should handle AI API errors gracefully', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const mockGenerateContent = vi.fn().mockRejectedValue(new Error('API Error'))

      vi.mocked(GoogleGenerativeAI).mockImplementation(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: mockGenerateContent,
            }),
          }) as any
      )

      const result = await processNaturalLanguageQuery('find judges')

      // Should return fallback enhancement
      expect(result.originalQuery).toBe('find judges')
      expect(result.searchIntent).toBeDefined()
    })

    it('should include context in query processing', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const mockGenerateContent = vi.fn().mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              intent: { type: 'judge', searchType: 'location', extractedEntities: {}, confidence: 0.8 },
              processedQuery: 'judges near me',
              expandedTerms: [],
              suggestions: [],
            }),
        },
      })

      vi.mocked(GoogleGenerativeAI).mockImplementation(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: mockGenerateContent,
            }),
          }) as any
      )

      const result = await processNaturalLanguageQuery('judges near me', {
        userLocation: 'Los Angeles',
        previousQueries: ['criminal courts'],
      })

      expect(mockGenerateContent).toHaveBeenCalled()
      const callArgs = mockGenerateContent.mock.calls[0][0]
      expect(callArgs).toContain('Los Angeles')
      expect(callArgs).toContain('criminal courts')
    })
  })

  describe('generateSearchSuggestions', () => {
    it('should return empty array for very short queries', async () => {
      const result = await generateSearchSuggestions('a')
      expect(result).toEqual([])
    })

    it('should generate suggestions with AI', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const mockGenerateContent = vi.fn().mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify([
              'Judge Smith Los Angeles',
              'Judge Smith Orange County',
              'Criminal Court Judge Smith',
            ]),
        },
      })

      vi.mocked(GoogleGenerativeAI).mockImplementation(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: mockGenerateContent,
            }),
          }) as any
      )

      const result = await generateSearchSuggestions('Judge Smith', ['previous search'])

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should fallback to static suggestions on error', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const mockGenerateContent = vi.fn().mockRejectedValue(new Error('API Error'))

      vi.mocked(GoogleGenerativeAI).mockImplementation(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: mockGenerateContent,
            }),
          }) as any
      )

      const result = await generateSearchSuggestions('judge')

      expect(Array.isArray(result)).toBe(true)
      // Should still return some suggestions from static fallback
    })

    it('should handle malformed AI responses', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const mockGenerateContent = vi.fn().mockResolvedValue({
        response: {
          text: () => 'Not valid JSON',
        },
      })

      vi.mocked(GoogleGenerativeAI).mockImplementation(
        () =>
          ({
            getGenerativeModel: () => ({
              generateContent: mockGenerateContent,
            }),
          }) as any
      )

      const result = await generateSearchSuggestions('civil')

      expect(Array.isArray(result)).toBe(true)
    })
  })
})
