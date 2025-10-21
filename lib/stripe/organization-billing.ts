import Stripe from 'stripe'
import { getStripeClient } from './client'

/**
 * Organization Billing Service
 *
 * Handles all Stripe operations for organization-level subscriptions:
 * - Seat-based pricing with auto-scaling
 * - Tiered plans (Free, Pro, Enterprise)
 * - Usage-based billing for API calls
 * - Prorated billing for mid-cycle changes
 *
 * Architecture:
 * - One Stripe customer per organization
 * - Subscription items for seats and usage
 * - Metadata tracking for org context
 */

// Pricing tier definitions
export const PRICING_TIERS = {
  FREE: {
    name: 'Free',
    maxSeats: 3,
    pricePerSeat: 0,
    features: ['Basic search', 'Judge profiles', 'Limited analytics'],
    apiCallsIncluded: 100,
  },
  PRO: {
    name: 'Pro',
    maxSeats: 10,
    pricePerSeat: 49, // $49/month per seat
    features: [
      'Advanced search',
      'Full analytics',
      'Bias detection',
      'Export data',
      'Priority support',
    ],
    apiCallsIncluded: 1000,
    annualDiscount: 0.15, // 15% off for annual billing
  },
  ENTERPRISE: {
    name: 'Enterprise',
    maxSeats: null, // Unlimited
    pricePerSeat: 39, // $39/month per seat (volume discount)
    features: [
      'All Pro features',
      'Unlimited seats',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee',
      'SSO/SAML',
    ],
    apiCallsIncluded: 10000,
    annualDiscount: 0.2, // 20% off for annual billing
  },
} as const

export type PricingTier = keyof typeof PRICING_TIERS

// Stripe Price IDs (set via environment variables)
export const STRIPE_PRICES = {
  PRO_MONTHLY_SEAT: process.env.STRIPE_PRICE_PRO_MONTHLY_SEAT,
  PRO_ANNUAL_SEAT: process.env.STRIPE_PRICE_PRO_ANNUAL_SEAT,
  ENTERPRISE_MONTHLY_SEAT: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY_SEAT,
  ENTERPRISE_ANNUAL_SEAT: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL_SEAT,
  USAGE_API_CALLS: process.env.STRIPE_PRICE_USAGE_API_CALLS, // Metered billing
} as const

/**
 * Organization billing data structure
 */
export interface OrganizationBilling {
  organizationId: string
  stripeCustomerId: string
  stripeSubscriptionId?: string
  tier: PricingTier
  billingInterval: 'monthly' | 'annual'
  seats: number
  usedSeats: number
  apiCallsUsed: number
  apiCallsLimit: number
  status: 'trial' | 'active' | 'past_due' | 'canceled' | 'paused'
  trialEndsAt?: Date
  currentPeriodStart: Date
  currentPeriodEnd: Date
  billingEmail: string
  paymentMethodId?: string
}

/**
 * Create or retrieve Stripe customer for organization
 */
export async function getOrCreateStripeCustomer(params: {
  organizationId: string
  organizationName: string
  billingEmail: string
  metadata?: Record<string, string>
}): Promise<string> {
  const stripe = getStripeClient()

  // Check if customer already exists
  const existingCustomers = await stripe.customers.list({
    email: params.billingEmail,
    limit: 1,
  })

  if (existingCustomers.data.length > 0) {
    const customer = existingCustomers.data[0]

    // Update metadata if needed
    await stripe.customers.update(customer.id, {
      metadata: {
        organizationId: params.organizationId,
        organizationName: params.organizationName,
        ...params.metadata,
      },
    })

    return customer.id
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email: params.billingEmail,
    name: params.organizationName,
    metadata: {
      organizationId: params.organizationId,
      organizationName: params.organizationName,
      ...params.metadata,
    },
    tax_id_data: [], // Allow tax ID collection
  })

  return customer.id
}

/**
 * Create organization subscription with seat-based pricing
 */
export async function createOrganizationSubscription(params: {
  customerId: string
  organizationId: string
  tier: PricingTier
  billingInterval: 'monthly' | 'annual'
  seats: number
  trialDays?: number
}): Promise<Stripe.Subscription> {
  const stripe = getStripeClient()

  if (params.tier === 'FREE') {
    throw new Error('FREE tier does not require a subscription')
  }

  // Determine price ID based on tier and interval
  const priceId =
    params.tier === 'PRO'
      ? params.billingInterval === 'monthly'
        ? STRIPE_PRICES.PRO_MONTHLY_SEAT
        : STRIPE_PRICES.PRO_ANNUAL_SEAT
      : params.billingInterval === 'monthly'
        ? STRIPE_PRICES.ENTERPRISE_MONTHLY_SEAT
        : STRIPE_PRICES.ENTERPRISE_ANNUAL_SEAT

  if (!priceId) {
    throw new Error(`Stripe price ID not configured for ${params.tier} ${params.billingInterval}`)
  }

  // Validate seat count
  const tierConfig = PRICING_TIERS[params.tier]
  if (tierConfig.maxSeats !== null && params.seats > tierConfig.maxSeats) {
    throw new Error(`${params.tier} tier supports maximum ${tierConfig.maxSeats} seats`)
  }

  // Create subscription with seat-based quantity
  const subscription = await stripe.subscriptions.create({
    customer: params.customerId,
    items: [
      {
        price: priceId,
        quantity: params.seats,
      },
      // Add metered billing for API calls (if configured)
      ...(STRIPE_PRICES.USAGE_API_CALLS
        ? [
            {
              price: STRIPE_PRICES.USAGE_API_CALLS,
            },
          ]
        : []),
    ],
    metadata: {
      organizationId: params.organizationId,
      tier: params.tier,
      billingInterval: params.billingInterval,
    },
    trial_period_days: params.trialDays,
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent', 'customer'],
    // Enable proration for mid-cycle changes
    proration_behavior: 'create_prorations',
  })

  return subscription
}

/**
 * Update subscription seat count (auto-scaling)
 */
export async function updateSubscriptionSeats(params: {
  subscriptionId: string
  newSeatCount: number
  tier: PricingTier
}): Promise<Stripe.Subscription> {
  const stripe = getStripeClient()

  // Validate seat count
  const tierConfig = PRICING_TIERS[params.tier]
  if (tierConfig.maxSeats !== null && params.newSeatCount > tierConfig.maxSeats) {
    throw new Error(`${params.tier} tier supports maximum ${tierConfig.maxSeats} seats`)
  }

  // Retrieve subscription to get the seat item
  const subscription = await stripe.subscriptions.retrieve(params.subscriptionId)

  // Find the seat-based subscription item
  const seatItem = subscription.items.data.find(
    (item) => item.price.recurring?.usage_type === 'licensed'
  )

  if (!seatItem) {
    throw new Error('Seat-based subscription item not found')
  }

  // Update the quantity with proration
  const updatedSubscription = await stripe.subscriptions.update(params.subscriptionId, {
    items: [
      {
        id: seatItem.id,
        quantity: params.newSeatCount,
      },
    ],
    proration_behavior: 'create_prorations',
    metadata: {
      lastSeatUpdate: new Date().toISOString(),
      previousSeats: seatItem.quantity?.toString() || '0',
    },
  })

  return updatedSubscription
}

/**
 * Report usage for metered billing (API calls)
 */
export async function reportUsage(params: {
  subscriptionId: string
  quantity: number
  timestamp?: number
  action?: string
}): Promise<Stripe.UsageRecord> {
  const stripe = getStripeClient()

  // Retrieve subscription to get the usage-based item
  const subscription = await stripe.subscriptions.retrieve(params.subscriptionId)

  const usageItem = subscription.items.data.find(
    (item) => item.price.recurring?.usage_type === 'metered'
  )

  if (!usageItem) {
    throw new Error('Usage-based subscription item not found')
  }

  // Report usage
  const usageRecord = await stripe.subscriptionItems.createUsageRecord(usageItem.id, {
    quantity: params.quantity,
    timestamp: params.timestamp || Math.floor(Date.now() / 1000),
    action: (params.action as 'increment' | 'set') || 'increment',
  })

  return usageRecord
}

/**
 * Change subscription tier (upgrade/downgrade)
 */
export async function changeSubscriptionTier(params: {
  subscriptionId: string
  newTier: PricingTier
  billingInterval: 'monthly' | 'annual'
  seats: number
}): Promise<Stripe.Subscription> {
  const stripe = getStripeClient()

  if (params.newTier === 'FREE') {
    // Downgrade to free - cancel subscription
    return await stripe.subscriptions.cancel(params.subscriptionId, {
      prorate: true,
    })
  }

  // Get new price ID
  const newPriceId =
    params.newTier === 'PRO'
      ? params.billingInterval === 'monthly'
        ? STRIPE_PRICES.PRO_MONTHLY_SEAT
        : STRIPE_PRICES.PRO_ANNUAL_SEAT
      : params.billingInterval === 'monthly'
        ? STRIPE_PRICES.ENTERPRISE_MONTHLY_SEAT
        : STRIPE_PRICES.ENTERPRISE_ANNUAL_SEAT

  if (!newPriceId) {
    throw new Error(`Stripe price ID not configured for ${params.newTier} ${params.billingInterval}`)
  }

  // Retrieve current subscription
  const subscription = await stripe.subscriptions.retrieve(params.subscriptionId)

  const seatItem = subscription.items.data.find(
    (item) => item.price.recurring?.usage_type === 'licensed'
  )

  if (!seatItem) {
    throw new Error('Seat-based subscription item not found')
  }

  // Update subscription with new price and quantity
  const updatedSubscription = await stripe.subscriptions.update(params.subscriptionId, {
    items: [
      {
        id: seatItem.id,
        price: newPriceId,
        quantity: params.seats,
      },
    ],
    proration_behavior: 'create_prorations',
    metadata: {
      previousTier: subscription.metadata.tier,
      tier: params.newTier,
      tierChangeDate: new Date().toISOString(),
    },
  })

  return updatedSubscription
}

/**
 * Cancel subscription (with option to cancel at period end)
 */
export async function cancelSubscription(params: {
  subscriptionId: string
  cancelAtPeriodEnd?: boolean
  reason?: string
}): Promise<Stripe.Subscription> {
  const stripe = getStripeClient()

  if (params.cancelAtPeriodEnd) {
    // Schedule cancellation for end of billing period
    return await stripe.subscriptions.update(params.subscriptionId, {
      cancel_at_period_end: true,
      metadata: {
        cancellationReason: params.reason || 'user_requested',
        cancellationDate: new Date().toISOString(),
      },
    })
  }

  // Cancel immediately with proration
  return await stripe.subscriptions.cancel(params.subscriptionId, {
    prorate: true,
  })
}

/**
 * Get organization billing portal URL
 */
export async function createBillingPortalSession(params: {
  customerId: string
  returnUrl: string
}): Promise<string> {
  const stripe = getStripeClient()

  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  })

  return session.url
}

/**
 * List invoices for organization
 */
export async function getOrganizationInvoices(params: {
  customerId: string
  limit?: number
}): Promise<Stripe.Invoice[]> {
  const stripe = getStripeClient()

  const invoices = await stripe.invoices.list({
    customer: params.customerId,
    limit: params.limit || 10,
  })

  return invoices.data
}

/**
 * Get upcoming invoice preview
 */
export async function getUpcomingInvoice(params: {
  customerId: string
  subscriptionId?: string
}): Promise<Stripe.UpcomingInvoice> {
  const stripe = getStripeClient()

  return await stripe.invoices.retrieveUpcoming({
    customer: params.customerId,
    subscription: params.subscriptionId,
  })
}

/**
 * Add payment method to customer
 */
export async function attachPaymentMethod(params: {
  customerId: string
  paymentMethodId: string
  setAsDefault?: boolean
}): Promise<Stripe.PaymentMethod> {
  const stripe = getStripeClient()

  // Attach payment method to customer
  const paymentMethod = await stripe.paymentMethods.attach(params.paymentMethodId, {
    customer: params.customerId,
  })

  // Set as default if requested
  if (params.setAsDefault) {
    await stripe.customers.update(params.customerId, {
      invoice_settings: {
        default_payment_method: params.paymentMethodId,
      },
    })
  }

  return paymentMethod
}

/**
 * List payment methods for customer
 */
export async function getPaymentMethods(params: {
  customerId: string
}): Promise<Stripe.PaymentMethod[]> {
  const stripe = getStripeClient()

  const paymentMethods = await stripe.paymentMethods.list({
    customer: params.customerId,
    type: 'card',
  })

  return paymentMethods.data
}

/**
 * Calculate prorated cost for seat changes
 */
export async function calculateProration(params: {
  subscriptionId: string
  newSeatCount: number
}): Promise<{
  immediateCharge: number
  nextInvoiceTotal: number
  proratedAmount: number
}> {
  const stripe = getStripeClient()

  // Get upcoming invoice with proration
  const subscription = await stripe.subscriptions.retrieve(params.subscriptionId)
  const seatItem = subscription.items.data.find(
    (item) => item.price.recurring?.usage_type === 'licensed'
  )

  if (!seatItem) {
    throw new Error('Seat-based subscription item not found')
  }

  const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
    customer: subscription.customer as string,
    subscription: params.subscriptionId,
    subscription_items: [
      {
        id: seatItem.id,
        quantity: params.newSeatCount,
      },
    ],
  })

  const proratedAmount =
    upcomingInvoice.lines.data.find((line) => line.proration)?.amount || 0

  return {
    immediateCharge: upcomingInvoice.amount_due,
    nextInvoiceTotal: upcomingInvoice.total,
    proratedAmount: proratedAmount / 100, // Convert to dollars
  }
}

/**
 * Issue refund for organization (admin only)
 */
export async function issueRefund(params: {
  paymentIntentId: string
  amount?: number // If not provided, refund full amount
  reason?: string
  metadata?: Record<string, string>
}): Promise<Stripe.Refund> {
  const stripe = getStripeClient()

  return await stripe.refunds.create({
    payment_intent: params.paymentIntentId,
    amount: params.amount,
    reason: (params.reason as Stripe.RefundCreateParams.Reason) || 'requested_by_customer',
    metadata: params.metadata,
  })
}

/**
 * Get subscription analytics
 */
export async function getSubscriptionAnalytics(params: {
  customerId: string
  subscriptionId: string
}): Promise<{
  mrr: number // Monthly Recurring Revenue
  seats: number
  usedSeats: number
  seatUtilization: number
  apiCallsUsed: number
  apiCallsLimit: number
  usagePercentage: number
  daysUntilRenewal: number
  lifetimeValue: number
}> {
  const stripe = getStripeClient()

  const subscription = await stripe.subscriptions.retrieve(params.subscriptionId, {
    expand: ['items.data.price'],
  })

  const seatItem = subscription.items.data.find(
    (item) => item.price.recurring?.usage_type === 'licensed'
  )

  if (!seatItem || !seatItem.price.unit_amount) {
    throw new Error('Seat-based subscription item not found')
  }

  const seats = seatItem.quantity || 0
  const pricePerSeat = seatItem.price.unit_amount / 100
  const interval = seatItem.price.recurring?.interval || 'month'

  // Calculate MRR (normalize to monthly)
  const mrr = interval === 'year' ? (pricePerSeat * seats) / 12 : pricePerSeat * seats

  // Get usage data (mock for now - in reality would query your database)
  const usedSeats = 0 // TODO: Query from organizations.member_count
  const apiCallsUsed = 0 // TODO: Query from usage_tracking table
  const tier = subscription.metadata.tier as PricingTier
  const apiCallsLimit = tier ? PRICING_TIERS[tier].apiCallsIncluded : 0

  // Calculate days until renewal
  const now = Math.floor(Date.now() / 1000)
  const daysUntilRenewal = Math.ceil(
    (subscription.current_period_end - now) / (60 * 60 * 24)
  )

  // Get all invoices to calculate lifetime value
  const invoices = await stripe.invoices.list({
    customer: params.customerId,
    subscription: params.subscriptionId,
    status: 'paid',
  })

  const lifetimeValue = invoices.data.reduce((sum, invoice) => sum + (invoice.amount_paid || 0), 0) / 100

  return {
    mrr,
    seats,
    usedSeats,
    seatUtilization: usedSeats > 0 ? (usedSeats / seats) * 100 : 0,
    apiCallsUsed,
    apiCallsLimit,
    usagePercentage: apiCallsLimit > 0 ? (apiCallsUsed / apiCallsLimit) * 100 : 0,
    daysUntilRenewal,
    lifetimeValue,
  }
}
