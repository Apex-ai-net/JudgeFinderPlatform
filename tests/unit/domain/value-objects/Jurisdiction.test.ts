import { describe, it, expect } from 'vitest'
import { Jurisdiction } from '@/lib/domain/value-objects/Jurisdiction'

describe('Jurisdiction Value Object', () => {
  describe('federal', () => {
    it('should create a federal jurisdiction without district', () => {
      const result = Jurisdiction.federal()
      expect(result.isOk()).toBe(true)

      const jurisdiction = result.unwrap()
      expect(jurisdiction.level).toBe('federal')
      expect(jurisdiction.isFederal()).toBe(true)
      expect(jurisdiction.toString()).toBe('Federal')
    })

    it('should create a federal jurisdiction with district', () => {
      const result = Jurisdiction.federal('Northern District of California')
      expect(result.isOk()).toBe(true)

      const jurisdiction = result.unwrap()
      expect(jurisdiction.district).toBe('Northern District of California')
      expect(jurisdiction.toString()).toBe('Federal - Northern District of California')
    })
  })

  describe('state', () => {
    it('should create a state jurisdiction', () => {
      const result = Jurisdiction.state('California')
      expect(result.isOk()).toBe(true)

      const jurisdiction = result.unwrap()
      expect(jurisdiction.level).toBe('state')
      expect(jurisdiction.state).toBe('California')
      expect(jurisdiction.isState()).toBe(true)
      expect(jurisdiction.toString()).toBe('California')
    })

    it('should reject empty state', () => {
      const result = Jurisdiction.state('')
      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('cannot be empty')
    })

    it('should trim whitespace', () => {
      const result = Jurisdiction.state('  California  ')
      expect(result.isOk()).toBe(true)
      expect(result.unwrap().state).toBe('California')
    })
  })

  describe('county', () => {
    it('should create a county jurisdiction', () => {
      const result = Jurisdiction.county('California', 'Los Angeles')
      expect(result.isOk()).toBe(true)

      const jurisdiction = result.unwrap()
      expect(jurisdiction.level).toBe('county')
      expect(jurisdiction.state).toBe('California')
      expect(jurisdiction.county).toBe('Los Angeles')
      expect(jurisdiction.isCounty()).toBe(true)
      expect(jurisdiction.toString()).toBe('Los Angeles County, California')
    })

    it('should reject empty state', () => {
      const result = Jurisdiction.county('', 'Los Angeles')
      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('State cannot be empty')
    })

    it('should reject empty county', () => {
      const result = Jurisdiction.county('California', '')
      expect(result.isErr()).toBe(true)
      expect(result.error().message).toContain('County cannot be empty')
    })
  })

  describe('parse', () => {
    it('should parse "Federal"', () => {
      const result = Jurisdiction.parse('Federal')
      expect(result.isOk()).toBe(true)
      expect(result.unwrap().isFederal()).toBe(true)
    })

    it('should parse federal with district', () => {
      const result = Jurisdiction.parse('Federal - Northern District of California')
      expect(result.isOk()).toBe(true)

      const jurisdiction = result.unwrap()
      expect(jurisdiction.isFederal()).toBe(true)
      expect(jurisdiction.district).toBe('Northern District of California')
    })

    it('should parse county format', () => {
      const result = Jurisdiction.parse('Los Angeles County, California')
      expect(result.isOk()).toBe(true)

      const jurisdiction = result.unwrap()
      expect(jurisdiction.isCounty()).toBe(true)
      expect(jurisdiction.county).toBe('Los Angeles')
      expect(jurisdiction.state).toBe('California')
    })

    it('should parse state as default', () => {
      const result = Jurisdiction.parse('California')
      expect(result.isOk()).toBe(true)

      const jurisdiction = result.unwrap()
      expect(jurisdiction.isState()).toBe(true)
      expect(jurisdiction.state).toBe('California')
    })
  })

  describe('isWithin', () => {
    it('should return true for county within state', () => {
      const county = Jurisdiction.county('California', 'Los Angeles').unwrap()
      const state = Jurisdiction.state('California').unwrap()

      expect(county.isWithin(state)).toBe(true)
    })

    it('should return false for county not in state', () => {
      const county = Jurisdiction.county('California', 'Los Angeles').unwrap()
      const state = Jurisdiction.state('New York').unwrap()

      expect(county.isWithin(state)).toBe(false)
    })

    it('should return true for any jurisdiction within federal', () => {
      const state = Jurisdiction.state('California').unwrap()
      const county = Jurisdiction.county('California', 'Los Angeles').unwrap()
      const federal = Jurisdiction.federal().unwrap()

      expect(state.isWithin(federal)).toBe(true)
      expect(county.isWithin(federal)).toBe(true)
    })

    it('should return true for identical jurisdictions', () => {
      const j1 = Jurisdiction.state('California').unwrap()
      const j2 = Jurisdiction.state('California').unwrap()

      expect(j1.isWithin(j2)).toBe(true)
    })
  })

  describe('toShortString', () => {
    it('should return short string for federal', () => {
      const jurisdiction = Jurisdiction.federal('Northern District of California').unwrap()
      expect(jurisdiction.toShortString()).toBe('Federal')
    })

    it('should return short string for county', () => {
      const jurisdiction = Jurisdiction.county('California', 'Los Angeles').unwrap()
      expect(jurisdiction.toShortString()).toBe('Los Angeles County')
    })

    it('should return state name for state', () => {
      const jurisdiction = Jurisdiction.state('California').unwrap()
      expect(jurisdiction.toShortString()).toBe('California')
    })
  })

  describe('equals', () => {
    it('should return true for identical jurisdictions', () => {
      const j1 = Jurisdiction.state('California').unwrap()
      const j2 = Jurisdiction.state('California').unwrap()
      expect(j1.equals(j2)).toBe(true)
    })

    it('should return false for different jurisdictions', () => {
      const j1 = Jurisdiction.state('California').unwrap()
      const j2 = Jurisdiction.state('New York').unwrap()
      expect(j1.equals(j2)).toBe(false)
    })

    it('should return false for different levels', () => {
      const state = Jurisdiction.state('California').unwrap()
      const federal = Jurisdiction.federal().unwrap()
      expect(state.equals(federal)).toBe(false)
    })
  })

  describe('JSON serialization', () => {
    it('should serialize federal jurisdiction', () => {
      const jurisdiction = Jurisdiction.federal('Northern District').unwrap()
      const json = jurisdiction.toJSON()

      expect(json.level).toBe('federal')
      expect(json.district).toBe('Northern District')
      expect(json.display).toBe('Federal - Northern District')
    })

    it('should serialize state jurisdiction', () => {
      const jurisdiction = Jurisdiction.state('California').unwrap()
      const json = jurisdiction.toJSON()

      expect(json.level).toBe('state')
      expect(json.state).toBe('California')
      expect(json.display).toBe('California')
    })

    it('should serialize county jurisdiction', () => {
      const jurisdiction = Jurisdiction.county('California', 'Los Angeles').unwrap()
      const json = jurisdiction.toJSON()

      expect(json.level).toBe('county')
      expect(json.state).toBe('California')
      expect(json.county).toBe('Los Angeles')
      expect(json.display).toBe('Los Angeles County, California')
    })

    it('should deserialize from JSON', () => {
      const json = {
        level: 'county' as const,
        state: 'California',
        county: 'Los Angeles',
      }
      const result = Jurisdiction.fromJSON(json)

      expect(result.isOk()).toBe(true)
      expect(result.unwrap().toString()).toBe('Los Angeles County, California')
    })
  })
})
