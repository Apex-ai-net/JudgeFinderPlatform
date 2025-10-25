/**
 * Email Service for Stripe Payment Events
 *
 * Centralized email notification service that handles:
 * - Payment confirmations
 * - Payment failures and dunning
 * - Subscription lifecycle events
 * - Usage reports
 *
 * Features:
 * - SendGrid integration (with fallback logging)
 * - Template rendering with data
 * - Email logging for auditing
 * - Test mode support
 */

import { sendEmail } from './mailer'
import {
  getPaymentSuccessTemplate,
  getPaymentFailedTemplate,
  getDunningTemplate,
  getSubscriptionCancelledTemplate,
  getUsageReportTemplate,
  type PaymentSuccessData,
  type PaymentFailedData,
  type DunningData,
  type SubscriptionCancelledData,
  type UsageReportData,
} from './templates'
import { logger } from '@/lib/utils/logger'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Email types for categorization and tracking
 */
export type EmailType =
  | 'payment-success'
  | 'payment-failed'
  | 'dunning-reminder'
  | 'dunning-urgent'
  | 'dunning-final'
  | 'subscription-cancelled'
  | 'usage-report'

/**
 * Get organization billing email
 */
async function getOrganizationEmail(organizationId: string): Promise<string | null> {
  try {
    const supabase = await createServiceRoleClient()

    const { data, error } = await supabase
      .from('organizations')
      .select('billing_email')
      .eq('id', organizationId)
      .single()

    if (error || !data) {
      logger.error('Failed to fetch organization email', { organizationId }, error)
      return null
    }

    return data.billing_email
  } catch (error) {
    logger.error('Error fetching organization email', { organizationId }, error as Error)
    return null
  }
}

/**
 * Send payment success notification
 */
export async function sendPaymentSuccessEmail(
  organizationId: string,
  data: Omit<PaymentSuccessData, 'organizationName'>
): Promise<void> {
  try {
    const email = await getOrganizationEmail(organizationId)
    if (!email) {
      logger.warn('No email found for organization, skipping payment success email', {
        organizationId,
      })
      return
    }

    // Get organization name
    const supabase = await createServiceRoleClient()
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    const organizationName = org?.name || 'Customer'

    const template = getPaymentSuccessTemplate({
      ...data,
      organizationName,
    })

    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      category: 'payment-success',
    })

    logger.info('Payment success email sent', { organizationId, email })
  } catch (error) {
    logger.error('Failed to send payment success email', { organizationId }, error as Error)
  }
}

/**
 * Send payment failed notification
 */
export async function sendPaymentFailedEmail(
  organizationId: string,
  data: Omit<PaymentFailedData, 'organizationName'>
): Promise<void> {
  try {
    const email = await getOrganizationEmail(organizationId)
    if (!email) {
      logger.warn('No email found for organization, skipping payment failed email', {
        organizationId,
      })
      return
    }

    // Get organization name
    const supabase = await createServiceRoleClient()
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    const organizationName = org?.name || 'Customer'

    const template = getPaymentFailedTemplate({
      ...data,
      organizationName,
    })

    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      category: 'payment-failed',
    })

    logger.info('Payment failed email sent', { organizationId, email })
  } catch (error) {
    logger.error('Failed to send payment failed email', { organizationId }, error as Error)
  }
}

/**
 * Send dunning email (progressive urgency based on days overdue)
 */
export async function sendDunningEmail(
  organizationId: string,
  data: Omit<DunningData, 'organizationName'>
): Promise<void> {
  try {
    const email = await getOrganizationEmail(organizationId)
    if (!email) {
      logger.warn('No email found for organization, skipping dunning email', { organizationId })
      return
    }

    // Get organization name
    const supabase = await createServiceRoleClient()
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    const organizationName = org?.name || 'Customer'

    const template = getDunningTemplate({
      ...data,
      organizationName,
    })

    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      category: `dunning-${data.severity}`,
    })

    logger.info('Dunning email sent', { organizationId, email, severity: data.severity })
  } catch (error) {
    logger.error('Failed to send dunning email', { organizationId }, error as Error)
  }
}

/**
 * Send subscription cancelled notification
 */
export async function sendSubscriptionCancelledEmail(
  organizationId: string,
  data: Omit<SubscriptionCancelledData, 'organizationName'>
): Promise<void> {
  try {
    const email = await getOrganizationEmail(organizationId)
    if (!email) {
      logger.warn('No email found for organization, skipping cancellation email', {
        organizationId,
      })
      return
    }

    // Get organization name
    const supabase = await createServiceRoleClient()
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    const organizationName = org?.name || 'Customer'

    const template = getSubscriptionCancelledTemplate({
      ...data,
      organizationName,
    })

    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      category: 'subscription-cancelled',
    })

    logger.info('Subscription cancelled email sent', { organizationId, email })
  } catch (error) {
    logger.error('Failed to send subscription cancelled email', { organizationId }, error as Error)
  }
}

/**
 * Send monthly usage report
 */
export async function sendUsageReportEmail(
  organizationId: string,
  data: Omit<UsageReportData, 'organizationName'>
): Promise<void> {
  try {
    const email = await getOrganizationEmail(organizationId)
    if (!email) {
      logger.warn('No email found for organization, skipping usage report', { organizationId })
      return
    }

    // Get organization name
    const supabase = await createServiceRoleClient()
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    const organizationName = org?.name || 'Customer'

    const template = getUsageReportTemplate({
      ...data,
      organizationName,
    })

    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      category: 'usage-report',
    })

    logger.info('Usage report email sent', { organizationId, email })
  } catch (error) {
    logger.error('Failed to send usage report email', { organizationId }, error as Error)
  }
}
