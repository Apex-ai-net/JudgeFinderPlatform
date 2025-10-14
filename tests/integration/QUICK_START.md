# Stripe Integration Tests - Quick Start Guide

## Run Tests in 5 Minutes

### Step 1: Start Supabase (Local)

```bash
# Install Supabase CLI (one time)
brew install supabase/tap/supabase

# Start Supabase
supabase start

# Note the service_role key from output
```

### Step 2: Set Environment Variables

```bash
# Copy from supabase start output
export NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# These can be dummy values (tests mock Stripe)
export STRIPE_SECRET_KEY="sk_test_123"
export STRIPE_WEBHOOK_SECRET="whsec_test_123"
export STRIPE_PRICE_ADSPACE="price_test_123"
```

### Step 3: Run Migration

```bash
supabase db reset
```

### Step 4: Run Tests

```bash
npm run test:integration -- tests/integration/stripe-flow.test.ts
```

## Expected Output

```
✓ tests/integration/stripe-flow.test.ts (19 tests) 2.5s
  ✓ Scenario 1: Complete Ad Purchase Flow (Happy Path) (3)
  ✓ Scenario 2: Invalid Email Format (2)
  ✓ Scenario 3: Rate Limiting (1)
  ✓ Scenario 4: Webhook Signature Verification (2)
  ✓ Scenario 5: Duplicate Webhook Handling (1)
  ✓ Scenario 6: Missing Required Fields (3)
  ✓ Scenario 7: Invalid Ad Type (1)
  ✓ Scenario 8: Stripe Configuration (1)
  ✓ Scenario 9: Database RLS Policies (1)
  ✓ Scenario 10: Webhook Event Types (2)
  ✓ Scenario 11: Checkout Session Metadata (2)

Test Files  1 passed (1)
     Tests  19 passed (19)
  Start at  19:30:00
  Duration  2.5s
```

## Common Commands

```bash
# Watch mode (re-run on file changes)
npm run test:watch -- tests/integration/stripe-flow.test.ts

# Coverage report
npm run test:coverage -- tests/integration/stripe-flow.test.ts

# Run specific test
npm run test:integration -- -t "judge-profile"

# Verbose output
npm run test:integration -- tests/integration/stripe-flow.test.ts --reporter=verbose
```

## Troubleshooting

### Tests Skipped?

```bash
# Check database connection
supabase status

# Verify environment variables
echo $SUPABASE_SERVICE_ROLE_KEY

# Reset database
supabase db reset
```

### Connection Errors?

```bash
# Restart Supabase
supabase stop
supabase start

# Check logs
supabase logs
```

### Migration Errors?

```bash
# Manual migration
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/migrations/20251013_001_ad_orders_table.sql
```

## Cloud Supabase Alternative

If using cloud Supabase instead of local:

```bash
# Get your credentials from dashboard
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-cloud-service-role-key"

# Push migration
supabase link --project-ref your-project-ref
supabase db push

# Run tests
npm run test:integration -- tests/integration/stripe-flow.test.ts
```

## File Locations

- **Tests**: `/tests/integration/stripe-flow.test.ts`
- **Helpers**: `/tests/helpers/stripe.ts`
- **Migration**: `/supabase/migrations/20251013_001_ad_orders_table.sql`
- **Full Docs**: `/tests/integration/STRIPE_TESTS_README.md`

## What Gets Tested

- ✅ Checkout session creation
- ✅ Webhook signature verification
- ✅ Database order creation
- ✅ Input validation
- ✅ Rate limiting
- ✅ Error handling
- ✅ RLS policies
- ✅ All 3 ad types

## Need More Help?

- Read full docs: `/tests/integration/STRIPE_TESTS_README.md`
- Check summary: `/tests/integration/STRIPE_INTEGRATION_SUMMARY.md`
- Review test file: `/tests/integration/stripe-flow.test.ts`

---

**Ready to run?** Just execute:

```bash
supabase start && npm run test:integration -- tests/integration/stripe-flow.test.ts
```
