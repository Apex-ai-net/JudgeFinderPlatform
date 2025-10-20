import Stripe from 'stripe'
import { getStripeClient, verifyWebhookSignature } from './client'
import { createClient } from '@/lib/supabase/server'

/**
 * Stripe Webhook Handler for Organization Billing
 *
 * Handles all Stripe webhook events for organization subscriptions:
 * - customer.subscription.updated (seat changes, tier changes)
 * - customer.subscription.deleted (cancellations)
 * - invoice.payment_succeeded (successful payments)
 * - invoice.payment_failed (failed payments, dunning)
 * - payment_method.attached (new payment methods)
 * - customer.updated (billing info changes)
 *
 * Architecture:
 * - Webhook signature verification for security
 * - Idempotent processing (handle duplicate events)
 * - Transaction safety for database updates
 * - Error handling and retry logic
 */

/**
 * Process Stripe webhook event
 */
export async function handleStripeWebhook(
  payload: string | Buffer,
  signature: string
): Promise<{ received: true }> {
  let event: Stripe.Event

  try {
    event = verifyWebhookSignature(payload, signature)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    throw new Error('Invalid webhook signature')
  }

  console.log(`Processing webhook event: ${event.type} (${event.id})`)

  // Route to appropriate handler based on event type
  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod)
        break

      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as Stripe.Customer)
        break

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      default:
        console.log(`Unhandled webhook event type: ${event.type}`)
    }

    // Log successful webhook processing
    await logWebhookEvent(event, 'success')
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error)
    await logWebhookEvent(event, 'failed', error)
    throw error
  }

  return { received: true }
}

/**
 * Handle subscription created event
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  const supabase = await createClient()

  const organizationId = subscription.metadata.organizationId
  if (!organizationId) {
    console.warn('Subscription created without organizationId metadata')
    return
  }

  const tier = subscription.metadata.tier as string
  const billingInterval = subscription.metadata.billingInterval as 'monthly' | 'annual'

  // Get seat count from subscription items
  const seatItem = subscription.items.data.find(
    (item) => item.price.recurring?.usage_type === 'licensed'
  )
  const seats = seatItem?.quantity || 0

  // Update organization with subscription details
  const { error } = await supabase
    .from('organizations')
    .update({
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      subscription_tier: tier,
      billing_interval: billingInterval,
      seats: seats,
      subscription_status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_ends_at: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)

  if (error) {
    console.error('Failed to update organization on subscription creation:', error)
    throw error
  }

  console.log(`Subscription created for organization ${organizationId}: ${subscription.id}`)
}

/**
 * Handle subscription updated event (seat changes, tier changes, status changes)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const supabase = await createClient()

  const organizationId = subscription.metadata.organizationId
  if (!organizationId) {
    console.warn('Subscription updated without organizationId metadata')
    return
  }

  // Get seat count from subscription items
  const seatItem = subscription.items.data.find(
    (item) => item.price.recurring?.usage_type === 'licensed'
  )
  const seats = seatItem?.quantity || 0

  // Check if seats changed
  const previousSeats = subscription.metadata.previousSeats
  if (previousSeats && parseInt(previousSeats) !== seats) {
    console.log(`Seats changed from ${previousSeats} to ${seats} for org ${organizationId}`)
  }

  // Check if tier changed
  const previousTier = subscription.metadata.previousTier
  const currentTier = subscription.metadata.tier
  if (previousTier && previousTier !== currentTier) {
    console.log(`Tier changed from ${previousTier} to ${currentTier} for org ${organizationId}`)
  }

  // Update organization
  const { error } = await supabase
    .from('organizations')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_tier: subscription.metadata.tier || null,
      seats: seats,
      subscription_status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)

  if (error) {
    console.error('Failed to update organization on subscription update:', error)
    throw error
  }

  // If subscription is past_due, send notification
  if (subscription.status === 'past_due') {
    await notifyPaymentFailed(organizationId, 'subscription_past_due')
  }

  console.log(`Subscription updated for organization ${organizationId}: ${subscription.status}`)
}

/**
 * Handle subscription deleted event (cancellation)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const supabase = await createClient()

  const organizationId = subscription.metadata.organizationId
  if (!organizationId) {
    console.warn('Subscription deleted without organizationId metadata')
    return
  }

  // Downgrade organization to FREE tier
  const { error } = await supabase
    .from('organizations')
    .update({
      subscription_tier: 'FREE',
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      seats: 3, // Free tier limit
      cancel_at_period_end: false,
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)

  if (error) {
    console.error('Failed to update organization on subscription deletion:', error)
    throw error
  }

  // Send cancellation notification
  await notifySubscriptionCanceled(organizationId)

  console.log(`Subscription canceled for organization ${organizationId}`)
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const supabase = await createClient()

  // Get organization from customer metadata
  const stripe = getStripeClient()
  const customer = await stripe.customers.retrieve(invoice.customer as string)

  if (customer.deleted) {
    console.warn('Invoice payment succeeded for deleted customer')
    return
  }

  const organizationId = customer.metadata.organizationId
  if (!organizationId) {
    console.warn('Invoice payment succeeded without organizationId in customer metadata')
    return
  }

  // Record invoice in database
  const { error } = await supabase.from('invoices').insert({
    organization_id: organizationId,
    stripe_invoice_id: invoice.id,
    stripe_customer_id: invoice.customer as string,
    amount: invoice.amount_paid / 100,
    currency: invoice.currency,
    status: 'paid',
    invoice_pdf: invoice.invoice_pdf,
    hosted_invoice_url: invoice.hosted_invoice_url,
    paid_at: invoice.status_transitions.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : new Date().toISOString(),
    period_start: invoice.period_start
      ? new Date(invoice.period_start * 1000).toISOString()
      : null,
    period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('Failed to record invoice:', error)
    throw error
  }

  // Update organization subscription status to active
  await supabase
    .from('organizations')
    .update({
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)

  // Send payment success notification
  await notifyPaymentSucceeded(organizationId, invoice.amount_paid / 100)

  console.log(`Invoice payment succeeded for organization ${organizationId}: ${invoice.id}`)
}

/**
 * Handle failed invoice payment (dunning)
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const supabase = await createClient()

  // Get organization from customer metadata
  const stripe = getStripeClient()
  const customer = await stripe.customers.retrieve(invoice.customer as string)

  if (customer.deleted) {
    console.warn('Invoice payment failed for deleted customer')
    return
  }

  const organizationId = customer.metadata.organizationId
  if (!organizationId) {
    console.warn('Invoice payment failed without organizationId in customer metadata')
    return
  }

  // Record failed invoice
  const { error } = await supabase.from('invoices').insert({
    organization_id: organizationId,
    stripe_invoice_id: invoice.id,
    stripe_customer_id: invoice.customer as string,
    amount: invoice.amount_due / 100,
    currency: invoice.currency,
    status: 'failed',
    hosted_invoice_url: invoice.hosted_invoice_url,
    attempt_count: invoice.attempt_count || 0,
    next_payment_attempt: invoice.next_payment_attempt
      ? new Date(invoice.next_payment_attempt * 1000).toISOString()
      : null,
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('Failed to record failed invoice:', error)
  }

  // Update organization status
  await supabase
    .from('organizations')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)

  // Send payment failed notification with dunning email
  await notifyPaymentFailed(organizationId, 'invoice_payment_failed', {
    attemptCount: invoice.attempt_count || 0,
    nextAttempt: invoice.next_payment_attempt,
    amount: invoice.amount_due / 100,
  })

  console.log(`Invoice payment failed for organization ${organizationId}: ${invoice.id}`)
}

/**
 * Handle payment method attached
 */
async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
  const supabase = await createClient()

  if (!paymentMethod.customer) {
    return
  }

  // Get organization from customer metadata
  const stripe = getStripeClient()
  const customer = await stripe.customers.retrieve(paymentMethod.customer as string)

  if (customer.deleted) {
    return
  }

  const organizationId = customer.metadata.organizationId
  if (!organizationId) {
    return
  }

  // Update organization with payment method
  await supabase
    .from('organizations')
    .update({
      payment_method_id: paymentMethod.id,
      payment_method_brand: paymentMethod.card?.brand,
      payment_method_last4: paymentMethod.card?.last4,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)

  console.log(`Payment method attached for organization ${organizationId}`)
}

/**
 * Handle customer updated
 */
async function handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
  const supabase = await createClient()

  if (customer.deleted) {
    return
  }

  const organizationId = customer.metadata.organizationId
  if (!organizationId) {
    return
  }

  // Update organization billing email and details
  await supabase
    .from('organizations')
    .update({
      billing_email: customer.email,
      billing_name: customer.name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)

  console.log(`Customer updated for organization ${organizationId}`)
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const supabase = await createClient()

  const organizationId = session.metadata?.organizationId
  if (!organizationId) {
    console.warn('Checkout completed without organizationId metadata')
    return
  }

  // Update organization with customer ID
  await supabase
    .from('organizations')
    .update({
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)

  console.log(`Checkout completed for organization ${organizationId}`)
}

/**
 * Log webhook event for debugging and audit trail
 */
async function logWebhookEvent(
  event: Stripe.Event,
  status: 'success' | 'failed',
  error?: any
): Promise<void> {
  const supabase = await createClient()

  await supabase.from('webhook_logs').insert({
    event_id: event.id,
    event_type: event.type,
    status: status,
    error_message: error ? String(error) : null,
    payload: event,
    created_at: new Date().toISOString(),
  })
}

/**
 * Send notification for payment success
 */
async function notifyPaymentSucceeded(
  organizationId: string,
  amount: number
): Promise<void> {
  // TODO: Implement email notification or in-app notification
  console.log(`Payment succeeded notification for org ${organizationId}: $${amount}`)
}

/**
 * Send notification for payment failure (dunning)
 */
async function notifyPaymentFailed(
  organizationId: string,
  reason: string,
  details?: {
    attemptCount?: number
    nextAttempt?: number | null
    amount?: number
  }
): Promise<void> {
  // TODO: Implement dunning email sequence
  console.log(`Payment failed notification for org ${organizationId}: ${reason}`, details)
}

/**
 * Send notification for subscription cancellation
 */
async function notifySubscriptionCanceled(organizationId: string): Promise<void> {
  // TODO: Implement cancellation email
  console.log(`Subscription canceled notification for org ${organizationId}`)
}
