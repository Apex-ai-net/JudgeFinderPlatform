# Billing Improvement Prompts (JudgeFinder Platform)

These prompts are tailored to this repository’s current Stripe billing setup and advertising domain rules. Use each prompt as a self‑contained task for Codex to implement.

---

## 1) Add Stripe Tax and Jurisdiction‑Aware Taxes

Prompt: Implement tax calculation with Stripe Tax and display tax amounts across checkout, invoices, and the billing UI. Use court jurisdiction and advertiser address to determine the correct tax location. Ensure all new tax fields are persisted and shown to users.

Acceptance criteria:

- Enable `automatic_tax` and `tax_behavior` on Stripe prices and subscription updates.
- Collect and persist advertiser tax location in `advertiser_profiles` (billing address, country, state/province).
- Map court jurisdiction from ad purchases to a fallback tax location when missing user address.
- Show taxes on the billing page and any invoice/history views.
- Verify webhook handling for `invoice.finalized` and `invoice.paid` reflects tax totals in Supabase.
- Update docs with tax collection rationale and examples.

Key files/areas:

- `lib/stripe/client.ts`, `app/api/*` billing/Stripe routes
- `lib/billing/subscriptions.ts` (invoices)
- `supabase/migrations/*` (add tax columns if missing)
- `components/billing/*` (UI display of taxes)

---

## 2) Dunning, Retries, and Billing Alerts

Prompt: Add a complete failed‑payment recovery flow. Surface alerts for upcoming renewals, expiring cards, and failed payments in the dashboard. Configure Stripe retry rules and show in‑app banners with call‑to‑action to update payment methods.

Acceptance criteria:

- Handle `invoice.payment_failed` and `customer.subscription.updated` webhooks to mark accounts grace/locked.
- Create `components/billing/BillingAlertsWidget.tsx` to surface: renewal in ≤7 days, expiring cards, failed payment warnings.
- Respect role permissions from `lib/auth/roles.ts` for who can manage billing.
- Add admin telemetry of dunning outcomes (recoveries vs. churn) to Supabase.
- Document the retry schedule and grace period; add tests for webhook flows.

Key files/areas:

- `app/api/stripe/webhook/route.ts`
- `components/billing/*` new `BillingAlertsWidget.tsx`
- `lib/auth/roles.ts`, `lib/auth/user-roles.ts`
- `tests/unit/api/stripe-webhook.test.ts`

---

## 3) Mid‑Cycle Upgrades/Downgrades with Proration Preview

Prompt: Allow advertisers to change plans mid‑cycle and preview proration before confirming. Add API endpoints and UI controls to switch tiers and billing intervals with clear cost deltas.

Acceptance criteria:

- New endpoint to preview upcoming invoice/proration using Stripe (`/api/billing/proration-preview`).
- Update subscription changes with `proration_behavior: 'always_invoice'` and show immediate charge/refund.
- UI: Add “Change plan” action in billing page; render a modal with proration line items and net due/credit.
- Persist plan change events and show them in invoice history.
- Tests for upgrade, downgrade, and interval switch (monthly ↔ annual).

Key files/areas:

- `app/dashboard/billing/page.tsx` (entry point and modal trigger)
- `lib/billing/subscriptions.ts` (helpers for preview + change)
- `components/dashboard/AdPurchaseModal.tsx` (align terminology/toggles)
- `app/api/billing/*` new route for preview

---

## 4) Credits, Refunds, and Adjustments Pipeline

Prompt: Implement a safe credit/refund workflow with audit logs. Support partial refunds and credit notes tied to ad performance or service issues, reflected in both Stripe and Supabase.

Acceptance criteria:

- Add admin API to create Stripe refunds/credit notes; sync `ad_transactions` with `stripe_refund_id` and reason.
- Update `ad_orders`/`ad_transactions` status transitions: `paid` → `refunded` or `adjustment` with timestamps.
- Expose a read‑only credits/refunds section on the billing page.
- Add tests for refunds and credit issuance; verify idempotency.
- Include admin-only UI to issue credits with required notes and validation.

Key files/areas:

- `supabase/migrations/*` (ensure columns for refund metadata)
- `app/api/billing/*` (admin endpoints)
- `types/advertising.ts` (`transaction_type`, `stripe_refund_id` already present)
- `components/billing/*` (display credit/refund history)

---

## 5) Revenue Analytics (MRR/ARR, Churn, LTV) and Receipts

Prompt: Add a billing analytics module to show MRR/ARR, churn, LTV, and cohort charts. Email branded receipts for each paid invoice. Provide summary widgets in advertiser and admin dashboards.

Acceptance criteria:

- Server utilities to compute MRR/ARR and churn from Stripe invoices/subscriptions and Supabase order data.
- `components/dashboard/SpendingChart.tsx` and small KPI widgets (Total spent, Avg monthly, Last invoice date).
- Automated receipt emails on `invoice.paid` with line items and tax breakdown.
- Admin view for cohort retention and top‑spend firms.
- Documentation on metrics definitions and caveats.

Key files/areas:

- `lib/billing/*` analytics utilities, `lib/stripe/client.ts`
- `components/dashboard/*` widgets and charts
- `app/api/stripe/webhook/route.ts` (trigger receipts)
- `docs/` for metrics definitions and success criteria

---

Notes:

- Align pricing and multipliers with `lib/domain/services/AdPricingService.ts` (tiered pricing, exclusivity, court levels).
- Respect professional verification and geographic rules when exposing purchase/upgrade options.
- Ensure RLS and role permissions guard all billing data access.
