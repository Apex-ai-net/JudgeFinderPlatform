/**
 * Service Account Supabase Client
 *
 * This module provides a secure, authenticated Supabase client for backend operations
 * that respects Row Level Security (RLS) policies instead of bypassing them.
 *
 * Key Differences from Service Role Client:
 * - Uses authenticated user context (service account)
 * - Respects RLS policies (doesn't bypass security)
 * - Suitable for most backend operations
 * - Can be audited through service_account_audit table
 *
 * When to Use:
 * - Backend API routes that need authenticated access
 * - Cron jobs and scheduled tasks
 * - Internal data processing that should respect security
 * - Operations that need audit logging
 *
 * When to Use Service Role Instead:
 * - Emergency admin operations
 * - Database migrations
 * - Operations that explicitly need to bypass RLS
 * - System maintenance tasks
 *
 * @see supabase/migrations/20251009_001_service_account_rbac.sql
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SignJWT } from 'jose'
import { logger } from '@/lib/utils/logger'

// Service account user ID (created in migration 20251009_001)
const SERVICE_ACCOUNT_USER_ID = '00000000-0000-0000-0000-000000000001'
const SERVICE_ACCOUNT_EMAIL = 'service-account@judgefinder.internal'

/**
 * Configuration for service account client
 */
interface ServiceAccountConfig {
  supabaseUrl?: string
  supabaseAnonKey?: string
  jwtSecret?: string
  encryptionKey?: string
}

/**
 * Service account JWT claims
 */
interface ServiceAccountClaims {
  sub: string // User ID
  email: string
  role: string
  aud: string
  iss: string
  iat: number
  exp: number
  app_metadata: {
    provider: string
    service_account: boolean
  }
  user_metadata: {
    name: string
    service_account: boolean
  }
  [key: string]: any // Allow additional claims
}

/**
 * Generates a JWT token for the service account
 *
 * This JWT is signed with the Supabase JWT secret and includes
 * the service account user ID and metadata.
 *
 * @param jwtSecret - The Supabase JWT secret
 * @returns Signed JWT token
 */
async function generateServiceAccountJWT(jwtSecret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const expiresIn = 60 * 60 * 24 // 24 hours

  const claims: ServiceAccountClaims = {
    sub: SERVICE_ACCOUNT_USER_ID,
    email: SERVICE_ACCOUNT_EMAIL,
    role: 'authenticated',
    aud: 'authenticated',
    iss: 'https://judgefinder.io',
    iat: now,
    exp: now + expiresIn,
    app_metadata: {
      provider: 'system',
      service_account: true,
    },
    user_metadata: {
      name: 'JudgeFinder Backend Service',
      service_account: true,
    },
  }

  // Convert JWT secret to Uint8Array
  const secretKey = new TextEncoder().encode(jwtSecret)

  // Sign the JWT
  const jwt = await new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresIn)
    .sign(secretKey)

  return jwt
}

/**
 * Creates a Supabase client authenticated as the backend service account
 *
 * This client:
 * - Uses authenticated user context (not service_role)
 * - Respects all RLS policies
 * - Can be tracked in service_account_audit table
 * - Has admin privileges through is_service_account() checks
 *
 * @param config - Optional configuration overrides
 * @returns Authenticated Supabase client
 * @throws Error if required environment variables are missing
 *
 * @example
 * ```typescript
 * import { createServiceAccountClient } from '@/lib/supabase/service-account'
 *
 * const supabase = await createServiceAccountClient()
 *
 * // This query respects RLS but has admin access
 * const { data, error } = await supabase
 *   .from('sync_queue')
 *   .select('*')
 *   .limit(10)
 * ```
 */
export async function createServiceAccountClient(
  config?: ServiceAccountConfig
): Promise<SupabaseClient> {
  // Get configuration from environment or config
  const supabaseUrl = config?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = config?.supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const jwtSecret = config?.jwtSecret || process.env.SUPABASE_JWT_SECRET
  const encryptionKey = config?.encryptionKey || process.env.ENCRYPTION_KEY

  // Validate required configuration
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for service account client')
  }

  if (!supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required for service account client')
  }

  if (!jwtSecret) {
    throw new Error(
      'SUPABASE_JWT_SECRET is required for service account client. ' +
        'Find it in your Supabase project settings under API > JWT Secret'
    )
  }

  if (!encryptionKey && process.env.NODE_ENV === 'production') {
    logger.warn('ENCRYPTION_KEY not set. Service account operations may fail in production.')
  }

  try {
    // Generate JWT for service account
    const serviceAccountJWT = await generateServiceAccountJWT(jwtSecret)

    // Create Supabase client with service account JWT
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${serviceAccountJWT}`,
        },
      },
    })

    logger.info('Created service account Supabase client', {
      context: 'service_account_client',
      service_account_id: SERVICE_ACCOUNT_USER_ID,
    })

    return client
  } catch (error) {
    logger.error('Failed to create service account client', {
      context: 'service_account_client',
      error,
    })
    throw new Error(
      `Failed to create service account client: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Logs an action to the service account audit table
 *
 * @param client - Service account Supabase client
 * @param action - The action being performed
 * @param resourceType - Type of resource being accessed
 * @param resourceId - ID of the resource
 * @param metadata - Additional metadata about the action
 * @param success - Whether the action succeeded
 * @param errorMessage - Error message if action failed
 *
 * @example
 * ```typescript
 * const client = await createServiceAccountClient()
 *
 * await logServiceAccountAction(
 *   client,
 *   'sync_judges',
 *   'judges',
 *   null,
 *   { count: 150, source: 'courtlistener' },
 *   true
 * )
 * ```
 */
export async function logServiceAccountAction(
  client: SupabaseClient,
  action: string,
  resourceType?: string,
  resourceId?: string,
  metadata?: Record<string, any>,
  success: boolean = true,
  errorMessage?: string
): Promise<void> {
  try {
    const { error } = await client.rpc('log_service_account_activity', {
      p_action: action,
      p_resource_type: resourceType || null,
      p_resource_id: resourceId || null,
      p_metadata: metadata || {},
      p_success: success,
      p_error_message: errorMessage || null,
    })

    if (error) {
      logger.error('Failed to log service account action', {
        context: 'service_account_audit',
        action,
        error,
      })
    }
  } catch (error) {
    logger.error('Exception while logging service account action', {
      context: 'service_account_audit',
      action,
      error,
    })
  }
}

/**
 * Wrapper for service account operations with automatic audit logging
 *
 * @param action - Name of the action being performed
 * @param operation - The operation to perform
 * @param resourceType - Optional resource type for audit log
 * @param resourceId - Optional resource ID for audit log
 * @param metadata - Optional metadata for audit log
 * @returns Result of the operation
 *
 * @example
 * ```typescript
 * const result = await withServiceAccount(
 *   'sync_judge_data',
 *   async (client) => {
 *     const { data, error } = await client
 *       .from('judges')
 *       .upsert(judgeData)
 *
 *     if (error) throw error
 *     return data
 *   },
 *   'judges',
 *   null,
 *   { source: 'courtlistener', count: 150 }
 * )
 * ```
 */
export async function withServiceAccount<T>(
  action: string,
  operation: (client: SupabaseClient) => Promise<T>,
  resourceType?: string,
  resourceId?: string,
  metadata?: Record<string, any>
): Promise<T> {
  const client = await createServiceAccountClient()

  try {
    const result = await operation(client)

    // Log successful operation
    await logServiceAccountAction(client, action, resourceType, resourceId, metadata, true)

    return result
  } catch (error) {
    // Log failed operation
    await logServiceAccountAction(
      client,
      action,
      resourceType,
      resourceId,
      metadata,
      false,
      error instanceof Error ? error.message : 'Unknown error'
    )

    throw error
  }
}

/**
 * Type guard to check if an error is from a service account client
 */
export function isServiceAccountError(error: any): boolean {
  return (
    error?.message?.includes('service account') || error?.message?.includes('is_service_account')
  )
}

/**
 * Gets the service account user ID
 * Useful for queries that need to filter by service account
 */
export function getServiceAccountUserId(): string {
  return SERVICE_ACCOUNT_USER_ID
}

/**
 * Checks if the current environment is configured for service account usage
 */
export function isServiceAccountConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_JWT_SECRET
  )
}

/**
 * Validates service account configuration and logs warnings
 */
export function validateServiceAccountConfig(): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required')
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
  }

  if (!process.env.SUPABASE_JWT_SECRET) {
    errors.push(
      'SUPABASE_JWT_SECRET is required. Find it in Supabase project settings under API > JWT Secret'
    )
  }

  if (!process.env.ENCRYPTION_KEY) {
    warnings.push('ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32')
  }

  if (process.env.NODE_ENV === 'production' && !process.env.ENCRYPTION_KEY) {
    errors.push('ENCRYPTION_KEY is required in production')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
