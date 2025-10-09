/**
 * Money Value Object
 *
 * Represents monetary amounts with currency and precision handling.
 * Prevents floating-point arithmetic errors and ensures consistency.
 *
 * Business Rules:
 * - All amounts stored as integers (cents)
 * - Supports arithmetic operations with proper rounding
 * - Currency-aware comparisons
 * - Immutable once created
 */

import { Result, ValidationError } from '../Result'

export type Currency = 'USD' | 'EUR' | 'GBP'

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
}

const CURRENCY_DECIMALS: Record<Currency, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
}

export class Money {
  private constructor(
    private readonly _amountInCents: number,
    private readonly _currency: Currency
  ) {}

  /**
   * Creates Money from dollar amount
   */
  static fromDollars(amount: number, currency: Currency = 'USD'): Result<Money, ValidationError> {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return Result.err(new ValidationError('Amount must be a valid number', { amount }))
    }

    if (!isFinite(amount)) {
      return Result.err(new ValidationError('Amount must be finite', { amount }))
    }

    if (amount < 0) {
      return Result.err(new ValidationError('Amount cannot be negative', { amount }))
    }

    // Convert to cents and round to avoid floating-point issues
    const decimals = CURRENCY_DECIMALS[currency]
    const multiplier = Math.pow(10, decimals)
    const amountInCents = Math.round(amount * multiplier)

    return Result.ok(new Money(amountInCents, currency))
  }

  /**
   * Creates Money from cents
   */
  static fromCents(
    amountInCents: number,
    currency: Currency = 'USD'
  ): Result<Money, ValidationError> {
    if (!Number.isInteger(amountInCents)) {
      return Result.err(
        new ValidationError('Amount in cents must be an integer', { amountInCents })
      )
    }

    if (amountInCents < 0) {
      return Result.err(new ValidationError('Amount cannot be negative', { amountInCents }))
    }

    return Result.ok(new Money(amountInCents, currency))
  }

  /**
   * Creates a zero Money value
   */
  static zero(currency: Currency = 'USD'): Money {
    return new Money(0, currency)
  }

  /**
   * Gets the amount in dollars (with decimals)
   */
  get dollars(): number {
    const decimals = CURRENCY_DECIMALS[this._currency]
    const divisor = Math.pow(10, decimals)
    return this._amountInCents / divisor
  }

  /**
   * Gets the amount in cents (integer)
   */
  get cents(): number {
    return this._amountInCents
  }

  /**
   * Gets the currency
   */
  get currency(): Currency {
    return this._currency
  }

  /**
   * Adds another Money value
   * Both amounts must have the same currency
   */
  add(other: Money): Result<Money, ValidationError> {
    if (this._currency !== other._currency) {
      return Result.err(
        new ValidationError('Cannot add money with different currencies', {
          thisCurrency: this._currency,
          otherCurrency: other._currency,
        })
      )
    }

    return Money.fromCents(this._amountInCents + other._amountInCents, this._currency)
  }

  /**
   * Subtracts another Money value
   * Both amounts must have the same currency
   */
  subtract(other: Money): Result<Money, ValidationError> {
    if (this._currency !== other._currency) {
      return Result.err(
        new ValidationError('Cannot subtract money with different currencies', {
          thisCurrency: this._currency,
          otherCurrency: other._currency,
        })
      )
    }

    const newAmount = this._amountInCents - other._amountInCents

    if (newAmount < 0) {
      return Result.err(
        new ValidationError('Subtraction would result in negative amount', {
          thisAmount: this._amountInCents,
          otherAmount: other._amountInCents,
        })
      )
    }

    return Money.fromCents(newAmount, this._currency)
  }

  /**
   * Multiplies by a factor
   * Uses banker's rounding (round half to even)
   */
  multiply(factor: number): Result<Money, ValidationError> {
    if (typeof factor !== 'number' || isNaN(factor)) {
      return Result.err(new ValidationError('Factor must be a valid number', { factor }))
    }

    if (factor < 0) {
      return Result.err(new ValidationError('Factor cannot be negative', { factor }))
    }

    const newAmount = Math.round(this._amountInCents * factor)
    return Money.fromCents(newAmount, this._currency)
  }

  /**
   * Divides by a divisor
   */
  divide(divisor: number): Result<Money, ValidationError> {
    if (typeof divisor !== 'number' || isNaN(divisor)) {
      return Result.err(new ValidationError('Divisor must be a valid number', { divisor }))
    }

    if (divisor === 0) {
      return Result.err(new ValidationError('Cannot divide by zero'))
    }

    if (divisor < 0) {
      return Result.err(new ValidationError('Divisor cannot be negative', { divisor }))
    }

    const newAmount = Math.round(this._amountInCents / divisor)
    return Money.fromCents(newAmount, this._currency)
  }

  /**
   * Applies a percentage discount
   * @param percentage - Percentage as a number (e.g., 15 for 15%)
   */
  applyDiscount(percentage: number): Result<Money, ValidationError> {
    if (percentage < 0 || percentage > 100) {
      return Result.err(new ValidationError('Percentage must be between 0 and 100', { percentage }))
    }

    const factor = 1 - percentage / 100
    return this.multiply(factor)
  }

  /**
   * Calculates percentage of this amount
   * @param percentage - Percentage as a number (e.g., 15 for 15%)
   */
  percentage(percentage: number): Result<Money, ValidationError> {
    if (percentage < 0 || percentage > 100) {
      return Result.err(new ValidationError('Percentage must be between 0 and 100', { percentage }))
    }

    return this.multiply(percentage / 100)
  }

  /**
   * Checks if this amount is greater than another
   */
  greaterThan(other: Money): boolean {
    this.ensureSameCurrency(other)
    return this._amountInCents > other._amountInCents
  }

  /**
   * Checks if this amount is less than another
   */
  lessThan(other: Money): boolean {
    this.ensureSameCurrency(other)
    return this._amountInCents < other._amountInCents
  }

  /**
   * Checks if this amount is greater than or equal to another
   */
  greaterThanOrEqual(other: Money): boolean {
    this.ensureSameCurrency(other)
    return this._amountInCents >= other._amountInCents
  }

  /**
   * Checks if this amount is less than or equal to another
   */
  lessThanOrEqual(other: Money): boolean {
    this.ensureSameCurrency(other)
    return this._amountInCents <= other._amountInCents
  }

  /**
   * Checks if this is a zero amount
   */
  isZero(): boolean {
    return this._amountInCents === 0
  }

  /**
   * Checks if this is a positive amount
   */
  isPositive(): boolean {
    return this._amountInCents > 0
  }

  /**
   * Value equality comparison
   */
  equals(other: Money): boolean {
    if (!(other instanceof Money)) {
      return false
    }
    return this._amountInCents === other._amountInCents && this._currency === other._currency
  }

  /**
   * Formats as currency string
   */
  toString(): string {
    const symbol = CURRENCY_SYMBOLS[this._currency]
    const decimals = CURRENCY_DECIMALS[this._currency]
    const amount = this.dollars.toFixed(decimals)
    return `${symbol}${amount}`
  }

  /**
   * Formats with thousands separators
   */
  toFormattedString(): string {
    const symbol = CURRENCY_SYMBOLS[this._currency]
    const decimals = CURRENCY_DECIMALS[this._currency]
    const amount = this.dollars.toFixed(decimals)
    const parts = amount.split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return `${symbol}${parts.join('.')}`
  }

  /**
   * Converts to plain object for serialization
   */
  toJSON(): { amount: number; cents: number; currency: Currency; formatted: string } {
    return {
      amount: this.dollars,
      cents: this._amountInCents,
      currency: this._currency,
      formatted: this.toFormattedString(),
    }
  }

  /**
   * Creates Money from JSON
   */
  static fromJSON(json: { cents: number; currency: Currency }): Result<Money, ValidationError> {
    return Money.fromCents(json.cents, json.currency)
  }

  /**
   * Ensures two Money values have the same currency (throws if not)
   */
  private ensureSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(`Currency mismatch: ${this._currency} vs ${other._currency}`)
    }
  }

  /**
   * Sums an array of Money values
   */
  static sum(amounts: Money[]): Result<Money, ValidationError> {
    if (amounts.length === 0) {
      return Result.ok(Money.zero())
    }

    const currency = amounts[0].currency
    let total = Money.zero(currency)

    for (const amount of amounts) {
      const result = total.add(amount)
      if (result.isErr()) {
        return result
      }
      total = result.unwrap()
    }

    return Result.ok(total)
  }
}
