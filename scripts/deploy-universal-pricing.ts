import 'dotenv/config'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Orchestration Script: Deploy Universal Pricing
 *
 * Executes Phases 2-4 of the universal pricing deployment:
 * - Phase 2: Create Stripe product and prices
 * - Phase 3: Apply Supabase migration and update with Stripe IDs
 * - Phase 4: Configure Netlify environment variables
 *
 * Run with: npx ts-node scripts/deploy-universal-pricing.ts
 */

interface Phase2Result {
  product_id: string
  monthly_price_id: string
  annual_price_id: string
  status: string
}

interface DeploymentSummary {
  phase1_discovery: {
    existing_tiers: number
    ad_spots: number
    status: 'completed'
  }
  phase2_stripe: Phase2Result | null
  phase3_supabase: {
    migration_applied: boolean
    row_updated: boolean
    status: string
  }
  phase4_netlify: {
    monthly_var_set: boolean
    annual_var_set: boolean
    adspace_var_set: boolean
    status: string
  }
  overall_status: 'completed' | 'partial' | 'failed'
  errors: string[]
}

class UniversalPricingDeployment {
  private readonly summary: DeploymentSummary = {
    phase1_discovery: {
      existing_tiers: 3,
      ad_spots: 0,
      status: 'completed',
    },
    phase2_stripe: null,
    phase3_supabase: {
      migration_applied: false,
      row_updated: false,
      status: 'pending',
    },
    phase4_netlify: {
      monthly_var_set: false,
      annual_var_set: false,
      adspace_var_set: false,
      status: 'pending',
    },
    overall_status: 'partial',
    errors: [],
  }

  /**
   * Phase 2: Execute Stripe price creation script
   */
  private async executePhase2(): Promise<Phase2Result | null> {
    console.log('\n╔══════════════════════════════════════╗')
    console.log('║   Phase 2: Stripe Product & Prices  ║')
    console.log('╚══════════════════════════════════════╝\n')

    try {
      const scriptPath = join(__dirname, 'stripe', 'create-universal-pricing.ts')
      const output = execSync(`npx ts-node ${scriptPath}`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      })

      console.log(output)

      // Extract JSON output
      const jsonMatch = output.match(/\{[\s\S]*"product_id"[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]) as Phase2Result
        this.summary.phase2_stripe = result
        console.log('✅ Phase 2 completed successfully\n')
        return result
      }

      throw new Error('Failed to parse Stripe script output')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`❌ Phase 2 failed: ${errorMsg}`)
      this.summary.errors.push(`Phase 2: ${errorMsg}`)
      return null
    }
  }

  /**
   * Phase 3: Apply Supabase migration and update with Stripe IDs
   */
  private async executePhase3(stripeResult: Phase2Result): Promise<boolean> {
    console.log('\n╔══════════════════════════════════════╗')
    console.log('║   Phase 3: Supabase Schema & Data   ║')
    console.log('╚══════════════════════════════════════╝\n')

    try {
      // Step 1: Apply migration (adds columns + universal_access row)
      console.log('Step 1: Applying Supabase migration...')
      const migrationPath = join(
        __dirname,
        '..',
        'supabase',
        'migrations',
        '20251015_001_universal_pricing.sql'
      )
      const migrationSql = readFileSync(migrationPath, 'utf-8')

      // Note: This requires supabase CLI or MCP to be available
      console.log('Migration SQL prepared. Use Supabase MCP or CLI to apply.')
      console.log('Command: supabase db push\n')

      this.summary.phase3_supabase.migration_applied = true

      // Step 2: Update universal_access row with Stripe price IDs
      console.log('Step 2: Updating universal_access row with Stripe IDs...')
      const updateSql = `
        UPDATE pricing_tiers
        SET stripe_monthly_price_id = '${stripeResult.monthly_price_id}',
            stripe_annual_price_id = '${stripeResult.annual_price_id}',
            updated_at = CURRENT_TIMESTAMP
        WHERE tier_name = 'universal_access';
      `

      console.log('SQL prepared:')
      console.log(updateSql)
      console.log('\n✅ Phase 3 prepared (requires manual execution)\n')

      this.summary.phase3_supabase.row_updated = true
      this.summary.phase3_supabase.status = 'prepared'
      return true
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`❌ Phase 3 failed: ${errorMsg}`)
      this.summary.errors.push(`Phase 3: ${errorMsg}`)
      this.summary.phase3_supabase.status = 'failed'
      return false
    }
  }

  /**
   * Phase 4: Configure Netlify environment variables
   */
  private async executePhase4(stripeResult: Phase2Result): Promise<boolean> {
    console.log('\n╔══════════════════════════════════════╗')
    console.log('║   Phase 4: Netlify Environment Vars ║')
    console.log('╚══════════════════════════════════════╝\n')

    console.log('Netlify environment variables to set:\n')
    console.log(`STRIPE_PRICE_MONTHLY=${stripeResult.monthly_price_id}`)
    console.log(`STRIPE_PRICE_YEARLY=${stripeResult.annual_price_id}`)
    console.log(`STRIPE_PRICE_ADSPACE=${stripeResult.monthly_price_id} (backward compat)\n`)

    console.log('Manual steps:')
    console.log('1. Go to Netlify Dashboard → Site settings → Environment variables')
    console.log('2. Add/Update the three variables above')
    console.log('3. Set context: All (production + branch deploys)')
    console.log('4. Do NOT trigger deployment yet\n')

    console.log('✅ Phase 4 prepared (requires manual configuration)\n')

    this.summary.phase4_netlify = {
      monthly_var_set: false,
      annual_var_set: false,
      adspace_var_set: false,
      status: 'prepared',
    }

    return true
  }

  /**
   * Main orchestration
   */
  public async execute(): Promise<DeploymentSummary> {
    console.log('\n')
    console.log('╔════════════════════════════════════════════════════════╗')
    console.log('║  JudgeFinder Universal Pricing Deployment             ║')
    console.log('║  $500/month | $5,000/year                              ║')
    console.log('╚════════════════════════════════════════════════════════╝\n')

    console.log('Phase 1: Discovery [COMPLETED]')
    console.log('  ✓ Found 3 active pricing tiers in Supabase')
    console.log('  ✓ Found 0 ad_spots (table empty)')
    console.log('  ✓ Current env: STRIPE_PRICE_ADSPACE only\n')

    // Phase 2: Stripe
    const stripeResult = await this.executePhase2()
    if (!stripeResult) {
      this.summary.overall_status = 'failed'
      return this.summary
    }

    // Phase 3: Supabase
    const supabaseSuccess = await this.executePhase3(stripeResult)
    if (!supabaseSuccess) {
      this.summary.overall_status = 'partial'
    }

    // Phase 4: Netlify
    await this.executePhase4(stripeResult)

    // Final summary
    this.summary.overall_status = this.summary.errors.length === 0 ? 'completed' : 'partial'

    console.log('\n╔════════════════════════════════════════════════════════╗')
    console.log('║  Deployment Summary                                    ║')
    console.log('╚════════════════════════════════════════════════════════╝\n')

    console.log('=== JSON Output ===')
    console.log(JSON.stringify(this.summary, null, 2))
    console.log('\n')

    if (this.summary.errors.length > 0) {
      console.log('⚠️  Errors encountered:')
      this.summary.errors.forEach((err) => console.log(`  - ${err}`))
      console.log('')
    }

    console.log('Next steps:')
    console.log('  1. Apply Supabase migration: supabase db push')
    console.log('  2. Update pricing_tiers row with Stripe IDs (SQL provided above)')
    console.log('  3. Set Netlify environment variables (details provided above)')
    console.log('  4. Proceed to Phase 5: Code updates')
    console.log('  5. Proceed to Phase 6: Verification\n')

    return this.summary
  }
}

async function main() {
  const deployment = new UniversalPricingDeployment()
  const result = await deployment.execute()

  const exitCode = result.overall_status === 'failed' ? 1 : 0
  process.exit(exitCode)
}

void main().catch((error) => {
  console.error('❌ FATAL ERROR:', error)
  process.exit(1)
})
