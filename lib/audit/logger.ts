/**
 * Audit logging system for PII access, security events, and compliance
 * Implements comprehensive audit trails for regulatory compliance
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { logger as appLogger } from '@/lib/utils/logger'
import type { NextRequest } from 'next/server'

export type AuditActionType =
  | 'pii_access'
  | 'pii_modification'
  | 'admin_action'
  | 'authentication'
  | 'rate_limit_violation'
  | 'csp_violation'
  | 'encryption_operation'
  | 'api_key_rotation'
  | 'mfa_event'
  | 'security_event'

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface AuditLogEntry {
  userId: string
  clerkUserId?: string
  actionType: AuditActionType
  resourceType: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  requestPath?: string
  requestMethod?: string
  eventData?: Record<string, any>
  severity?: AuditSeverity
  success?: boolean
  errorMessage?: string
}

export interface AuditContext {
  userId: string
  clerkUserId?: string
  ipAddress?: string
  userAgent?: string
  requestPath?: string
  requestMethod?: string
}

/**
 * Extract audit context from Next.js request
 */
export function extractAuditContext(
  request: NextRequest,
  userId: string,
  clerkUserId?: string
): AuditContext {
  const ipAddress = getClientIp(request)
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const requestPath = request.nextUrl.pathname
  const requestMethod = request.method

  return {
    userId,
    clerkUserId,
    ipAddress,
    userAgent,
    requestPath,
    requestMethod,
  }
}

/**
 * Get client IP address from request headers
 */
function getClientIp(request: NextRequest): string {
  const headers = request.headers
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip')?.trim() ||
    headers.get('cf-connecting-ip')?.trim() ||
    'unknown'
  )
}

/**
 * Write audit log entry to database
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = await createServiceRoleClient()

    // Sanitize event data to prevent logging sensitive information in plaintext
    const sanitizedEventData = sanitizeEventData(entry.eventData)

    const { error } = await supabase.from('audit_logs').insert({
      user_id: entry.userId,
      clerk_user_id: entry.clerkUserId,
      action_type: entry.actionType,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
      request_path: entry.requestPath,
      request_method: entry.requestMethod,
      event_data: sanitizedEventData,
      severity: entry.severity || 'info',
      success: entry.success !== false,
      error_message: entry.errorMessage,
    })

    if (error) {
      appLogger.error('Failed to write audit log', { error, entry })
    }

    // Also log to application logger for immediate visibility
    const logLevel = entry.severity === 'critical' || entry.severity === 'error' ? 'error' : 'info'
    appLogger[logLevel]('Audit log entry', {
      actionType: entry.actionType,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      severity: entry.severity,
      userId: entry.userId,
    })
  } catch (error) {
    appLogger.error('Audit logging system error', { error })
  }
}

/**
 * Sanitize event data to prevent logging sensitive information
 */
function sanitizeEventData(data?: Record<string, any>): Record<string, any> | undefined {
  if (!data) return undefined

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'api_key',
    'credit_card',
    'ssn',
    'social_security',
  ]

  const sanitized = { ...data }

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase()
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]'
    }
  }

  return sanitized
}

/**
 * Log PII access event
 */
export async function logPIIAccess(
  context: AuditContext,
  resourceType: string,
  resourceId: string,
  fields: string[]
): Promise<void> {
  await writeAuditLog({
    ...context,
    actionType: 'pii_access',
    resourceType,
    resourceId,
    eventData: {
      fields_accessed: fields,
      access_reason: 'application_operation',
    },
    severity: 'info',
  })
}

/**
 * Log PII modification event
 */
export async function logPIIModification(
  context: AuditContext,
  resourceType: string,
  resourceId: string,
  fields: string[],
  operation: 'create' | 'update' | 'delete'
): Promise<void> {
  await writeAuditLog({
    ...context,
    actionType: 'pii_modification',
    resourceType,
    resourceId,
    eventData: {
      fields_modified: fields,
      operation,
    },
    severity: 'warning',
  })
}

/**
 * Log admin action
 */
export async function logAdminAction(
  context: AuditContext,
  action: string,
  targetResource?: { type: string; id: string },
  metadata?: Record<string, any>
): Promise<void> {
  await writeAuditLog({
    ...context,
    actionType: 'admin_action',
    resourceType: targetResource?.type || 'system',
    resourceId: targetResource?.id,
    eventData: {
      action,
      ...metadata,
    },
    severity: 'warning',
  })
}

/**
 * Log authentication event
 */
export async function logAuthenticationEvent(
  context: Partial<AuditContext>,
  eventType: 'login' | 'logout' | 'mfa_enabled' | 'mfa_disabled' | 'failed_login',
  success: boolean,
  errorMessage?: string
): Promise<void> {
  await writeAuditLog({
    userId: context.userId || 'anonymous',
    clerkUserId: context.clerkUserId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestPath: context.requestPath,
    requestMethod: context.requestMethod,
    actionType: 'authentication',
    resourceType: 'user_session',
    eventData: {
      event_type: eventType,
    },
    severity: success ? 'info' : 'warning',
    success,
    errorMessage,
  })
}

/**
 * Log rate limit violation
 */
export async function logRateLimitViolation(
  ipAddress: string,
  userAgent: string,
  requestPath: string,
  requestMethod: string,
  rateLimitKey: string
): Promise<void> {
  await writeAuditLog({
    userId: 'anonymous',
    ipAddress,
    userAgent,
    requestPath,
    requestMethod,
    actionType: 'rate_limit_violation',
    resourceType: 'rate_limit',
    eventData: {
      rate_limit_key: rateLimitKey,
    },
    severity: 'warning',
  })
}

/**
 * Log CSP violation
 */
export async function logCSPViolation(
  violationReport: Record<string, unknown>,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  await writeAuditLog({
    userId: 'anonymous',
    ipAddress,
    userAgent,
    actionType: 'csp_violation',
    resourceType: 'content_security_policy',
    eventData: {
      violated_directive: violationReport['violated-directive'],
      blocked_uri: violationReport['blocked-uri'],
      document_uri: violationReport['document-uri'],
      source_file: violationReport['source-file'],
      line_number: violationReport['line-number'],
    },
    severity: 'warning',
  })
}

/**
 * Log encryption operation
 */
export async function logEncryptionOperation(
  context: AuditContext,
  operation: 'encrypt' | 'decrypt',
  resourceType: string,
  resourceId: string,
  fields: string[]
): Promise<void> {
  await writeAuditLog({
    ...context,
    actionType: 'encryption_operation',
    resourceType,
    resourceId,
    eventData: {
      operation,
      fields_affected: fields,
    },
    severity: 'info',
  })
}

/**
 * Log API key rotation
 */
export async function logAPIKeyRotation(
  userId: string,
  keyType: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  await writeAuditLog({
    userId,
    actionType: 'api_key_rotation',
    resourceType: 'api_key',
    eventData: {
      key_type: keyType,
      rotation_timestamp: new Date().toISOString(),
    },
    severity: success ? 'warning' : 'error',
    success,
    errorMessage,
  })
}

/**
 * Log MFA event
 */
export async function logMFAEvent(
  context: AuditContext,
  eventType: 'enabled' | 'disabled' | 'verified' | 'failed',
  success: boolean
): Promise<void> {
  await writeAuditLog({
    ...context,
    actionType: 'mfa_event',
    resourceType: 'mfa_configuration',
    eventData: {
      event_type: eventType,
    },
    severity: eventType === 'disabled' ? 'warning' : 'info',
    success,
  })
}

/**
 * Log generic security event
 */
export async function logSecurityEvent(
  context: Partial<AuditContext>,
  eventType: string,
  severity: AuditSeverity,
  metadata?: Record<string, any>
): Promise<void> {
  await writeAuditLog({
    userId: context.userId || 'anonymous',
    clerkUserId: context.clerkUserId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestPath: context.requestPath,
    requestMethod: context.requestMethod,
    actionType: 'security_event',
    resourceType: 'security',
    eventData: {
      event_type: eventType,
      ...metadata,
    },
    severity,
  })
}

/**
 * Query recent audit logs for admin dashboard
 */
export async function getRecentAuditLogs(
  limit: number = 100,
  severityFilter?: AuditSeverity,
  actionTypeFilter?: AuditActionType
): Promise<any[]> {
  try {
    const supabase = await createServiceRoleClient()

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (severityFilter) {
      query = query.eq('severity', severityFilter)
    }

    if (actionTypeFilter) {
      query = query.eq('action_type', actionTypeFilter)
    }

    const { data, error } = await query

    if (error) {
      appLogger.error('Failed to fetch audit logs', { error })
      return []
    }

    return data || []
  } catch (error) {
    appLogger.error('Error querying audit logs', { error })
    return []
  }
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(timeWindow: string = '24 hours'): Promise<any[]> {
  try {
    const supabase = await createServiceRoleClient()

    const { data, error } = await supabase.rpc('get_audit_log_stats', {
      time_window: timeWindow,
    })

    if (error) {
      appLogger.error('Failed to fetch audit log stats', { error })
      return []
    }

    return data || []
  } catch (error) {
    appLogger.error('Error getting audit log stats', { error })
    return []
  }
}

/**
 * Get recent security events
 */
export async function getRecentSecurityEvents(
  limit: number = 100,
  severityFilter?: AuditSeverity
): Promise<any[]> {
  try {
    const supabase = await createServiceRoleClient()

    const { data, error } = await supabase.rpc('get_recent_security_events', {
      limit_count: limit,
      severity_filter: severityFilter || null,
    })

    if (error) {
      appLogger.error('Failed to fetch security events', { error })
      return []
    }

    return data || []
  } catch (error) {
    appLogger.error('Error getting security events', { error })
    return []
  }
}
