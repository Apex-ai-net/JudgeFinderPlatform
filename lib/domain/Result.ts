/**
 * Result Monad for Railway-Oriented Programming
 *
 * Provides a functional approach to error handling without exceptions.
 * Eliminates the need for try-catch blocks and makes error paths explicit.
 *
 * @example
 * const result = validateBarNumber('CA-123456')
 * if (result.isOk()) {
 *   const barNumber = result.unwrap()
 * } else {
 *   const error = result.error()
 * }
 *
 * @example Chaining operations
 * const result = validateBarNumber('CA-123456')
 *   .map(barNumber => barNumber.toUpperCase())
 *   .flatMap(normalizedBarNumber => lookupAttorney(normalizedBarNumber))
 */

export class Result<T, E = Error> {
  private constructor(
    private readonly _value: T | null,
    private readonly _error: E | null,
    private readonly _isOk: boolean
  ) {}

  /**
   * Creates a successful Result containing a value
   */
  static ok<T, E = Error>(value: T): Result<T, E> {
    return new Result<T, E>(value, null, true)
  }

  /**
   * Creates a failed Result containing an error
   */
  static err<T, E = Error>(error: E): Result<T, E> {
    return new Result<T, E>(null, error, false)
  }

  /**
   * Checks if Result represents a success
   */
  isOk(): this is Result<T, never> {
    return this._isOk
  }

  /**
   * Checks if Result represents a failure
   */
  isErr(): this is Result<never, E> {
    return !this._isOk
  }

  /**
   * Unwraps the value, throwing if Result is an error
   * Use with caution - prefer pattern matching with isOk/isErr
   */
  unwrap(): T {
    if (!this._isOk) {
      throw new Error('Called unwrap() on an Err Result')
    }
    return this._value as T
  }

  /**
   * Unwraps the value, returning a default if Result is an error
   */
  unwrapOr(defaultValue: T): T {
    return this._isOk ? (this._value as T) : defaultValue
  }

  /**
   * Returns the error value, throwing if Result is Ok
   */
  error(): E {
    if (this._isOk) {
      throw new Error('Called error() on an Ok Result')
    }
    return this._error as E
  }

  /**
   * Maps the Ok value through a transformation function
   * Leaves Err values unchanged
   */
  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this._isOk) {
      return Result.ok(fn(this._value as T))
    }
    return Result.err(this._error as E)
  }

  /**
   * Maps the Err value through a transformation function
   * Leaves Ok values unchanged
   */
  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    if (this._isOk) {
      return Result.ok(this._value as T)
    }
    return Result.err(fn(this._error as E))
  }

  /**
   * Flat maps (binds) the Ok value through a function that returns a Result
   * Enables chaining of operations that can fail
   */
  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this._isOk) {
      return fn(this._value as T)
    }
    return Result.err(this._error as E)
  }

  /**
   * Matches on the Result, executing the appropriate callback
   * Ensures both success and failure paths are handled
   */
  match<U>(patterns: { ok: (value: T) => U; err: (error: E) => U }): U {
    if (this._isOk) {
      return patterns.ok(this._value as T)
    }
    return patterns.err(this._error as E)
  }

  /**
   * Executes a side effect if Result is Ok
   * Returns the original Result for chaining
   */
  tap(fn: (value: T) => void): Result<T, E> {
    if (this._isOk) {
      fn(this._value as T)
    }
    return this
  }

  /**
   * Executes a side effect if Result is Err
   * Returns the original Result for chaining
   */
  tapErr(fn: (error: E) => void): Result<T, E> {
    if (!this._isOk) {
      fn(this._error as E)
    }
    return this
  }

  /**
   * Converts Result to a Promise
   * Useful for integrating with async code
   */
  toPromise(): Promise<T> {
    return this._isOk ? Promise.resolve(this._value as T) : Promise.reject(this._error)
  }

  /**
   * Creates a Result from a Promise
   */
  static async fromPromise<T, E = Error>(
    promise: Promise<T>,
    mapError?: (error: unknown) => E
  ): Promise<Result<T, E>> {
    try {
      const value = await promise
      return Result.ok(value)
    } catch (error) {
      const mappedError = mapError ? mapError(error) : (error as E)
      return Result.err(mappedError)
    }
  }

  /**
   * Combines multiple Results into a single Result of an array
   * Fails if any Result is an error
   */
  static combine<T, E>(results: Result<T, E>[]): Result<T[], E> {
    const values: T[] = []
    for (const result of results) {
      if (result.isErr()) {
        return Result.err(result.error())
      }
      values.push(result.unwrap())
    }
    return Result.ok(values)
  }

  /**
   * Wraps a function that may throw into a Result
   */
  static try<T, E = Error>(fn: () => T, mapError?: (error: unknown) => E): Result<T, E> {
    try {
      return Result.ok(fn())
    } catch (error) {
      const mappedError = mapError ? mapError(error) : (error as E)
      return Result.err(mappedError)
    }
  }
}

/**
 * Domain Error Types
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'DomainError'
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', metadata)
    this.name = 'ValidationError'
  }
}

export class BusinessRuleViolationError extends DomainError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, 'BUSINESS_RULE_VIOLATION', metadata)
    this.name = 'BusinessRuleViolationError'
  }
}

export class InvariantViolationError extends DomainError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, 'INVARIANT_VIOLATION', metadata)
    this.name = 'InvariantViolationError'
  }
}

/**
 * Type aliases for convenience
 */
export type Ok<T> = Result<T, never>
export type Err<E> = Result<never, E>
