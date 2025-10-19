import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { verifyWebhookSignature, getStripeClient } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

/**
 * Stripe Webhook Handler for Ad Subscriptions
 *
 * Handles subscription lifecycle events for judge-specific ad bookings:
 * - subscription.created → Create booking record
 * - subscription.updated → Update booking status
 * - subscription.deleted → Mark as canceled
 * - invoice.payment_succeeded → Activate ad spot
 * - invoice.payment_failed → Pause ad spot
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      logger.error('Webhook signature missing')
      return NextResponse.json({ error: 'No signature provided' }, { status: 400 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = verifyWebhookSignature(body, signature)
    } catch (err) {
      logger.error(
        'Webhook signature verification failed',
        {},
        err instanceof Error ? err : undefined
      )
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    logger.info(`Processing webhook event: ${event.type}`, { eventId: event.id })

    // Route to appropriate handler
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

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

      default:
        logger.info(`Unhandled webhook event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('Webhook processing failed', {}, error instanceof Error ? error : undefined)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

/**
 * Handle checkout.session.completed event
 * Links advertiser to the subscription being created
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const supabase = await createClient()

  // Only process if this is for a judge-profile ad
  if (session.metadata?.ad_type !== 'judge-profile') {
    return
  }

  logger.info('Checkout session completed for judge ad', {
    sessionId: session.id,
    judgeId: session.metadata.judge_id,
    judgeName: session.metadata.judge_name,
  })

  // Store session info for linking to subscription when it's created
  // We'll use the customer_id to match them up
  await supabase.from('checkout_sessions').insert({
    stripe_session_id: session.id,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: session.subscription as string,
    metadata: session.metadata,
    created_at: new Date().toISOString(),
  })
}

/**
 * Handle customer.subscription.created event
 * Creates the ad_spot_booking record
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  const supabase = await createClient()

  // Only process if this is for a judge-profile ad
  if (subscription.metadata?.ad_type !== 'judge-profile') {
    return
  }

  const { judge_id, judge_name, court_name, court_level, ad_position } = subscription.metadata

  if (!judge_id || !court_level) {
    logger.error('Subscription created without required judge metadata', {
      subscriptionId: subscription.id,
      metadata: subscription.metadata,
    })
    return
  }

  // Get pricing from subscription
  const seatItem = subscription.items.data.find(
    (item) => item.price.recurring?.usage_type === 'licensed'
  )

  if (!seatItem || !seatItem.price.unit_amount) {
    logger.error('No valid subscription item found', { subscriptionId: subscription.id })
    return
  }

  const monthlyPrice = seatItem.price.unit_amount / 100
  const billingInterval = seatItem.price.recurring?.interval || 'month'

  // Get advertiser_id from customer metadata (set during checkout)
  const stripe = getStripeClient()
  const customer = await stripe.customers.retrieve(subscription.customer as string)

  let advertiserId: string | null = null
  if (!customer.deleted && customer.metadata?.clerk_user_id) {
    // Find advertiser profile by user_id
    const { data: advertiserProfile } = await supabase
      .from('advertiser_profiles')
      .select('id')
      .eq('user_id', customer.metadata.clerk_user_id)
      .maybeSingle()

    advertiserId = advertiserProfile?.id || null
  }

  // Create booking record
  const { error } = await supabase.from('ad_spot_bookings').insert({
    judge_id,
    advertiser_id: advertiserId,
    stripe_subscription_id: subscription.id,
    stripe_product_id: seatItem.price.product as string,
    stripe_customer_id: subscription.customer as string,
    position: parseInt(ad_position || '1'),
    court_level: court_level as 'federal' | 'state',
    billing_interval: billingInterval === 'year' ? 'annual' : 'monthly',
    monthly_price: monthlyPrice,
    status: subscription.status,
    start_date: new Date(subscription.start_date * 1000).toISOString(),
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    metadata: {
      judge_name,
      court_name,
    },
  })

  if (error) {
    logger.error('Failed to create ad spot booking', { subscriptionId: subscription.id }, error)
    throw error
  }

  logger.info('Ad spot booking created', {
    subscriptionId: subscription.id,
    judgeId: judge_id,
    position: ad_position,
    price: monthlyPrice,
  })
}

/**
 * Handle customer.subscription.updated event
 * Updates booking status and billing details
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const supabase = await createClient()

  // Only process if this is for a judge-profile ad
  if (subscription.metadata?.ad_type !== 'judge-profile') {
    return
  }

  const updates: any = {
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }

  // If subscription was canceled, record when
  if (subscription.status === 'canceled' && !subscription.cancel_at_period_end) {
    updates.canceled_at = new Date().toISOString()
    updates.end_date = new Date().toISOString()
  }

  const { error } = await supabase
    .from('ad_spot_bookings')
    .update(updates)
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    logger.error('Failed to update ad spot booking', { subscriptionId: subscription.id }, error)
    throw error
  }

  logger.info('Ad spot booking updated', {
    subscriptionId: subscription.id,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  })
}

/**
 * Handle customer.subscription.deleted event
 * Marks booking as canceled and frees up the ad slot
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const supabase = await createClient()

  // Only process if this is for a judge-profile ad
  if (subscription.metadata?.ad_type !== 'judge-profile') {
    return
  }

  const { error } = await supabase
    .from('ad_spot_bookings')
    .update({
      status: 'canceled',
      end_date: new Date().toISOString(),
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    logger.error(
      'Failed to mark ad spot booking as canceled',
      { subscriptionId: subscription.id },
      error
    )
    throw error
  }

  logger.info('Ad spot booking canceled', {
    subscriptionId: subscription.id,
    judgeId: subscription.metadata.judge_id,
  })
}

/**
 * Handle invoice.payment_succeeded event
 * Ensures booking is active and updates period dates
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const supabase = await createClient()

  if (!invoice.subscription) {
    return
  }

  // Get subscription to check metadata
  const stripe = getStripeClient()
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)

  if (subscription.metadata?.ad_type !== 'judge-profile') {
    return
  }

  // Update booking to active status
  const { error } = await supabase
    .from('ad_spot_bookings')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    logger.error('Failed to activate ad spot booking', { subscriptionId: subscription.id }, error)
  } else {
    logger.info('Ad spot booking activated after payment', {
      subscriptionId: subscription.id,
      invoiceId: invoice.id,
      amount: invoice.amount_paid / 100,
    })
  }
}

/**
 * Handle invoice.payment_failed event
 * Marks booking as past_due and may pause ad display
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const supabase = await createClient()

  if (!invoice.subscription) {
    return
  }

  // Get subscription to check metadata
  const stripe = getStripeClient()
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)

  if (subscription.metadata?.ad_type !== 'judge-profile') {
    return
  }

  // Update booking to past_due status
  const { error } = await supabase
    .from('ad_spot_bookings')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    logger.error(
      'Failed to mark ad spot booking as past_due',
      { subscriptionId: subscription.id },
      error
    )
  } else {
    logger.warn('Ad spot booking marked as past_due', {
      subscriptionId: subscription.id,
      invoiceId: invoice.id,
      attemptCount: invoice.attempt_count,
    })

    // TODO: Send email notification to advertiser about failed payment
  }
}
