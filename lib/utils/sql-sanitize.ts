/**
 * SQL Sanitization Utilities
 *
 * Provides functions to safely sanitize user input for SQL queries,
 * particularly for ILIKE pattern matching in Supabase/PostgreSQL.
 */

/**
 * Escapes special characters in SQL LIKE/ILIKE patterns
 * Prevents SQL injection by escaping wildcards and special chars
 *
 * @param input - User-provided search string
 * @param maxLength - Maximum allowed length (default: 100)
 * @returns Sanitized string safe for ILIKE queries
 */
export function sanitizeLikePattern(input: string, maxLength: number = 100): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return input
    .substring(0, maxLength)
    .replace(/[%_\\]/g, '\\$&')  // Escape SQL wildcards and backslash
    .replace(/'/g, "''")         // Escape single quotes
    .trim()
}

/**
 * Validates and sanitizes an array of filter values
 * Removes any values that could be used for injection
 *
 * @param values - Array of filter values
 * @param allowedValues - Optional whitelist of allowed values
 * @returns Sanitized array
 */
export function sanitizeFilterArray(
  values: string[] | undefined,
  allowedValues?: string[]
): string[] {
  if (!Array.isArray(values)) {
    return []
  }

  const sanitized = values
    .filter(v => typeof v === 'string' && v.length > 0 && v.length < 100)
    .map(v => sanitizeLikePattern(v))
    .filter(v => v.length > 0)

  if (allowedValues) {
    return sanitized.filter(v =>
      allowedValues.some(allowed =>
        v.toLowerCase().includes(allowed.toLowerCase())
      )
    )
  }

  return sanitized
}

/**
 * Sanitizes a numeric parameter to prevent injection
 *
 * @param value - Numeric value or string
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param defaultValue - Default if invalid
 * @returns Sanitized number
 */
export function sanitizeNumericParam(
  value: any,
  min: number,
  max: number,
  defaultValue: number
): number {
  const num = typeof value === 'string' ? parseInt(value, 10) : value

  if (isNaN(num) || !isFinite(num)) {
    return defaultValue
  }

  return Math.min(Math.max(num, min), max)
}
