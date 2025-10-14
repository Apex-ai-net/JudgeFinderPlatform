import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/stripe/client'
import { createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events
 *
 * Webhook setup instructions:
 * 1. Go to Stripe Dashboard → Developers → Webhooks
 * 2. Add endpoint: https://your-domain.com/api/stripe/webhook
 * 3. Select events: checkout.session.completed
 * 4. Copy webhook signing secret to STRIPE_WEBHOOK_SECRET env var
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get raw body (required for signature verification)
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      logger.error('Missing Stripe signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // Verify webhook signature
    let event
    try {
      event = verifyWebhookSignature(body, signature)
    } catch (error) {
      logger.error(
        'Webhook signature verification failed',
        {},
        error instanceof Error ? error : undefined
      )
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    logger.info('Webhook received', {
      event_type: event.type,
      event_id: event.id,
    })

    // Handle specific event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object

        // Extract metadata
        const metadata = session.metadata || {}
        const { organization_name, ad_type, notes, client_ip, created_at } = metadata

        // Extract customer email from session
        const customer_email = session.customer_details?.email || session.customer_email

        // Create order record in database
        const supabase = await createServerClient()

        const { data: order, error: orderError } = await supabase
          .from('ad_orders')
          .insert({
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent as string,
            organization_name,
            customer_email,
            ad_type,
            notes,
            status: 'paid',
            amount_total: session.amount_total,
            currency: session.currency,
            payment_status: session.payment_status,
            client_ip,
            metadata: {
              created_at,
              checkout_completed_at: new Date().toISOString(),
              stripe_customer: session.customer,
            },
          })
          .select()
          .single()

        if (orderError) {
          logger.error('Failed to create order record', {
            session_id: session.id,
            error: orderError.message,
          })
          // Don't return error - we don't want to tell Stripe the webhook failed
          // The payment succeeded, we just couldn't record it
        } else {
          logger.info('Order created successfully', {
            order_id: order.id,
            organization_name,
            ad_type,
            amount: session.amount_total,
          })

          // Optional: Send confirmation email, update ad slots, etc.
          // await sendOrderConfirmationEmail(order)
        }

        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object
        logger.info('Checkout session expired', {
          session_id: session.id,
        })
        break
      }

      default:
        logger.info('Unhandled webhook event type', {
          event_type: event.type,
        })
    }

    // Return 200 to acknowledge receipt
    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('Webhook processing error', {}, error instanceof Error ? error : undefined)

    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
