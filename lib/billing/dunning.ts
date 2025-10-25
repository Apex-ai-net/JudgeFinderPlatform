import { stripe } from '@/lib/stripe/client'
import Stripe from 'stripe'

/**
 * Dunning Management - Failed Payment Recovery
 * Handles failed payments, retry schedules, and payment recovery
 */

export interface FailedPayment {
  invoiceId: string
  invoiceNumber: string | null
  amount: number
  currency: string
  attemptCount: number
  nextAttempt: Date | null
  created: Date
  dueDate: Date | null
  lastError: string | null
  status: string
}

export interface DunningStatus {
  hasFailedPayments: boolean
  failedPayments: FailedPayment[]
  totalOutstanding: number
  nextRetryDate: Date | null
  subscriptionAtRisk: boolean
}

/**
 * Get failed payments and dunning status for a customer
 */
export async function getDunningStatus(stripeCustomerId: string): Promise<DunningStatus> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  // Get all open/uncollectible invoices
  const invoices = await stripe.invoices.list({
    customer: stripeCustomerId,
    status: 'open',
    limit: 100,
  })

  // Filter for failed payments (not draft invoices)
  const failedInvoices = invoices.data.filter(
    (inv) => inv.attempt_count > 0 && inv.status === 'open'
  )

  const failedPayments: FailedPayment[] = failedInvoices.map((invoice) => ({
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    amount: invoice.amount_due / 100,
    currency: invoice.currency.toUpperCase(),
    attemptCount: invoice.attempt_count,
    nextAttempt: invoice.next_payment_attempt
      ? new Date(invoice.next_payment_attempt * 1000)
      : null,
    created: new Date(invoice.created * 1000),
    dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
    lastError: invoice.last_finalization_error?.message || null,
    status: invoice.status || 'unknown',
  }))

  const totalOutstanding = failedPayments.reduce((sum, payment) => sum + payment.amount, 0)

  // Find the next retry date
  const nextRetryDate =
    failedPayments
      .map((p) => p.nextAttempt)
      .filter((date): date is Date => date !== null)
      .sort((a, b) => a.getTime() - b.getTime())[0] || null

  // Check if subscription is at risk (has failed payments)
  const subscriptionAtRisk = failedPayments.length > 0

  return {
    hasFailedPayments: failedPayments.length > 0,
    failedPayments,
    totalOutstanding,
    nextRetryDate,
    subscriptionAtRisk,
  }
}

/**
 * Retry a failed payment manually
 */
export async function retryFailedPayment(invoiceId: string): Promise<Stripe.Invoice> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  // Pay the invoice (will use default payment method)
  return await stripe.invoices.pay(invoiceId, {
    paid_out_of_band: false,
  })
}

/**
 * Update payment method and retry failed payments
 */
export async function updatePaymentMethodAndRetry(
  customerId: string,
  paymentMethodId: string
): Promise<void> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  // Attach payment method to customer
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  })

  // Set as default payment method
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  })

  // Get all open invoices
  const invoices = await stripe.invoices.list({
    customer: customerId,
    status: 'open',
    limit: 100,
  })

  // Retry each failed invoice
  for (const invoice of invoices.data) {
    if (invoice.attempt_count > 0) {
      try {
        await stripe.invoices.pay(invoice.id)
      } catch (error) {
        console.error(`Failed to retry invoice ${invoice.id}:`, error)
        // Continue with other invoices even if one fails
      }
    }
  }
}

/**
 * Get payment retry schedule for an invoice
 */
export async function getRetrySchedule(invoiceId: string): Promise<{
  attemptsMade: number
  maxAttempts: number
  nextAttempt: Date | null
  willRetryAutomatically: boolean
}> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  const invoice = await stripe.invoices.retrieve(invoiceId)

  // Stripe typically retries 3-4 times over ~3 weeks
  const maxAttempts = 4
  const willRetryAutomatically = invoice.attempt_count < maxAttempts && invoice.status === 'open'

  return {
    attemptsMade: invoice.attempt_count,
    maxAttempts,
    nextAttempt: invoice.next_payment_attempt
      ? new Date(invoice.next_payment_attempt * 1000)
      : null,
    willRetryAutomatically,
  }
}

/**
 * Mark invoice as paid outside Stripe (manual payment received)
 */
export async function markInvoicePaidOutOfBand(invoiceId: string): Promise<Stripe.Invoice> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  return await stripe.invoices.pay(invoiceId, {
    paid_out_of_band: true,
  })
}

/**
 * Void an invoice (cancel without attempting payment)
 */
export async function voidInvoice(invoiceId: string): Promise<Stripe.Invoice> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  return await stripe.invoices.voidInvoice(invoiceId)
}
