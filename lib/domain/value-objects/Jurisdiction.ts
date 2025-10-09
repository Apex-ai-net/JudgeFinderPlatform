/**
 * Jurisdiction Value Object
 *
 * Represents a legal jurisdiction with hierarchical structure.
 * Supports federal, state, and county-level jurisdictions.
 *
 * Business Rules:
 * - Jurisdictions have a hierarchical structure
 * - Federal jurisdictions don't have state/county
 * - State jurisdictions may have counties
 * - Immutable once created
 */

import { Result, ValidationError } from '../Result'

export type JurisdictionLevel = 'federal' | 'state' | 'county'

export class Jurisdiction {
  private constructor(
    private readonly _level: JurisdictionLevel,
    private readonly _state?: string,
    private readonly _county?: string,
    private readonly _district?: string
  ) {}

  /**
   * Creates a federal jurisdiction
   */
  static federal(district?: string): Result<Jurisdiction, ValidationError> {
    return Result.ok(new Jurisdiction('federal', undefined, undefined, district))
  }

  /**
   * Creates a state-level jurisdiction
   */
  static state(state: string): Result<Jurisdiction, ValidationError> {
    const normalized = state.trim()
    if (!normalized) {
      return Result.err(new ValidationError('State cannot be empty'))
    }

    return Result.ok(new Jurisdiction('state', normalized))
  }

  /**
   * Creates a county-level jurisdiction
   */
  static county(state: string, county: string): Result<Jurisdiction, ValidationError> {
    const normalizedState = state.trim()
    const normalizedCounty = county.trim()

    if (!normalizedState) {
      return Result.err(new ValidationError('State cannot be empty'))
    }

    if (!normalizedCounty) {
      return Result.err(new ValidationError('County cannot be empty'))
    }

    return Result.ok(new Jurisdiction('county', normalizedState, normalizedCounty))
  }

  /**
   * Parses a jurisdiction from a string representation
   *
   * Examples:
   * - "Federal" -> federal jurisdiction
   * - "Federal - Northern District of California" -> federal with district
   * - "California" -> state jurisdiction
   * - "Los Angeles County, California" -> county jurisdiction
   */
  static parse(value: string): Result<Jurisdiction, ValidationError> {
    const trimmed = value.trim()

    // Federal jurisdiction patterns
    if (trimmed.toLowerCase().startsWith('federal')) {
      const districtMatch = trimmed.match(/federal\s*-\s*(.+)/i)
      return Jurisdiction.federal(districtMatch ? districtMatch[1] : undefined)
    }

    // County jurisdiction pattern: "County Name County, State"
    const countyMatch = trimmed.match(/^(.+?)\s+County,\s*(.+)$/i)
    if (countyMatch) {
      return Jurisdiction.county(countyMatch[2], countyMatch[1])
    }

    // Default to state jurisdiction
    return Jurisdiction.state(trimmed)
  }

  /**
   * Gets the jurisdiction level
   */
  get level(): JurisdictionLevel {
    return this._level
  }

  /**
   * Gets the state (undefined for federal jurisdictions)
   */
  get state(): string | undefined {
    return this._state
  }

  /**
   * Gets the county (only for county-level jurisdictions)
   */
  get county(): string | undefined {
    return this._county
  }

  /**
   * Gets the federal district (only for federal jurisdictions)
   */
  get district(): string | undefined {
    return this._district
  }

  /**
   * Checks if this is a federal jurisdiction
   */
  isFederal(): boolean {
    return this._level === 'federal'
  }

  /**
   * Checks if this is a state jurisdiction
   */
  isState(): boolean {
    return this._level === 'state'
  }

  /**
   * Checks if this is a county jurisdiction
   */
  isCounty(): boolean {
    return this._level === 'county'
  }

  /**
   * Checks if this jurisdiction is within another jurisdiction
   * (e.g., county is within state, state is within federal)
   */
  isWithin(other: Jurisdiction): boolean {
    // Federal contains everything
    if (other.isFederal()) {
      return true
    }

    // State contains counties in that state
    if (other.isState() && this.isCounty()) {
      return this._state === other._state
    }

    // Same level jurisdictions must be equal
    if (this._level === other._level) {
      return this.equals(other)
    }

    return false
  }

  /**
   * String representation
   */
  toString(): string {
    if (this._level === 'federal') {
      return this._district ? `Federal - ${this._district}` : 'Federal'
    }

    if (this._level === 'county') {
      return `${this._county} County, ${this._state}`
    }

    return this._state || 'Unknown'
  }

  /**
   * Short string representation (for display)
   */
  toShortString(): string {
    if (this._level === 'federal') {
      return 'Federal'
    }

    if (this._level === 'county') {
      return `${this._county} County`
    }

    return this._state || 'Unknown'
  }

  /**
   * Value equality comparison
   */
  equals(other: Jurisdiction): boolean {
    if (!(other instanceof Jurisdiction)) {
      return false
    }

    return (
      this._level === other._level &&
      this._state === other._state &&
      this._county === other._county &&
      this._district === other._district
    )
  }

  /**
   * Converts to plain object for serialization
   */
  toJSON(): {
    level: JurisdictionLevel
    state?: string
    county?: string
    district?: string
    display: string
  } {
    return {
      level: this._level,
      state: this._state,
      county: this._county,
      district: this._district,
      display: this.toString(),
    }
  }

  /**
   * Creates Jurisdiction from JSON
   */
  static fromJSON(json: {
    level: JurisdictionLevel
    state?: string
    county?: string
    district?: string
  }): Result<Jurisdiction, ValidationError> {
    if (json.level === 'federal') {
      return Jurisdiction.federal(json.district)
    }

    if (json.level === 'state' && json.state) {
      return Jurisdiction.state(json.state)
    }

    if (json.level === 'county' && json.state && json.county) {
      return Jurisdiction.county(json.state, json.county)
    }

    return Result.err(new ValidationError('Invalid jurisdiction JSON', { json }))
  }
}
