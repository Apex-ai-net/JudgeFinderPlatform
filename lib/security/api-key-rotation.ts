/**
 * API Key Rotation System
 * Implements secure rotation of API keys and secrets
 */

import * as crypto from 'crypto'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { logger } from '@/lib/utils/logger'
import { logAPIKeyRotation } from '@/lib/audit/logger'

export interface APIKey {
  name: string
  value: string
  rotatedAt: string
  expiresAt?: string
}

export interface RotationResult {
  success: boolean
  key: APIKey
  error?: string
}

/**
 * Generate a cryptographically secure API key
 */
export function generateAPIKey(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url')
}

/**
 * Generate a secure secret key (hex format)
 */
export function generateSecretKey(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex')
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID()
}

/**
 * Rotate an API key and log the operation
 */
export async function rotateAPIKey(
  keyName: string,
  length: number = 32,
  userId: string = 'system'
): Promise<RotationResult> {
  try {
    const newKey = generateAPIKey(length)
    const rotatedAt = new Date().toISOString()

    const apiKey: APIKey = {
      name: keyName,
      value: newKey,
      rotatedAt,
      expiresAt: undefined,
    }

    // Log rotation to audit log
    await logAPIKeyRotation(userId, keyName, true)

    logger.info('API key rotated successfully', {
      keyName,
      rotatedAt,
      scope: 'security',
    })

    return {
      success: true,
      key: apiKey,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await logAPIKeyRotation(userId, keyName, false, errorMessage)

    logger.error('API key rotation failed', {
      keyName,
      error,
      scope: 'security',
    })

    return {
      success: false,
      key: {
        name: keyName,
        value: '',
        rotatedAt: new Date().toISOString(),
      },
      error: errorMessage,
    }
  }
}

/**
 * Rotate encryption key
 */
export async function rotateEncryptionKey(
  userId: string = 'system'
): Promise<RotationResult> {
  try {
    const newKey = generateSecretKey(32)
    const rotatedAt = new Date().toISOString()

    const apiKey: APIKey = {
      name: 'ENCRYPTION_KEY',
      value: newKey,
      rotatedAt,
    }

    await logAPIKeyRotation(userId, 'ENCRYPTION_KEY', true)

    logger.info('Encryption key rotated successfully', {
      rotatedAt,
      scope: 'security',
    })

    return {
      success: true,
      key: apiKey,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await logAPIKeyRotation(userId, 'ENCRYPTION_KEY', false, errorMessage)

    logger.error('Encryption key rotation failed', {
      error,
      scope: 'security',
    })

    return {
      success: false,
      key: {
        name: 'ENCRYPTION_KEY',
        value: '',
        rotatedAt: new Date().toISOString(),
      },
      error: errorMessage,
    }
  }
}

/**
 * Rotate JWT signing secret
 */
export async function rotateJWTSecret(
  userId: string = 'system'
): Promise<RotationResult> {
  try {
    const newSecret = generateSecretKey(64)
    const rotatedAt = new Date().toISOString()

    const apiKey: APIKey = {
      name: 'JWT_SECRET',
      value: newSecret,
      rotatedAt,
    }

    await logAPIKeyRotation(userId, 'JWT_SECRET', true)

    logger.info('JWT secret rotated successfully', {
      rotatedAt,
      scope: 'security',
    })

    return {
      success: true,
      key: apiKey,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await logAPIKeyRotation(userId, 'JWT_SECRET', false, errorMessage)

    logger.error('JWT secret rotation failed', {
      error,
      scope: 'security',
    })

    return {
      success: false,
      key: {
        name: 'JWT_SECRET',
        value: '',
        rotatedAt: new Date().toISOString(),
      },
      error: errorMessage,
    }
  }
}

/**
 * Save rotation audit to file
 */
export function saveRotationAudit(
  rotationResults: RotationResult[],
  auditFilePath?: string
): void {
  const defaultPath = join(process.cwd(), 'logs', 'key-rotation-audit.json')
  const filePath = auditFilePath || defaultPath

  try {
    let existingAudit: any[] = []

    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8')
      existingAudit = JSON.parse(content)
    }

    const auditEntry = {
      timestamp: new Date().toISOString(),
      rotations: rotationResults.map((r) => ({
        keyName: r.key.name,
        success: r.success,
        rotatedAt: r.key.rotatedAt,
        error: r.error,
      })),
    }

    existingAudit.push(auditEntry)

    writeFileSync(filePath, JSON.stringify(existingAudit, null, 2), 'utf-8')

    logger.info('Rotation audit saved', {
      filePath,
      scope: 'security',
    })
  } catch (error) {
    logger.error('Failed to save rotation audit', {
      error,
      filePath,
      scope: 'security',
    })
  }
}

/**
 * Validate API key format
 */
export function validateAPIKeyFormat(key: string, minLength: number = 32): boolean {
  if (!key || typeof key !== 'string') {
    return false
  }

  // Check minimum length
  if (key.length < minLength) {
    return false
  }

  // Check if it's valid base64url or hex
  const base64urlPattern = /^[A-Za-z0-9_-]+$/
  const hexPattern = /^[0-9a-fA-F]+$/

  return base64urlPattern.test(key) || hexPattern.test(key)
}

/**
 * Calculate key age in days
 */
export function calculateKeyAge(rotatedAt: string): number {
  const rotationDate = new Date(rotatedAt)
  const now = new Date()
  const ageMs = now.getTime() - rotationDate.getTime()
  return Math.floor(ageMs / (1000 * 60 * 60 * 24))
}

/**
 * Check if key needs rotation based on policy
 */
export function needsRotation(rotatedAt: string, maxAgeDays: number = 90): boolean {
  const age = calculateKeyAge(rotatedAt)
  return age >= maxAgeDays
}

/**
 * Rotate multiple keys in batch
 */
export async function rotateAllKeys(
  userId: string = 'system'
): Promise<{ results: RotationResult[]; allSuccessful: boolean }> {
  logger.info('Starting batch key rotation', { scope: 'security' })

  const results: RotationResult[] = []

  // Rotate each key type
  const encryptionResult = await rotateEncryptionKey(userId)
  results.push(encryptionResult)

  const jwtResult = await rotateJWTSecret(userId)
  results.push(jwtResult)

  // Add other keys as needed
  const apiKeyResult = await rotateAPIKey('INTERNAL_API_KEY', 32, userId)
  results.push(apiKeyResult)

  const allSuccessful = results.every((r) => r.success)

  // Save audit
  saveRotationAudit(results)

  logger.info('Batch key rotation completed', {
    total: results.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    scope: 'security',
  })

  return { results, allSuccessful }
}

/**
 * Format rotation result for display
 */
export function formatRotationResult(result: RotationResult): string {
  if (result.success) {
    return `✓ ${result.key.name}: Successfully rotated at ${result.key.rotatedAt}`
  } else {
    return `✗ ${result.key.name}: Failed - ${result.error}`
  }
}

/**
 * Generate environment variable update commands
 */
export function generateEnvUpdateCommands(results: RotationResult[]): string[] {
  const commands: string[] = []

  for (const result of results) {
    if (result.success && result.key.value) {
      // For different platforms
      commands.push(
        `# ${result.key.name}`,
        `export ${result.key.name}="${result.key.value}"`,
        `# Or for .env file:`,
        `${result.key.name}="${result.key.value}"`,
        ''
      )
    }
  }

  return commands
}

/**
 * Estimate time until next rotation
 */
export function getNextRotationDate(rotatedAt: string, intervalDays: number = 90): Date {
  const rotationDate = new Date(rotatedAt)
  const nextRotation = new Date(rotationDate)
  nextRotation.setDate(nextRotation.getDate() + intervalDays)
  return nextRotation
}

/**
 * Create rotation reminder
 */
export function createRotationReminder(keyName: string, rotatedAt: string): {
  keyName: string
  rotatedAt: string
  nextRotation: string
  daysUntilRotation: number
  needsRotation: boolean
} {
  const nextRotation = getNextRotationDate(rotatedAt, 90)
  const now = new Date()
  const daysUntilRotation = Math.ceil((nextRotation.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return {
    keyName,
    rotatedAt,
    nextRotation: nextRotation.toISOString(),
    daysUntilRotation,
    needsRotation: daysUntilRotation <= 0,
  }
}
