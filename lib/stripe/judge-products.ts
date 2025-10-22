import Stripe from 'stripe'
import { getStripeClient } from './client'
import { createClient } from '@/lib/supabase/server'

/**
 * Judge-Specific Stripe Products and Prices
 *
 * Creates and manages Stripe Products for individual judge ad spots
 * Each judge gets unique products with court-level based pricing:
 * - Federal judges: $500/month or $5,000/year
 * - State judges: $500/month or $5,000/year
 */

export interface JudgeAdProductParams {
  judgeId: string
  judgeName: string
  courtName: string
  courtLevel: 'federal' | 'state'
  position: 1 | 2 | 3 // Rotation slot number
}

export interface JudgeAdPriceInfo {
  productId: string
  monthlyPriceId: string
  annualPriceId: string
  monthlyAmount: number
  annualAmount: number
}

// Pricing structure based on court level
const PRICING = {
  federal: {
    monthly: 50000, // $500.00 in cents
    annual: 500000, // $5,000.00 in cents (2 months free)
  },
  state: {
    monthly: 50000, // $500.00 in cents
    annual: 500000, // $5,000.00 in cents (2 months free)
  },
} as const

/**
 * Get or create Stripe Product and Prices for a judge's ad spot
 * Caches product/price IDs in Supabase to avoid recreating
 */
export async function getOrCreateJudgeAdProduct(
  params: JudgeAdProductParams
): Promise<JudgeAdPriceInfo> {
  const stripe = getStripeClient()
  const supabase = await createClient()

  // Check if we already have product/price IDs cached in database
  const { data: existing } = await supabase
    .from('judge_ad_products')
    .select('*')
    .eq('judge_id', params.judgeId)
    .eq('position', params.position)
    .maybeSingle()

  if (existing) {
    return {
      productId: existing.stripe_product_id,
      monthlyPriceId: existing.stripe_monthly_price_id,
      annualPriceId: existing.stripe_annual_price_id,
      monthlyAmount: PRICING[params.courtLevel].monthly / 100,
      annualAmount: PRICING[params.courtLevel].annual / 100,
    }
  }

  // Create new Stripe Product
  const product = await stripe.products.create({
    name: `Ad Spot for Judge ${params.judgeName}`,
    description: `Premium advertising placement on Judge ${params.judgeName}'s profile at ${params.courtName} (Rotation Slot ${params.position})`,
    metadata: {
      judge_id: params.judgeId,
      judge_name: params.judgeName,
      court_name: params.courtName,
      court_level: params.courtLevel,
      position: params.position.toString(),
      product_type: 'judge_ad_spot',
    },
  })

  // Create monthly price
  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: PRICING[params.courtLevel].monthly,
    currency: 'usd',
    recurring: {
      interval: 'month',
      interval_count: 1,
    },
    metadata: {
      judge_id: params.judgeId,
      court_level: params.courtLevel,
      billing_interval: 'monthly',
    },
  })

  // Create annual price (2 months free - 10 months at monthly rate)
  const annualPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: PRICING[params.courtLevel].annual,
    currency: 'usd',
    recurring: {
      interval: 'year',
      interval_count: 1,
    },
    metadata: {
      judge_id: params.judgeId,
      court_level: params.courtLevel,
      billing_interval: 'annual',
    },
  })

  // Cache in database for future lookups
  await supabase.from('judge_ad_products').insert({
    judge_id: params.judgeId,
    position: params.position,
    stripe_product_id: product.id,
    stripe_monthly_price_id: monthlyPrice.id,
    stripe_annual_price_id: annualPrice.id,
    court_level: params.courtLevel,
    created_at: new Date().toISOString(),
  })

  return {
    productId: product.id,
    monthlyPriceId: monthlyPrice.id,
    annualPriceId: annualPrice.id,
    monthlyAmount: PRICING[params.courtLevel].monthly / 100,
    annualAmount: PRICING[params.courtLevel].annual / 100,
  }
}

/**
 * Get pricing information without creating product
 * Used for displaying prices before checkout
 */
export function getJudgePricing(courtLevel: 'federal' | 'state'): {
  monthly: number
  annual: number
  monthlySavings: number
} {
  const monthly = PRICING[courtLevel].monthly / 100
  const annual = PRICING[courtLevel].annual / 100
  const monthlySavings = monthly * 12 - annual

  return {
    monthly,
    annual,
    monthlySavings,
  }
}

/**
 * Update product metadata when judge information changes
 */
export async function updateJudgeProductMetadata(params: {
  judgeId: string
  judgeName: string
  courtName: string
}): Promise<void> {
  const stripe = getStripeClient()
  const supabase = await createClient()

  // Get all products for this judge
  const { data: products } = await supabase
    .from('judge_ad_products')
    .select('stripe_product_id')
    .eq('judge_id', params.judgeId)

  if (!products || products.length === 0) {
    return
  }

  // Update each product's metadata
  for (const prod of products) {
    await stripe.products.update(prod.stripe_product_id, {
      name: `Ad Spot for Judge ${params.judgeName}`,
      description: `Premium advertising placement on Judge ${params.judgeName}'s profile at ${params.courtName}`,
      metadata: {
        judge_name: params.judgeName,
        court_name: params.courtName,
      },
    })
  }
}

/**
 * Archive products when judge retires or is no longer accepting ads
 */
export async function archiveJudgeProducts(judgeId: string): Promise<void> {
  const stripe = getStripeClient()
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('judge_ad_products')
    .select('stripe_product_id')
    .eq('judge_id', judgeId)

  if (!products || products.length === 0) {
    return
  }

  // Archive each product in Stripe
  for (const prod of products) {
    await stripe.products.update(prod.stripe_product_id, {
      active: false,
    })
  }

  // Mark as archived in database
  await supabase
    .from('judge_ad_products')
    .update({ archived_at: new Date().toISOString() })
    .eq('judge_id', judgeId)
}
