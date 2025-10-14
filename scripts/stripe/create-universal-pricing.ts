import 'dotenv/config'
import Stripe from 'stripe'

/**
 * Create Universal Pricing for JudgeFinder Platform
 *
 * Creates a single universal access product with two prices:
 * - Monthly: $500.00 USD
 * - Annual: $5,000.00 USD (10 months pricing)
 *
 * Idempotent: Will reuse existing product/prices if found
 */

interface UniversalPricingResult {
  product_id: string
  monthly_price_id: string
  annual_price_id: string
  status: 'created' | 'reused' | 'partial'
}

const UNIVERSAL_PRODUCT_METADATA = {
  domain: 'judgefinder',
  scope: 'universal_access',
  applies_to: 'all_courts_all_judges',
}

const MONTHLY_PRICE_CENTS = 50000 // $500.00
const ANNUAL_PRICE_CENTS = 500000 // $5,000.00

class UniversalPricingManager {
  private readonly stripe: Stripe

  constructor(stripe: Stripe) {
    this.stripe = stripe
  }

  /**
   * Find product by metadata search
   */
  private async findUniversalProduct(): Promise<Stripe.Product | null> {
    try {
      const query = `metadata['domain']:'judgefinder' AND metadata['scope']:'universal_access' AND active:'true'`
      const result = await this.stripe.products.search({
        query,
        limit: 1,
      })

      return result.data[0] || null
    } catch (error) {
      console.warn('Product search failed:', error)
      return null
    }
  }

  /**
   * Find price by lookup key
   */
  private async findPriceByLookupKey(lookupKey: string): Promise<Stripe.Price | null> {
    try {
      const result = await this.stripe.prices.search({
        query: `lookup_key:'${lookupKey}' AND active:'true'`,
        limit: 1,
      })

      return result.data[0] || null
    } catch (error) {
      console.warn(`Price search failed for ${lookupKey}:`, error)
      return null
    }
  }

  /**
   * Create universal product (idempotent)
   */
  private async ensureProduct(): Promise<Stripe.Product> {
    const existing = await this.findUniversalProduct()

    if (existing) {
      console.log(`✓ Reusing existing product: ${existing.id}`)
      return existing
    }

    console.log('Creating new universal access product...')
    const product = await this.stripe.products.create({
      name: 'JudgeFinder Universal Access',
      description:
        'Unified access to all courts and judges on the JudgeFinder platform. Premium placement with full analytics and priority support.',
      metadata: UNIVERSAL_PRODUCT_METADATA,
      statement_descriptor: 'JUDGEFINDER',
      tax_code: 'txcd_10000000', // Software as a Service
      unit_label: 'subscription',
      active: true,
      type: 'service',
    })

    console.log(`✓ Created product: ${product.id}`)
    return product
  }

  /**
   * Create monthly price (idempotent)
   */
  private async ensureMonthlyPrice(productId: string): Promise<Stripe.Price> {
    const lookupKey = 'universal_access_monthly'
    const existing = await this.findPriceByLookupKey(lookupKey)

    if (existing) {
      console.log(`✓ Reusing existing monthly price: ${existing.id}`)
      return existing
    }

    console.log('Creating monthly price...')
    const price = await this.stripe.prices.create({
      product: productId,
      currency: 'usd',
      unit_amount: MONTHLY_PRICE_CENTS,
      recurring: {
        interval: 'month',
      },
      lookup_key: lookupKey,
      nickname: 'Universal Access — Monthly',
      metadata: {
        billing_cycle: 'monthly',
        ...UNIVERSAL_PRODUCT_METADATA,
      },
      billing_scheme: 'per_unit',
      tax_behavior: 'exclusive',
    })

    console.log(`✓ Created monthly price: ${price.id} ($500/mo)`)
    return price
  }

  /**
   * Create annual price (idempotent)
   */
  private async ensureAnnualPrice(productId: string): Promise<Stripe.Price> {
    const lookupKey = 'universal_access_annual'
    const existing = await this.findPriceByLookupKey(lookupKey)

    if (existing) {
      console.log(`✓ Reusing existing annual price: ${existing.id}`)
      return existing
    }

    console.log('Creating annual price...')
    const price = await this.stripe.prices.create({
      product: productId,
      currency: 'usd',
      unit_amount: ANNUAL_PRICE_CENTS,
      recurring: {
        interval: 'year',
      },
      lookup_key: lookupKey,
      nickname: 'Universal Access — Annual (Save $1,000)',
      metadata: {
        billing_cycle: 'annual',
        discount_policy: '10x_monthly',
        savings_usd: '1000',
        ...UNIVERSAL_PRODUCT_METADATA,
      },
      billing_scheme: 'per_unit',
      tax_behavior: 'exclusive',
    })

    console.log(`✓ Created annual price: ${price.id} ($5,000/yr)`)
    return price
  }

  /**
   * Main execution: Ensure product and prices exist
   */
  public async execute(): Promise<UniversalPricingResult> {
    console.log('=== Phase 2: Stripe Universal Pricing Creation ===\n')

    const product = await this.ensureProduct()
    const monthlyPrice = await this.ensureMonthlyPrice(product.id)
    const annualPrice = await this.ensureAnnualPrice(product.id)

    const result: UniversalPricingResult = {
      product_id: product.id,
      monthly_price_id: monthlyPrice.id,
      annual_price_id: annualPrice.id,
      status: 'created',
    }

    console.log('\n✅ Phase 2 Complete - Stripe artifacts created\n')
    console.log('Summary:')
    console.log(`  Product ID: ${result.product_id}`)
    console.log(`  Monthly Price ID: ${result.monthly_price_id}`)
    console.log(`  Annual Price ID: ${result.annual_price_id}`)
    console.log(`  Status: ${result.status}\n`)

    return result
  }
}

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey || !secretKey.startsWith('sk_')) {
    console.error('❌ ERROR: Missing or invalid STRIPE_SECRET_KEY environment variable')
    console.error('Expected format: sk_test_... or sk_live_...')
    process.exit(1)
  }

  console.log(`Using Stripe key: ${secretKey.substring(0, 12)}...`)
  console.log(`Mode: ${secretKey.startsWith('sk_test') ? 'TEST' : 'LIVE'}\n`)

  const stripe = new Stripe(secretKey, {
    apiVersion: '2023-10-16',
    typescript: true,
    appInfo: { name: 'JudgeFinder Universal Pricing Setup' },
  })

  const manager = new UniversalPricingManager(stripe)
  const result = await manager.execute()

  // Output JSON for downstream automation
  console.log('=== JSON Output (for automation) ===')
  console.log(JSON.stringify(result, null, 2))

  process.exit(0)
}

// Execute
void main().catch((error) => {
  console.error('❌ FATAL ERROR:', error)
  process.exit(1)
})
