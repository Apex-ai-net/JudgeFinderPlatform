/**
 * Field-level encryption for PII using AES-256-GCM
 * Implements secure encryption/decryption with timing-safe operations
 */

import * as crypto from 'crypto'
import { logger } from '@/lib/utils/logger'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96 bits for GCM
const AUTH_TAG_LENGTH = 16 // 128 bits
const KEY_LENGTH = 32 // 256 bits

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY

  if (!keyHex) {
    const error = 'ENCRYPTION_KEY environment variable is not set'
    logger.error(error, { scope: 'encryption' })
    throw new Error(error)
  }

  // Validate key format
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    const error = 'ENCRYPTION_KEY must be a 64-character hexadecimal string (32 bytes)'
    logger.error(error, { scope: 'encryption' })
    throw new Error(error)
  }

  return Buffer.from(keyHex, 'hex')
}

/**
 * Generate a new encryption key (for initial setup or rotation)
 */
export function generateEncryptionKey(): string {
  const key = crypto.randomBytes(KEY_LENGTH)
  return key.toString('hex')
}

/**
 * Encrypt a string value using AES-256-GCM
 *
 * @param plaintext - The value to encrypt
 * @returns Base64-encoded string containing IV + ciphertext + auth tag
 */
export function encrypt(plaintext: string): string {
  try {
    if (!plaintext) {
      return plaintext
    }

    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(plaintext, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const authTag = cipher.getAuthTag()

    // Combine IV + ciphertext + auth tag
    const combined = Buffer.concat([
      iv,
      Buffer.from(encrypted, 'base64'),
      authTag,
    ])

    return combined.toString('base64')
  } catch (error) {
    logger.error('Encryption failed', { error, scope: 'encryption' })
    throw new Error('Encryption failed')
  }
}

/**
 * Decrypt a value encrypted with encrypt()
 *
 * @param ciphertext - Base64-encoded encrypted value
 * @returns Decrypted plaintext string
 */
export function decrypt(ciphertext: string): string {
  try {
    if (!ciphertext) {
      return ciphertext
    }

    const key = getEncryptionKey()
    const combined = Buffer.from(ciphertext, 'base64')

    // Extract components
    const iv = combined.subarray(0, IV_LENGTH)
    const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH)
    const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH)

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, undefined, 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    logger.error('Decryption failed', { error, scope: 'encryption' })
    throw new Error('Decryption failed')
  }
}

/**
 * Encrypt multiple fields in an object
 *
 * @param data - Object containing fields to encrypt
 * @param fields - Array of field names to encrypt
 * @returns New object with specified fields encrypted
 */
export function encryptFields<T extends Record<string, any>>(
  data: T,
  fields: (keyof T)[]
): T {
  const result = { ...data }

  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encrypt(result[field] as string) as T[keyof T]
    }
  }

  return result
}

/**
 * Decrypt multiple fields in an object
 *
 * @param data - Object containing encrypted fields
 * @param fields - Array of field names to decrypt
 * @returns New object with specified fields decrypted
 */
export function decryptFields<T extends Record<string, any>>(
  data: T,
  fields: (keyof T)[]
): T {
  const result = { ...data }

  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      try {
        result[field] = decrypt(result[field] as string) as T[keyof T]
      } catch (error) {
        logger.error(`Failed to decrypt field: ${String(field)}`, { error, scope: 'encryption' })
        // Leave field as-is if decryption fails
      }
    }
  }

  return result
}

/**
 * Hash a value using HMAC-SHA256 for searching encrypted data
 * This creates a deterministic hash that can be used for lookups
 *
 * @param value - Value to hash
 * @returns Hex-encoded hash
 */
export function hashForSearch(value: string): string {
  try {
    const key = getEncryptionKey()
    const hmac = crypto.createHmac('sha256', key)
    hmac.update(value)
    return hmac.digest('hex')
  } catch (error) {
    logger.error('Hashing failed', { error, scope: 'encryption' })
    throw new Error('Hashing failed')
  }
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * Use this when comparing sensitive values like tokens or hashes
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
export function timingSafeEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf8')
    const bufB = Buffer.from(b, 'utf8')

    // Buffers must be same length for crypto.timingSafeEqual
    if (bufA.length !== bufB.length) {
      // Still perform a comparison to prevent timing leaks
      crypto.timingSafeEqual(
        Buffer.alloc(32),
        Buffer.alloc(32)
      )
      return false
    }

    return crypto.timingSafeEqual(bufA, bufB)
  } catch (error) {
    logger.error('Timing-safe comparison failed', { error, scope: 'encryption' })
    return false
  }
}

/**
 * Validate that encryption is properly configured
 * Should be called on application startup
 */
export function validateEncryptionConfig(): boolean {
  try {
    const key = getEncryptionKey()

    if (key.length !== KEY_LENGTH) {
      logger.error('Encryption key has invalid length', {
        expected: KEY_LENGTH,
        actual: key.length,
        scope: 'encryption',
      })
      return false
    }

    // Test encryption/decryption
    const testValue = 'test-encryption-config'
    const encrypted = encrypt(testValue)
    const decrypted = decrypt(encrypted)

    if (decrypted !== testValue) {
      logger.error('Encryption test failed', { scope: 'encryption' })
      return false
    }

    logger.info('Encryption configuration validated successfully', { scope: 'encryption' })
    return true
  } catch (error) {
    logger.error('Encryption configuration validation failed', { error, scope: 'encryption' })
    return false
  }
}

/**
 * Rotate encryption key by re-encrypting data
 * This should be done carefully with database transactions
 *
 * @param oldKey - Previous encryption key (hex string)
 * @param newKey - New encryption key (hex string)
 * @param encryptedValue - Value encrypted with old key
 * @returns Value re-encrypted with new key
 */
export function rotateEncryption(
  oldKey: string,
  newKey: string,
  encryptedValue: string
): string {
  try {
    // Temporarily override environment to use old key
    const originalKey = process.env.ENCRYPTION_KEY
    process.env.ENCRYPTION_KEY = oldKey

    // Decrypt with old key
    const plaintext = decrypt(encryptedValue)

    // Switch to new key
    process.env.ENCRYPTION_KEY = newKey

    // Encrypt with new key
    const reencrypted = encrypt(plaintext)

    // Restore original key
    process.env.ENCRYPTION_KEY = originalKey

    return reencrypted
  } catch (error) {
    logger.error('Encryption rotation failed', { error, scope: 'encryption' })
    throw new Error('Encryption rotation failed')
  }
}

/**
 * Check if a value appears to be encrypted
 * Useful for migrating plaintext to encrypted storage
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false

  try {
    // Encrypted values are base64 and have minimum length
    const minLength = IV_LENGTH + AUTH_TAG_LENGTH
    const decoded = Buffer.from(value, 'base64')

    return decoded.length >= minLength &&
           value === decoded.toString('base64') // Valid base64
  } catch {
    return false
  }
}

/**
 * Securely wipe a string from memory (best effort)
 * Note: JavaScript doesn't provide true memory wiping, but this helps
 */
export function secureWipe(value: string): void {
  if (typeof value === 'string') {
    // Overwrite the string's internal buffer (best effort in JS)
    for (let i = 0; i < value.length; i++) {
      // This may or may not actually overwrite memory depending on JS engine
      (value as any)[i] = '\0'
    }
  }
}

/**
 * Create a one-way hash of PII for de-identification
 * Use this for analytics where you need to count unique users without storing PII
 */
export function hashPII(pii: string, salt?: string): string {
  try {
    const key = getEncryptionKey()
    const effectiveSalt = salt || key.toString('hex').substring(0, 16)

    return crypto
      .createHash('sha256')
      .update(pii + effectiveSalt)
      .digest('hex')
  } catch (error) {
    logger.error('PII hashing failed', { error, scope: 'encryption' })
    throw new Error('PII hashing failed')
  }
}
