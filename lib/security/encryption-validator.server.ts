/**
 * Server-side encryption validation
 * This file is separate from encryption.ts to avoid build-time crypto module issues
 *
 * NOTE: This module should only be imported in server-side contexts
 */

import { validateEncryptionConfig } from './encryption'

/**
 * Validates encryption configuration with environment-specific error handling
 * @throws Error in production if validation fails
 */
export async function validateEncryptionSetup(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production'
  const isDevelopment = process.env.NODE_ENV === 'development'

  try {
    const isValid = validateEncryptionConfig()

    if (!isValid) {
      const errorMessage = 'Encryption configuration validation failed'

      if (isProduction) {
        // FAIL FAST in production
        console.error('\n' + '='.repeat(80))
        console.error('CRITICAL SECURITY ERROR: Encryption not properly configured')
        console.error('='.repeat(80))
        console.error('\nEncryption validation failed. This could indicate:')
        console.error('  ❌ Missing ENCRYPTION_KEY environment variable')
        console.error('  ❌ Invalid ENCRYPTION_KEY format (must be 64-char hex string)')
        console.error('  ❌ ENCRYPTION_KEY not 32 bytes (256 bits)')
        console.error('  ❌ Encrypt/decrypt test failed')
        console.error('\nProduction deployments MUST have valid encryption configured.')
        console.error('Without proper encryption, PII data cannot be securely stored.')
        console.error('\nGenerate a new key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
        console.error('='.repeat(80) + '\n')

        throw new Error('CRITICAL: Encryption not configured for production deployment')
      }

      if (isDevelopment) {
        // WARN in development
        console.warn('\n' + '⚠'.repeat(40))
        console.warn('WARNING: Encryption not properly configured')
        console.warn('⚠'.repeat(40))
        console.warn('\n' + errorMessage)
        console.warn('\nThis is acceptable for local development, but encryption features will not work.')
        console.warn('To enable encryption, set ENCRYPTION_KEY in your .env.local file.')
        console.warn('Generate a key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
        console.warn('⚠'.repeat(40) + '\n')
      }
    } else {
      console.log('[instrumentation] Encryption configuration validated successfully')
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown encryption validation error'

    if (isProduction) {
      // FAIL FAST in production
      console.error('\n' + '='.repeat(80))
      console.error('CRITICAL SECURITY ERROR: Encryption validation error')
      console.error('='.repeat(80))
      console.error('\nError:', errorMessage)
      console.error('\nProduction deployments MUST have valid encryption configured.')
      console.error('='.repeat(80) + '\n')

      throw new Error(`CRITICAL: Encryption validation failed - ${errorMessage}`)
    }

    if (isDevelopment) {
      // WARN in development
      console.warn('\n' + '⚠'.repeat(40))
      console.warn('WARNING: Encryption validation error')
      console.warn('⚠'.repeat(40))
      console.warn('\nError:', errorMessage)
      console.warn('\nThis is acceptable for local development, but encryption features will not work.')
      console.warn('⚠'.repeat(40) + '\n')
    }
  }
}
