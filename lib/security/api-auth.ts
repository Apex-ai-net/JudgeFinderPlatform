import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/is-admin'
import * as crypto from 'crypto'

type AllowedKeyName = 'SYNC_API_KEY' | 'CRON_SECRET'

function getEnvKey(name: AllowedKeyName): string | undefined {
  const value = process.env[name]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

/**
 * Extracts API key from request headers only.
 * 
 * SECURITY: Query parameter support has been removed. API keys should NEVER be passed
 * in query strings as they are:
 * - Logged in web server access logs
 * - Visible in browser history
 * - Exposed in referrer headers
 * - Cached by browsers and proxies
 * 
 * Only x-api-key header authentication is supported.
 */
export function extractApiKey(req: NextRequest): string | null {
  const headerKey = req.headers.get('x-api-key')?.trim()
  if (headerKey) return headerKey
  
  // Query parameter support removed for security
  // API keys must only be sent in headers
  
  return null
}

/**
 * Validates API key using constant-time comparison to prevent timing attacks.
 * 
 * SECURITY: Uses crypto.timingSafeEqual to ensure comparison time is independent
 * of key content. This prevents attackers from using response time variations to
 * gradually discover valid API keys character by character.
 * 
 * Keys are padded to the same length before comparison to prevent length-based
 * timing attacks.
 * 
 * @param key - API key to validate
 * @param allow - List of allowed environment variable names to check against
 * @returns true if key matches any allowed key, false otherwise
 */
export function isValidApiKey(key: string, allow: AllowedKeyName[] = ['SYNC_API_KEY', 'CRON_SECRET']): boolean {
  const allowedValues = allow
    .map(getEnvKey)
    .filter((v): v is string => Boolean(v))
  
  const trimmedKey = key.trim()
  
  // Use timing-safe comparison to prevent timing attacks
  return allowedValues.some(allowedKey => {
    if (!allowedKey) return false
    
    try {
      // Pad both keys to same length to prevent length-based timing attacks
      const maxLength = Math.max(trimmedKey.length, allowedKey.length)
      const key1 = Buffer.from(trimmedKey.padEnd(maxLength))
      const key2 = Buffer.from(allowedKey.padEnd(maxLength))
      
      // Constant-time comparison
      return crypto.timingSafeEqual(key1, key2)
    } catch {
      // timingSafeEqual throws if buffers have different lengths
      // This should not happen due to padding, but handle gracefully
      return false
    }
  })
}

export function requireApiKey(
  req: NextRequest,
  options: { allow?: AllowedKeyName[]; respond?: boolean } = {}
): { ok: true } | NextResponse {
  const { allow = ['SYNC_API_KEY', 'CRON_SECRET'], respond = true } = options
  const provided = extractApiKey(req)
  if (!provided || !isValidApiKey(provided, allow)) {
    if (!respond) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return { ok: true }
}

export async function requireAdminApiAccess(
  req: NextRequest,
  allow: AllowedKeyName[] = ['SYNC_API_KEY', 'CRON_SECRET']
): Promise<void> {
  const providedKey = extractApiKey(req)
  if (providedKey && isValidApiKey(providedKey, allow)) {
    return
  }

  const { userId } = await auth()
  if (!userId || !(await isAdmin())) {
    throw new Error('Forbidden')
  }
}

/**
 * Validates API key with timing-safe comparison for public API access.
 * 
 * SECURITY: Uses constant-time comparison to prevent timing attacks.
 * Query parameter support has been removed as a security risk.
 * 
 * @param headers - Request headers
 * @param url - Request URL (query params no longer supported)
 * @returns Object with ok status and optional reason for failure
 */
export function requireApiKeyIfEnabled(headers: Headers, url?: string): { ok: boolean; reason?: string } {
  const requireKey = String(process.env.REQUIRE_API_KEY_FOR_V1 || '').toLowerCase() === 'true'
  if (!requireKey) return { ok: true }

  const headerKey = headers.get('x-api-key')?.trim()
  
  // Query parameter support removed for security
  const provided = headerKey
  
  if (!provided) return { ok: false, reason: 'missing_api_key' }

  const allowedKeys = buildAllowedKeySet()
  if (allowedKeys.size === 0) {
    return { ok: false, reason: 'no_keys_configured' }
  }

  // Use timing-safe comparison
  const isAllowed = timingSafeSetCheck(provided, allowedKeys)
  return { ok: isAllowed, reason: isAllowed ? undefined : 'invalid_api_key' }
}

/**
 * Performs timing-safe comparison against a set of allowed keys.
 * 
 * SECURITY: Ensures all comparisons take constant time regardless of
 * whether a match is found or how many keys are in the set.
 * 
 * @param provided - API key to check
 * @param allowedKeys - Set of valid API keys
 * @returns true if key is valid, false otherwise
 */
function timingSafeSetCheck(provided: string, allowedKeys: Set<string>): boolean {
  let isValid = false
  const keysArray = Array.from(allowedKeys)
  
  // Check against all keys to maintain constant time
  // We can't short-circuit even after finding a match
  for (const allowedKey of keysArray) {
    try {
      const maxLength = Math.max(provided.length, allowedKey.length)
      const key1 = Buffer.from(provided.padEnd(maxLength))
      const key2 = Buffer.from(allowedKey.padEnd(maxLength))
      
      if (crypto.timingSafeEqual(key1, key2)) {
        isValid = true
        // Don't break - continue checking to maintain constant time
      }
    } catch {
      // Continue checking other keys
    }
  }
  
  return isValid
}

function buildAllowedKeySet(): Set<string> {
  const single = process.env.PUBLIC_API_KEY?.trim()
  const csvKeys = (process.env.PUBLIC_API_KEYS || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  return new Set([...(single ? [single] : []), ...csvKeys])
}
