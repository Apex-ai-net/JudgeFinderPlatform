import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { verifyWebhookSignature } from '@/lib/stripe/client'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Stripe Webhook Handler for Subscription Billing
 *
 * POST /api/webhooks/stripe
 *
 * Handles subscription lifecycle events for JudgeFinder.io billing system
 *
 * Webhook Setup Instructions:
 * 1. Go to Stripe Dashboard → Developers → Webhooks
 * 2. Add endpoint: https://judgefinder.io/api/webhooks/stripe
 * 3. Select events:
 *    - customer.subscription.created
 *    - customer.subscription.updated
 *    - customer.subscription.deleted
 *    - invoice.payment_succeeded
 *    - invoice.payment_failed
 * 4. Copy webhook signing secret to STRIPE_WEBHOOK_SECRET environment variable
 *
 * Environment Variables Required:
 * - STRIPE_WEBHOOK_SECRET: Webhook signing secret from Stripe Dashboard
 * - SUPABASE_SERVICE_ROLE_KEY: For database writes
 *
 * Returns:
 * - 200: Event processed successfully
 * - 400: Invalid signature or malformed request
 * - 500: Internal processing error
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    // Step 1: Extract and validate webhook signature
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      logger.error('Stripe webhook missing signature header', {
        source: 'stripe_webhook',
        headers: Object.fromEntries(request.headers.entries()),
      })
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    // Step 2: Verify webhook signature and construct event
    let event: Stripe.Event
    try {
      event = verifyWebhookSignature(body, signature)
      logger.info('Stripe webhook signature verified', {
        event_type: event.type,
        event_id: event.id,
        livemode: event.livemode,
      })
    } catch (error) {
      logger.error(
        'Stripe webhook signature verification failed',
        {
          source: 'stripe_webhook',
          signature_present: !!signature,
        },
        error instanceof Error ? error : undefined
      )
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Step 3: Route to appropriate event handler
    const result = await handleWebhookEvent(event)

    const duration = Date.now() - startTime
    logger.info('Stripe webhook processed successfully', {
      event_type: event.type,
      event_id: event.id,
      duration_ms: duration,
      result_status: result.status,
    })

    return NextResponse.json(
      {
        received: true,
        event_type: event.type,
        event_id: event.id,
        processed: result.status === 'success',
      },
      { status: 200 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error(
      'Stripe webhook processing error',
      {
        source: 'stripe_webhook',
        duration_ms: duration,
      },
      error instanceof Error ? error : undefined
    )

    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Route webhook event to appropriate handler
 */
async function handleWebhookEvent(
  event: Stripe.Event
): Promise<{ status: 'success' | 'error'; message?: string }> {
  switch (event.type) {
    case 'customer.subscription.created':
      return await handleSubscriptionCreated(event.data.object as Stripe.Subscription)

    case 'customer.subscription.updated':
      return await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)

    case 'customer.subscription.deleted':
      return await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)

    case 'invoice.payment_succeeded':
      return await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)

    case 'invoice.payment_failed':
      return await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)

    default:
      logger.info('Unhandled webhook event type', {
        event_type: event.type,
        event_id: event.id,
      })
      return { status: 'success', message: 'Event type not handled' }
  }
}

/**
 * Handle customer.subscription.created event
 */
async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<{ status: 'success' | 'error'; message?: string }> {
  try {
    const supabase = await createServiceRoleClient()
    const subscriptionData = buildSubscriptionData(subscription)

    logger.info('Subscription created', {
      subscription_id: subscription.id,
      customer_id: subscriptionData.stripe_customer_id,
      status: subscription.status,
    })

    await upsertSubscription(supabase, subscriptionData, 'insert')
    return { status: 'success' }
  } catch (error) {
    logger.error(
      'Failed to process subscription.created',
      { subscription_id: subscription.id },
      error instanceof Error ? error : undefined
    )
    return { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<{ status: 'success' | 'error'; message?: string }> {
  try {
    const supabase = await createServiceRoleClient()
    const subscriptionData = buildSubscriptionData(subscription)

    logger.info('Subscription updated', {
      subscription_id: subscription.id,
      status: subscription.status,
    })
    await upsertSubscription(supabase, subscriptionData, 'update')
    return { status: 'success' }
  } catch (error) {
    logger.error(
      'Failed to process subscription.updated',
      { subscription_id: subscription.id },
      error instanceof Error ? error : undefined
    )
    return { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<{ status: 'success' | 'error'; message?: string }> {
  try {
    const supabase = await createServiceRoleClient()
    const deleteData = {
      status: 'canceled',
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : new Date().toISOString(),
      ended_at: subscription.ended_at
        ? new Date(subscription.ended_at * 1000).toISOString()
        : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    logger.info('Subscription deleted', { subscription_id: subscription.id })
    await updateSubscriptionRecord(supabase, subscription.id, deleteData)
    return { status: 'success' }
  } catch (error) {
    logger.error(
      'Failed to process subscription.deleted',
      { subscription_id: subscription.id },
      error instanceof Error ? error : undefined
    )
    return { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Handle invoice.payment_succeeded event
 */
async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<{ status: 'success' | 'error'; message?: string }> {
  try {
    const supabase = await createServiceRoleClient()
    const subscriptionId =
      typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id

    logger.info('Invoice payment succeeded', {
      invoice_id: invoice.id,
      subscription_id: subscriptionId,
      amount: invoice.amount_paid,
    })

    if (subscriptionId) {
      await updateSubscriptionRecord(supabase, subscriptionId, {
        status: 'active',
        updated_at: new Date().toISOString(),
      })
    }

    return { status: 'success' }
  } catch (error) {
    logger.error(
      'Failed to process invoice.payment_succeeded',
      { invoice_id: invoice.id },
      error instanceof Error ? error : undefined
    )
    return { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<{ status: 'success' | 'error'; message?: string }> {
  try {
    const supabase = await createServiceRoleClient()
    const subscriptionId =
      typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id

    logger.warn('Invoice payment failed', {
      invoice_id: invoice.id,
      subscription_id: subscriptionId,
      amount_due: invoice.amount_due,
      attempt_count: invoice.attempt_count,
    })

    if (subscriptionId) {
      await updateSubscriptionRecord(supabase, subscriptionId, {
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
    }

    return { status: 'success' }
  } catch (error) {
    logger.error(
      'Failed to process invoice.payment_failed',
      { invoice_id: invoice.id },
      error instanceof Error ? error : undefined
    )
    return { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Helper functions
function buildSubscriptionData(subscription: Stripe.Subscription) {
  return {
    stripe_subscription_id: subscription.id,
    stripe_customer_id:
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    cancel_at: subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000).toISOString()
      : null,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
    trial_start: subscription.trial_start
      ? new Date(subscription.trial_start * 1000).toISOString()
      : null,
    trial_end: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    metadata: subscription.metadata || {},
    created_at: new Date(subscription.created * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }
}

async function upsertSubscription(supabase: any, data: any, operation: 'insert' | 'update') {
  try {
    if (operation === 'insert') {
      const { error } = await supabase.from('subscriptions').insert(data)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('subscriptions')
        .update(data)
        .eq('stripe_subscription_id', data.stripe_subscription_id)
      if (error) throw error
    }
  } catch (error) {
    logger.warn(`Database ${operation} failed - logging subscription data`, {
      subscription_id: data.stripe_subscription_id,
      data,
    })
  }
}

async function updateSubscriptionRecord(supabase: any, subscriptionId: string, updateData: any) {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('stripe_subscription_id', subscriptionId)
    if (error) throw error
  } catch (error) {
    logger.warn('Database update failed', {
      subscription_id: subscriptionId,
      update_data: updateData,
    })
  }
}
