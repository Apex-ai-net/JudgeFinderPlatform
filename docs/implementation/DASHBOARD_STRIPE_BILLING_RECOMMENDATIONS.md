# Dashboard Stripe & Billing Integration - Recommendations

**Date**: October 16, 2024
**Priority**: High
**Complexity**: Medium-High

---

## 🔍 Current State Analysis

### What's Working ✅

1. **Basic Billing Page** (`/dashboard/billing`)
   - Shows ad_orders from database
   - Displays purchase history
   - Shows payment amounts and status

2. **Stripe Products Configured**
   - Universal Access product exists
   - Monthly ($500) and Annual ($5,000) pricing
   - Metadata properly structured

3. **Database Schema**
   - `ad_orders` table tracks purchases
   - `advertiser_profiles` has `stripe_customer_id` field
   - Basic integration infrastructure in place

### What's Missing ❌

#### 1. **No Subscription Management**

- Users cannot view active subscriptions
- No way to cancel/pause subscriptions
- No upcoming invoice preview
- No subscription renewal dates shown

#### 2. **No Payment Method Management**

- Cannot add/update credit cards
- No default payment method displayed
- No backup payment methods
- No card expiration warnings

#### 3. **No Invoice History**

- Only shows ad_orders, not Stripe invoices
- Cannot download invoices as PDF
- No invoice details (line items, taxes, etc.)
- Missing historical billing data

#### 4. **No Real-time Stripe Sync**

- Dashboard shows database data only
- Doesn't fetch live Stripe subscription status
- Could show outdated information
- No webhook processing confirmation

#### 5. **Limited Advertiser Dashboard Integration**

- No billing widget on advertiser dashboard
- No subscription status indicator
- No usage/quota tracking
- No billing alerts

---

## 🎯 Recommended Fixes (Priority Order)

### **Priority 1: Critical - Subscription Management**

#### 1.1 Add Stripe Customer Portal Integration

**Why**: Stripe provides a hosted portal for subscription management

**Implementation**:

```typescript
// app/api/billing/customer-portal/route.ts
import { stripe } from '@/lib/stripe/client'
import { auth } from '@clerk/nextjs/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Get Stripe customer ID
  const supabase = await createServiceRoleClient()
  const { data: profile } = await supabase
    .from('advertiser_profiles')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single()

  if (!profile?.stripe_customer_id) {
    return Response.json({ error: 'No Stripe customer found' }, { status: 404 })
  }

  // Create portal session
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
  })

  return Response.json({ url: session.url })
}
```

**Dashboard Integration**:

```typescript
// Add to app/dashboard/billing/page.tsx
<button
  onClick={async () => {
    const res = await fetch('/api/billing/customer-portal', { method: 'POST' })
    const { url } = await res.json()
    window.location.href = url
  }}
  className="btn-primary"
>
  Manage Subscription & Payment Methods
</button>
```

**Benefits**:

- ✅ Zero maintenance - Stripe handles UI
- ✅ Secure - PCI compliant
- ✅ Full subscription management
- ✅ Payment method updates
- ✅ Invoice downloads

**Effort**: 2-3 hours
**Impact**: High

---

#### 1.2 Display Active Subscriptions

**Why**: Users need to see what they're paying for

**Implementation**:

```typescript
// lib/billing/get-user-subscriptions.ts
import { stripe } from '@/lib/stripe/client'

export async function getUserSubscriptions(stripeCustomerId: string) {
  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: 'active',
    expand: ['data.items.data.price.product'],
  })

  return subscriptions.data.map((sub) => ({
    id: sub.id,
    status: sub.status,
    currentPeriodEnd: new Date(sub.current_period_end * 1000),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    items: sub.items.data.map((item) => ({
      productName: item.price.product.name,
      amount: item.price.unit_amount / 100,
      interval: item.price.recurring?.interval,
    })),
  }))
}
```

**Dashboard Widget**:

```typescript
// components/dashboard/ActiveSubscriptionsWidget.tsx
export function ActiveSubscriptionsWidget({ subscriptions }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Active Subscriptions</h3>
      {subscriptions.map(sub => (
        <div key={sub.id} className="border-b last:border-0 py-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">{sub.items[0].productName}</p>
              <p className="text-sm text-gray-600">
                ${sub.items[0].amount}/{sub.items[0].interval}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Renews: {sub.currentPeriodEnd.toLocaleDateString()}
              </p>
            </div>
            <div>
              {sub.cancelAtPeriodEnd ? (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  Cancels {sub.currentPeriodEnd.toLocaleDateString()}
                </span>
              ) : (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  Active
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

**Effort**: 3-4 hours
**Impact**: High

---

### **Priority 2: Important - Payment Methods**

#### 2.1 Display Payment Methods on File

**Why**: Users should see and manage their payment methods

**Implementation**:

```typescript
// lib/billing/get-payment-methods.ts
export async function getPaymentMethods(stripeCustomerId: string) {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: stripeCustomerId,
    type: 'card',
  })

  const customer = await stripe.customers.retrieve(stripeCustomerId)
  const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method

  return paymentMethods.data.map((pm) => ({
    id: pm.id,
    brand: pm.card.brand,
    last4: pm.card.last4,
    expMonth: pm.card.exp_month,
    expYear: pm.card.exp_year,
    isDefault: pm.id === defaultPaymentMethodId,
    isExpiringSoon: isExpiringSoon(pm.card.exp_month, pm.card.exp_year),
  }))
}

function isExpiringSoon(month: number, year: number): boolean {
  const now = new Date()
  const expiry = new Date(year, month - 1)
  const threeMonthsFromNow = new Date()
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)
  return expiry <= threeMonthsFromNow
}
```

**Dashboard Component**:

```typescript
// components/dashboard/PaymentMethodsWidget.tsx
export function PaymentMethodsWidget({ paymentMethods }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Payment Methods</h3>
        <button className="text-sm text-blue-600 hover:underline">
          Add New Card
        </button>
      </div>

      {paymentMethods.map(pm => (
        <div key={pm.id} className="flex items-center justify-between p-3 border rounded mb-2">
          <div className="flex items-center gap-3">
            {/* Card brand icon */}
            <CreditCardIcon brand={pm.brand} />
            <div>
              <p className="font-medium">
                {pm.brand.toUpperCase()} •••• {pm.last4}
              </p>
              <p className="text-sm text-gray-600">
                Expires {pm.expMonth}/{pm.expYear}
              </p>
              {pm.isExpiringSoon && (
                <p className="text-xs text-orange-600 font-medium">
                  ⚠️ Expiring soon
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pm.isDefault && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Default
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
```

**Effort**: 4-5 hours
**Impact**: Medium-High

---

### **Priority 3: Important - Invoice History**

#### 3.1 Fetch and Display Stripe Invoices

**Why**: Users need access to their billing history

**Implementation**:

```typescript
// lib/billing/get-invoices.ts
export async function getInvoices(stripeCustomerId: string, limit = 12) {
  const invoices = await stripe.invoices.list({
    customer: stripeCustomerId,
    limit,
  })

  return invoices.data.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    amountDue: invoice.amount_due / 100,
    amountPaid: invoice.amount_paid / 100,
    currency: invoice.currency,
    created: new Date(invoice.created * 1000),
    pdfUrl: invoice.invoice_pdf,
    hostedUrl: invoice.hosted_invoice_url,
    lines: invoice.lines.data.map((line) => ({
      description: line.description,
      amount: line.amount / 100,
      quantity: line.quantity,
    })),
  }))
}
```

**Dashboard Table**:

```typescript
// components/dashboard/InvoiceHistoryTable.tsx
export function InvoiceHistoryTable({ invoices }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Invoice
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {invoices.map(invoice => (
            <tr key={invoice.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {invoice.number || invoice.id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {invoice.created.toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${invoice.amountPaid.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <InvoiceStatusBadge status={invoice.status} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                <a
                  href={invoice.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline mr-3"
                >
                  Download PDF
                </a>
                <a
                  href={invoice.hostedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**Effort**: 3-4 hours
**Impact**: Medium

---

### **Priority 4: Nice-to-Have - Advanced Features**

#### 4.1 Usage & Billing Alerts

**Implementation**:

```typescript
// components/dashboard/BillingAlertsWidget.tsx
export function BillingAlertsWidget({ subscription, paymentMethods }) {
  const alerts = []

  // Check for upcoming renewal
  if (subscription) {
    const daysUntilRenewal = Math.ceil(
      (subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    if (daysUntilRenewal <= 7) {
      alerts.push({
        type: 'info',
        message: `Your subscription renews in ${daysUntilRenewal} days`,
        amount: subscription.items[0].amount,
      })
    }
  }

  // Check for expiring cards
  const expiringCards = paymentMethods.filter(pm => pm.isExpiringSoon)
  if (expiringCards.length > 0) {
    alerts.push({
      type: 'warning',
      message: `${expiringCards.length} payment method(s) expiring soon`,
      action: 'Update payment methods',
    })
  }

  return alerts.length > 0 ? (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <BillingAlert key={i} {...alert} />
      ))}
    </div>
  ) : null
}
```

**Effort**: 2-3 hours
**Impact**: Low-Medium

---

#### 4.2 Spending Analytics

**Implementation**:

```typescript
// lib/billing/get-spending-analytics.ts
export async function getSpendingAnalytics(stripeCustomerId: string) {
  const invoices = await stripe.invoices.list({
    customer: stripeCustomerId,
    limit: 100,
    status: 'paid',
  })

  // Group by month
  const monthlySpend = {}
  invoices.data.forEach((invoice) => {
    const month = new Date(invoice.created * 1000).toISOString().slice(0, 7)
    monthlySpend[month] = (monthlySpend[month] || 0) + invoice.amount_paid / 100
  })

  // Calculate totals
  const totalSpent = Object.values(monthlySpend).reduce((a, b) => a + b, 0)
  const avgMonthlySpend = totalSpent / Object.keys(monthlySpend).length

  return {
    totalSpent,
    avgMonthlySpend,
    monthlyBreakdown: monthlySpend,
    lastInvoiceDate: invoices.data[0]?.created,
  }
}
```

**Chart Component**:

```typescript
// components/dashboard/SpendingChart.tsx (using Recharts)
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export function SpendingChart({ monthlyBreakdown }) {
  const data = Object.entries(monthlyBreakdown).map(([month, amount]) => ({
    month,
    amount,
  }))

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Monthly Spending</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value) => `$${value}`} />
          <Bar dataKey="amount" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

**Effort**: 4-5 hours
**Impact**: Low-Medium

---

#### 4.3 Integrate Billing into Advertiser Dashboard

**Implementation**:

```typescript
// Add to AdvertiserDashboard component
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-lg font-semibold">Billing Overview</h2>
    <Link href="/dashboard/billing" className="text-sm text-blue-600 hover:underline">
      View All →
    </Link>
  </div>

  <div className="space-y-3">
    {/* Current subscription */}
    {subscription && (
      <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
        <div>
          <p className="font-medium text-blue-900">
            {subscription.items[0].productName}
          </p>
          <p className="text-sm text-blue-700">
            ${subscription.items[0].amount}/{subscription.items[0].interval}
          </p>
        </div>
        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
          Active
        </span>
      </div>
    )}

    {/* Next bill date */}
    {subscription && (
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Next billing date:</span>
        <span className="font-medium">
          {subscription.currentPeriodEnd.toLocaleDateString()}
        </span>
      </div>
    )}

    {/* Payment method */}
    {defaultPaymentMethod && (
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Payment method:</span>
        <span className="font-medium">
          {defaultPaymentMethod.brand.toUpperCase()} •••• {defaultPaymentMethod.last4}
        </span>
      </div>
    )}
  </div>
</div>
```

**Effort**: 2-3 hours
**Impact**: Medium

---

## 📋 Implementation Roadmap

### Phase 1: Critical (Week 1)

- [ ] Implement Stripe Customer Portal integration
- [ ] Add "Manage Billing" button to billing page
- [ ] Display active subscriptions on billing page
- [ ] Test subscription management flow

**Est. Time**: 8-10 hours
**ROI**: High - enables self-service billing

### Phase 2: Important (Week 2)

- [ ] Display payment methods on billing page
- [ ] Show expiring card warnings
- [ ] Fetch and display invoice history
- [ ] Add invoice download functionality

**Est. Time**: 12-14 hours
**ROI**: High - complete billing transparency

### Phase 3: Polish (Week 3)

- [ ] Add billing alerts widget
- [ ] Implement spending analytics chart
- [ ] Integrate billing overview into advertiser dashboard
- [ ] Add usage quota tracking (if applicable)

**Est. Time**: 10-12 hours
**ROI**: Medium - enhanced user experience

---

## 🔐 Security Considerations

1. **Always validate user ownership**:

   ```typescript
   // Verify user owns the Stripe customer
   const { data: profile } = await supabase
     .from('advertiser_profiles')
     .select('stripe_customer_id')
     .eq('user_id', userId) // Current authenticated user
     .single()
   ```

2. **Use server-side API routes**:
   - Never expose Stripe API keys to client
   - All Stripe operations through `/api/billing/*` routes

3. **RLS policies**:
   - Ensure advertiser_profiles has proper RLS
   - Users can only see their own billing data

---

## 🧪 Testing Checklist

- [ ] Subscription creation works
- [ ] Subscription cancellation works
- [ ] Payment method updates work
- [ ] Invoice downloads work
- [ ] Expiring card warnings show correctly
- [ ] Billing portal redirects correctly
- [ ] All amounts display in correct currency
- [ ] Date formatting is consistent
- [ ] Error states handled gracefully
- [ ] Loading states shown appropriately

---

## 📊 Success Metrics

**Before**:

- ❌ Users contact support for billing questions
- ❌ No self-service subscription management
- ❌ Manual invoice requests

**After**:

- ✅ 90% of billing actions self-service
- ✅ Zero invoice download requests
- ✅ Proactive card expiration warnings
- ✅ Reduced support tickets by 50%

---

## 💡 Additional Recommendations

### 1. Webhook Processing Visibility

Add a section showing recent webhook events for transparency:

```typescript
// Recent billing events
- Subscription renewed successfully (Oct 15, 2024)
- Invoice paid ($500) (Oct 15, 2024)
- Payment method updated (Oct 10, 2024)
```

### 2. Usage-Based Billing (Future)

If you implement metered billing:

- Show current usage vs. quota
- Display usage trends
- Warn when approaching limits

### 3. Dunning Management

Add clear messaging for failed payments:

- Show retry schedule
- Prompt to update payment method
- Display account status warnings

---

**Next Action**: Start with Phase 1 (Stripe Customer Portal) for quickest ROI
