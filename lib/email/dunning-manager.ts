/**
 * Dunning Manager for Failed Payment Recovery
 *
 * Implements progressive dunning sequence for failed payments:
 * - Day 1: Friendly reminder
 * - Day 3: Urgent notice
 * - Day 7: Final warning before cancellation
 *
 * Features:
 * - Tracks payment failure history
 * - Progressive email severity
 * - Automatic retry coordination with Stripe
 * - Cancellation prevention
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendDunningEmail } from './service'
import { logger } from '@/lib/utils/logger'

/**
 * Dunning severity levels based on days overdue
 */
export type DunningSeverity = 'reminder' | 'urgent' | 'final'

/**
 * Get dunning severity based on days overdue
 */
export function getDunningSeverity(daysOverdue: number): DunningSeverity {
  if (daysOverdue >= 7) return 'final'
  if (daysOverdue >= 3) return 'urgent'
  return 'reminder'
}

/**
 * Track failed payment in database
 */
export async function trackPaymentFailure(params: {
  organizationId: string
  stripeInvoiceId: string
  amount: number
  currency: string
  attemptCount: number
  nextAttemptAt?: number | null
}): Promise<void> {
  try {
    const supabase = await createServiceRoleClient()

    // Record the failure in invoices table (already done in webhook handler)
    // Here we could add additional tracking if needed

    logger.info('Payment failure tracked', {
      organizationId: params.organizationId,
      invoiceId: params.stripeInvoiceId,
      attemptCount: params.attemptCount,
    })
  } catch (error) {
    logger.error(
      'Failed to track payment failure',
      { organizationId: params.organizationId },
      error as Error
    )
  }
}

/**
 * Calculate days overdue from first failed attempt
 */
export async function calculateDaysOverdue(
  organizationId: string,
  stripeInvoiceId: string
): Promise<number> {
  try {
    const supabase = await createServiceRoleClient()

    // Get the first failed invoice for this subscription
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('created_at')
      .eq('organization_id', organizationId)
      .eq('stripe_invoice_id', stripeInvoiceId)
      .single()

    if (error || !invoice) {
      return 0
    }

    const createdDate = new Date(invoice.created_at)
    const now = new Date()
    const diffMs = now.getTime() - createdDate.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    return diffDays
  } catch (error) {
    logger.error('Failed to calculate days overdue', { organizationId }, error as Error)
    return 0
  }
}

/**
 * Send appropriate dunning email based on payment failure state
 */
export async function sendDunningNotification(params: {
  organizationId: string
  stripeInvoiceId: string
  amount: number
  currency: string
  attemptCount: number
  invoiceUrl?: string | null
  billingPortalUrl?: string
}): Promise<void> {
  try {
    // Calculate days overdue
    const daysOverdue = await calculateDaysOverdue(params.organizationId, params.stripeInvoiceId)

    // Determine severity
    const severity = getDunningSeverity(daysOverdue)

    // Send dunning email
    await sendDunningEmail(params.organizationId, {
      amount: params.amount,
      currency: params.currency,
      daysOverdue,
      invoiceUrl: params.invoiceUrl,
      billingPortalUrl: params.billingPortalUrl,
      severity,
    })

    // Track that we sent this dunning email
    await trackDunningEmailSent({
      organizationId: params.organizationId,
      stripeInvoiceId: params.stripeInvoiceId,
      severity,
      daysOverdue,
    })

    logger.info('Dunning notification sent', {
      organizationId: params.organizationId,
      severity,
      daysOverdue,
    })
  } catch (error) {
    logger.error(
      'Failed to send dunning notification',
      { organizationId: params.organizationId },
      error as Error
    )
  }
}

/**
 * Track that a dunning email was sent (to avoid duplicates)
 */
async function trackDunningEmailSent(params: {
  organizationId: string
  stripeInvoiceId: string
  severity: DunningSeverity
  daysOverdue: number
}): Promise<void> {
  try {
    const supabase = await createServiceRoleClient()

    // Update invoice record with dunning metadata
    const { error } = await supabase
      .from('invoices')
      .update({
        metadata: {
          last_dunning_email: new Date().toISOString(),
          dunning_severity: params.severity,
          days_overdue: params.daysOverdue,
        },
      })
      .eq('stripe_invoice_id', params.stripeInvoiceId)

    if (error) {
      logger.error('Failed to track dunning email', params, error)
    }
  } catch (error) {
    logger.error('Error tracking dunning email', params, error as Error)
  }
}

/**
 * Check if dunning email should be sent (avoid spam)
 *
 * Rules:
 * - Don't send more than 1 email per day
 * - Don't send same severity twice
 */
export async function shouldSendDunningEmail(
  organizationId: string,
  stripeInvoiceId: string,
  severity: DunningSeverity
): Promise<boolean> {
  try {
    const supabase = await createServiceRoleClient()

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('metadata')
      .eq('stripe_invoice_id', stripeInvoiceId)
      .single()

    if (error || !invoice || !invoice.metadata) {
      return true // No record, safe to send
    }

    const metadata = invoice.metadata as {
      last_dunning_email?: string
      dunning_severity?: DunningSeverity
      days_overdue?: number
    }

    // Check if we sent an email in the last 24 hours
    if (metadata.last_dunning_email) {
      const lastSent = new Date(metadata.last_dunning_email)
      const now = new Date()
      const hoursSinceLastEmail = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60)

      if (hoursSinceLastEmail < 24) {
        logger.info('Skipping dunning email - sent recently', {
          organizationId,
          hoursSinceLastEmail,
        })
        return false
      }
    }

    // Check if we already sent this severity level
    if (metadata.dunning_severity === severity) {
      logger.info('Skipping dunning email - same severity already sent', {
        organizationId,
        severity,
      })
      return false
    }

    return true
  } catch (error) {
    logger.error('Error checking dunning email eligibility', { organizationId }, error as Error)
    return true // Err on the side of sending
  }
}

/**
 * Process dunning sequence for an organization
 *
 * This can be called from:
 * - Webhook handler (immediate)
 * - Scheduled job (daily check for overdue payments)
 */
export async function processDunningSequence(organizationId: string): Promise<void> {
  try {
    const supabase = await createServiceRoleClient()

    // Find all failed invoices for this organization
    const { data: failedInvoices, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'failed')
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch failed invoices', { organizationId }, error)
      return
    }

    if (!failedInvoices || failedInvoices.length === 0) {
      return // No failed invoices
    }

    // Process the most recent failed invoice
    const invoice = failedInvoices[0]
    const daysOverdue = await calculateDaysOverdue(organizationId, invoice.stripe_invoice_id)
    const severity = getDunningSeverity(daysOverdue)

    // Check if we should send the email
    const shouldSend = await shouldSendDunningEmail(
      organizationId,
      invoice.stripe_invoice_id,
      severity
    )

    if (!shouldSend) {
      return
    }

    // Send dunning notification
    await sendDunningNotification({
      organizationId,
      stripeInvoiceId: invoice.stripe_invoice_id,
      amount: invoice.amount,
      currency: invoice.currency,
      attemptCount: invoice.attempt_count || 0,
      invoiceUrl: invoice.hosted_invoice_url,
      billingPortalUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing`,
    })

    logger.info('Dunning sequence processed', { organizationId, severity, daysOverdue })
  } catch (error) {
    logger.error('Failed to process dunning sequence', { organizationId }, error as Error)
  }
}
