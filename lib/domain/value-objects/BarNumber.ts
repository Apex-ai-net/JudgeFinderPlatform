/**
 * BarNumber Value Object
 *
 * Represents a verified attorney bar number with state jurisdiction.
 * Enforces validation rules and ensures immutability.
 *
 * Business Rules:
 * - Bar number must be associated with a US state
 * - Format validation ensures consistency
 * - Immutable once created
 */

import { Result, ValidationError } from '../Result'

const US_STATES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
  'DC', // District of Columbia
] as const

export type USState = (typeof US_STATES)[number]

export class BarNumber {
  private constructor(
    private readonly _state: USState,
    private readonly _number: string
  ) {}

  /**
   * Creates a BarNumber from state and number
   * Validates format and state code
   */
  static create(state: string, number: string): Result<BarNumber, ValidationError> {
    // Normalize state code
    const normalizedState = state.trim().toUpperCase()

    // Validate state
    if (!US_STATES.includes(normalizedState as USState)) {
      return Result.err(
        new ValidationError('Invalid state code', {
          state,
          validStates: US_STATES,
        })
      )
    }

    // Validate number is not empty
    const trimmedNumber = number.trim()
    if (!trimmedNumber) {
      return Result.err(new ValidationError('Bar number cannot be empty'))
    }

    // Validate format: alphanumeric with optional hyphens/spaces
    const barNumberPattern = /^[A-Z0-9\s\-]+$/i
    if (!barNumberPattern.test(trimmedNumber)) {
      return Result.err(
        new ValidationError('Bar number must contain only letters, numbers, hyphens, and spaces', {
          number: trimmedNumber,
        })
      )
    }

    // Validate length: most bar numbers are 4-12 characters
    if (trimmedNumber.length < 4 || trimmedNumber.length > 12) {
      return Result.err(
        new ValidationError('Bar number must be between 4 and 12 characters', {
          number: trimmedNumber,
          length: trimmedNumber.length,
        })
      )
    }

    return Result.ok(new BarNumber(normalizedState as USState, trimmedNumber))
  }

  /**
   * Parses a bar number from a combined string format (e.g., "CA-123456")
   */
  static parse(value: string): Result<BarNumber, ValidationError> {
    const trimmed = value.trim()

    // Try to parse "STATE-NUMBER" format
    const parts = trimmed.split('-')
    if (parts.length === 2) {
      return BarNumber.create(parts[0], parts[1])
    }

    // Try to parse "STATE NUMBER" format (space-separated)
    const spaceParts = trimmed.split(/\s+/)
    if (spaceParts.length >= 2 && spaceParts[0].length === 2) {
      return BarNumber.create(spaceParts[0], spaceParts.slice(1).join(' '))
    }

    return Result.err(
      new ValidationError('Bar number must be in format "STATE-NUMBER" or "STATE NUMBER"', {
        value,
      })
    )
  }

  /**
   * Gets the state code
   */
  get state(): USState {
    return this._state
  }

  /**
   * Gets the bar number
   */
  get number(): string {
    return this._number
  }

  /**
   * Gets the full bar number in canonical format
   */
  toString(): string {
    return `${this._state}-${this._number}`
  }

  /**
   * Value equality comparison
   */
  equals(other: BarNumber): boolean {
    if (!(other instanceof BarNumber)) {
      return false
    }
    return this._state === other._state && this._number === other._number
  }

  /**
   * Creates a new BarNumber with normalized format
   * Removes extra spaces and standardizes separators
   */
  normalize(): BarNumber {
    const normalizedNumber = this._number.replace(/\s+/g, '').replace(/-+/g, '')
    return new BarNumber(this._state, normalizedNumber)
  }

  /**
   * Converts to plain object for serialization
   */
  toJSON(): { state: string; number: string; full: string } {
    return {
      state: this._state,
      number: this._number,
      full: this.toString(),
    }
  }

  /**
   * Creates BarNumber from JSON
   */
  static fromJSON(json: { state: string; number: string }): Result<BarNumber, ValidationError> {
    return BarNumber.create(json.state, json.number)
  }
}
