import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { logger } from '@/lib/utils/logger'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getStripeClient, isStripeEnabled } from '@/lib/ads/stripe'

export const dynamic = 'force-dynamic'

async function readRawBody(req: NextRequest): Promise<string> {
  const arrayBuffer = await req.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  return buffer.toString('utf8')
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const start = Date.now()

  if (!isStripeEnabled()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const stripe = getStripeClient() as Stripe
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    logger.error('Stripe webhook secret missing')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    const sig = request.headers.get('stripe-signature') || ''
    const rawBody = await readRawBody(request)
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', { error: err })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    const supabase = await createServiceRoleClient()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId = session.customer as string
        const subscriptionId = (session.subscription as string) || null
        const metadata = session.metadata || {}

        // Handle subscription or one-time booking
        if (subscriptionId) {
          // Optional: map Clerk external id to public.users.id if available
          const externalId = (metadata.user_external_id || metadata.user_id) as string | undefined
          let linkedUserId: string | null = null
          if (externalId) {
            const { data: userRow } = await supabase
              .from('users')
              .select('id')
              .eq('external_id', externalId)
              .maybeSingle<{ id: string }>()
            linkedUserId = userRow?.id || null

            // Update user's stripe_customer_id if column exists and we have a match
            if (linkedUserId && customerId) {
              await supabase
                .from('users')
                .update({ stripe_customer_id: customerId })
                .eq('id', linkedUserId)
            }
          }

          // Map plan naming to existing schema (plan_type: basic|professional|enterprise)
          const planRaw = (metadata.plan as string) || 'pro'
          const plan_type =
            planRaw === 'team' ? 'enterprise' : planRaw === 'pro' ? 'professional' : 'professional'

          // Upsert subscription by stripe_subscription_id; user_id may be null if no linkage
          await supabase.from('subscriptions').upsert(
            {
              user_id: linkedUserId,
              plan_type,
              status: 'active',
              stripe_subscription_id: subscriptionId,
              current_period_end: null,
            },
            { onConflict: 'stripe_subscription_id' }
          )
        } else if (metadata && metadata.type === 'ad_booking' && metadata.booking_id) {
          // Mark booking as paid and confirmed
          const bookingId = metadata.booking_id
          await supabase
            .from('ad_bookings')
            .update({ payment_status: 'paid', booking_status: 'confirmed' })
            .eq('id', bookingId)

          // Record billing transaction
          if (metadata.advertiser_id && session.amount_total) {
            await supabase.from('billing_transactions').insert({
              advertiser_id: metadata.advertiser_id,
              booking_id: bookingId,
              transaction_type: 'charge',
              amount: (session.amount_total || 0) / 100,
              status: 'completed',
              description: 'Ad booking payment',
              metadata,
            })
          }
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string
        const customerId = invoice.customer as string
        // Update subscription status and next period end
        const sub = await stripe.subscriptions.retrieve(subscriptionId)
        const periodEnd = sub.current_period_end
        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_end: new Date(periodEnd * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId)
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const status = subscription.status
        const periodEnd = subscription.current_period_end
        await supabase
          .from('subscriptions')
          .update({
            status: mapStripeStatus(status),
            current_period_end: new Date(periodEnd * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)
        break
      }

      default: {
        // No-op for other events; keep for observability
        logger.info('Stripe webhook event received', { type: event.type })
      }
    }

    return NextResponse.json({ received: true, type: event.type, ms: Date.now() - start })
  } catch (error) {
    logger.error('Stripe webhook handler error', { error })
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case 'active':
    case 'trialing':
    case 'past_due':
    case 'canceled':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
      return status
    default:
      return 'active'
  }
}
