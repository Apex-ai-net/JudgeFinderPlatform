import { stripe } from '@/lib/stripe/client'
import Stripe from 'stripe'

/**
 * Credits and Refunds Management
 * Track customer balance credits and refund history
 */

export interface Credit {
  id: string
  amount: number
  currency: string
  description: string
  created: Date
  source: 'refund' | 'proration' | 'manual' | 'promotion'
}

export interface Refund {
  id: string
  amount: number
  currency: string
  status: string
  reason: string | null
  created: Date
  chargeId: string
  receiptNumber: string | null
}

export interface CreditsRefundsData {
  currentBalance: number
  currency: string
  credits: Credit[]
  refunds: Refund[]
  totalCreditsApplied: number
  totalRefunded: number
}

/**
 * Get customer balance, credits, and refunds
 */
export async function getCreditsAndRefunds(stripeCustomerId: string): Promise<CreditsRefundsData> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  // Get customer to check balance
  const customer = await stripe.customers.retrieve(stripeCustomerId)

  if (customer.deleted) {
    throw new Error('Customer has been deleted')
  }

  const currentBalance = customer.balance / 100 // Convert from cents, negative = credit
  const currency = customer.currency || 'usd'

  // Get customer balance transactions (credits)
  const balanceTransactions = await stripe.customers.listBalanceTransactions(stripeCustomerId, {
    limit: 100,
  })

  const credits: Credit[] = balanceTransactions.data
    .filter((txn) => txn.amount < 0) // Negative amounts are credits
    .map((txn) => ({
      id: txn.id,
      amount: Math.abs(txn.amount) / 100,
      currency: txn.currency.toUpperCase(),
      description: txn.description || 'Account credit',
      created: new Date(txn.created * 1000),
      source: determineSource(txn.type, txn.description),
    }))

  // Get refunds
  const refunds = await stripe.refunds.list({
    limit: 100,
  })

  const customerRefunds: Refund[] = []

  for (const refund of refunds.data) {
    // Get the charge to check if it belongs to this customer
    const charge = await stripe.charges.retrieve(refund.charge as string)

    if (charge.customer === stripeCustomerId) {
      customerRefunds.push({
        id: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency.toUpperCase(),
        status: refund.status || 'unknown',
        reason: refund.reason,
        created: new Date(refund.created * 1000),
        chargeId: refund.charge as string,
        receiptNumber: refund.receipt_number,
      })
    }
  }

  const totalCreditsApplied = credits.reduce((sum, credit) => sum + credit.amount, 0)
  const totalRefunded = customerRefunds.reduce((sum, refund) => sum + refund.amount, 0)

  return {
    currentBalance: Math.abs(currentBalance),
    currency: currency.toUpperCase(),
    credits,
    refunds: customerRefunds,
    totalCreditsApplied,
    totalRefunded,
  }
}

/**
 * Determine the source of a credit based on transaction type and description
 */
function determineSource(
  type: string,
  description: string | null
): 'refund' | 'proration' | 'manual' | 'promotion' {
  const desc = (description || '').toLowerCase()

  if (type === 'adjustment' && desc.includes('refund')) return 'refund'
  if (desc.includes('proration') || desc.includes('unused')) return 'proration'
  if (desc.includes('promotion') || desc.includes('discount')) return 'promotion'
  if (type === 'adjustment') return 'manual'

  return 'manual'
}

/**
 * Issue a manual credit to a customer
 */
export async function issueCredit(
  customerId: string,
  amount: number,
  description: string
): Promise<Stripe.CustomerBalanceTransaction> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  return await stripe.customers.createBalanceTransaction(customerId, {
    amount: -Math.abs(amount * 100), // Negative = credit
    currency: 'usd',
    description,
  })
}

/**
 * Issue a refund for a charge
 */
export async function issueRefund(
  chargeId: string,
  amount?: number,
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
): Promise<Stripe.Refund> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  return await stripe.refunds.create({
    charge: chargeId,
    ...(amount && { amount: amount * 100 }), // Partial refund if amount specified
    ...(reason && { reason }),
  })
}
