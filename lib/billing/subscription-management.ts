import { stripe } from '@/lib/stripe/client'
import Stripe from 'stripe'

/**
 * Subscription Management Utilities
 * Handles plan changes, proration previews, and subscription updates
 */

export interface ProrationPreview {
  immediateCharge: number
  creditApplied: number
  nextInvoiceAmount: number
  proratedAmount: number
  newPlanAmount: number
  billingCycleAnchor: Date
  description: string
}

export interface SubscriptionChange {
  subscriptionId: string
  newPriceId: string
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
}

/**
 * Preview what will happen when upgrading/downgrading a subscription
 * Shows proration credits and charges before committing the change
 */
export async function previewSubscriptionChange(
  subscriptionId: string,
  newPriceId: string
): Promise<ProrationPreview> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  // Get current subscription
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // Create upcoming invoice preview with the new price
  const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
    customer: subscription.customer as string,
    subscription: subscriptionId,
    subscription_items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    subscription_proration_behavior: 'create_prorations',
  })

  // Calculate proration details
  const proratedAmount = upcomingInvoice.lines.data
    .filter((line) => line.proration)
    .reduce((sum, line) => sum + line.amount, 0)

  const newPlanAmount = upcomingInvoice.lines.data
    .filter((line) => !line.proration)
    .reduce((sum, line) => sum + line.amount, 0)

  const creditApplied = Math.abs(Math.min(proratedAmount, 0)) / 100
  const immediateCharge = Math.max(upcomingInvoice.amount_due, 0) / 100
  const nextInvoiceAmount = newPlanAmount / 100

  // Create human-readable description
  let description = ''
  if (immediateCharge > 0) {
    description = `You will be charged $${immediateCharge.toFixed(2)} today for the upgraded plan.`
  } else if (creditApplied > 0) {
    description = `You will receive a credit of $${creditApplied.toFixed(2)} for the unused portion of your current plan.`
  } else {
    description = 'Your plan will change at the end of the current billing period.'
  }

  return {
    immediateCharge,
    creditApplied,
    nextInvoiceAmount,
    proratedAmount: proratedAmount / 100,
    newPlanAmount: newPlanAmount / 100,
    billingCycleAnchor: new Date(subscription.current_period_end * 1000),
    description,
  }
}

/**
 * Update a subscription to a new plan with proration
 */
export async function updateSubscription(change: SubscriptionChange): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  const { subscriptionId, newPriceId, prorationBehavior = 'create_prorations' } = change

  // Get current subscription
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // Update subscription with new price
  const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: prorationBehavior,
    billing_cycle_anchor: 'unchanged',
  })

  return updatedSubscription
}

/**
 * Cancel a subscription at period end (soft cancellation)
 */
export async function cancelSubscriptionAtPeriodEnd(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
}

/**
 * Reactivate a subscription that was set to cancel
 */
export async function reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })
}

/**
 * Cancel a subscription immediately (hard cancellation)
 */
export async function cancelSubscriptionImmediately(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  return await stripe.subscriptions.cancel(subscriptionId)
}

/**
 * Get available plans for upgrade/downgrade
 * Returns plans that are different from the current subscription
 */
export async function getAvailablePlans(currentPriceId: string): Promise<
  Array<{
    id: string
    name: string
    amount: number
    currency: string
    interval: 'month' | 'year'
    isUpgrade: boolean
  }>
> {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }

  // Get current price details
  const currentPrice = await stripe.prices.retrieve(currentPriceId, {
    expand: ['product'],
  })

  const currentAmount = currentPrice.unit_amount || 0

  // Get all active prices
  const prices = await stripe.prices.list({
    active: true,
    type: 'recurring',
    expand: ['data.product'],
  })

  // Filter and format available plans
  return prices.data
    .filter((price) => price.id !== currentPriceId)
    .filter((price) => price.unit_amount !== null)
    .map((price) => {
      const product = price.product as Stripe.Product
      return {
        id: price.id,
        name: product.name,
        amount: (price.unit_amount || 0) / 100,
        currency: price.currency.toUpperCase(),
        interval: (price.recurring?.interval as 'month' | 'year') || 'month',
        isUpgrade: (price.unit_amount || 0) > currentAmount,
      }
    })
    .sort((a, b) => {
      // Sort by amount ascending
      if (a.amount !== b.amount) return a.amount - b.amount
      // Then by interval (monthly first)
      return a.interval === 'month' ? -1 : 1
    })
}
