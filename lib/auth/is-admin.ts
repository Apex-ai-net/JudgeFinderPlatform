import { safeAuth, safeCurrentUser } from './safe-auth'
import { ensureCurrentAppUser, fetchCurrentAppUser, type AppUserRecord } from './user-mapping'
import { logger } from '@/lib/utils/logger'

export interface AdminStatus {
  user: AppUserRecord | null
  isAdmin: boolean
  hasMFA: boolean
  requiresMFA: boolean
}

/**
 * Check if user has MFA enabled via Clerk
 */
async function checkMFAStatus(): Promise<boolean> {
  try {
    const user = await safeCurrentUser()

    if (!user) {
      return false
    }

    // Check if user has any two-factor authentication enabled
    // Clerk stores MFA status in twoFactorEnabled field
    return Boolean(user.twoFactorEnabled)
  } catch (error) {
    logger.error('Failed to check MFA status', { error })
    return false
  }
}

/**
 * Determine if MFA should be required based on environment
 */
function shouldRequireMFA(): boolean {
  // Require MFA in production, optional in development
  const isProduction = process.env.NODE_ENV === 'production'
  const mfaEnforcement = process.env.ADMIN_MFA_ENFORCEMENT || 'production'

  if (mfaEnforcement === 'always') {
    return true
  }

  if (mfaEnforcement === 'never') {
    return false
  }

  // Default: require in production only
  return isProduction
}

/**
 * Resolve the admin status for the current authenticated user.
 * Ensures the Supabase mapping exists on first visit.
 * Checks MFA status for security compliance.
 */
export async function resolveAdminStatus(): Promise<AdminStatus> {
  const userRecord = await ensureCurrentAppUser()
  const isAdmin = Boolean(userRecord?.is_admin)
  const hasMFA = await checkMFAStatus()
  const requiresMFA = shouldRequireMFA()

  return {
    user: userRecord,
    isAdmin,
    hasMFA,
    requiresMFA,
  }
}

/**
 * Check if the current user is an administrator.
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const status = await resolveAdminStatus()
    return status.isAdmin
  } catch (error) {
    logger.error('Failed to determine admin status', { error })
    return false
  }
}

/**
 * Ensure the current user is an administrator. Throws if not authenticated or unauthorized.
 * Also enforces MFA requirement in production environments.
 */
export async function requireAdmin(): Promise<void> {
  const { userId } = await safeAuth()

  if (!userId) {
    throw new Error('Authentication required')
  }

  const status = await resolveAdminStatus()

  if (!status.isAdmin) {
    throw new Error('Admin access required')
  }

  // Enforce MFA for admins in production
  if (status.requiresMFA && !status.hasMFA) {
    throw new Error('MFA_REQUIRED')
  }
}

/**
 * Check if admin has MFA enabled (for UI display)
 */
export async function adminHasMFA(): Promise<boolean> {
  try {
    const status = await resolveAdminStatus()
    return status.isAdmin && status.hasMFA
  } catch (error) {
    logger.error('Failed to check admin MFA status', { error })
    return false
  }
}

/**
 * Fetch the admin mapping without triggering an upsert.
 */
export async function getCachedAdminRecord(): Promise<AppUserRecord | null> {
  return fetchCurrentAppUser()
}
