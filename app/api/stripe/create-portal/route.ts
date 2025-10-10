import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    })
  : null

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
    }

    // Get user's subscription from database
    const supabase = await createServerClient()
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Create portal session - stripe is guaranteed to be non-null here due to check above
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating portal session:', error)
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
