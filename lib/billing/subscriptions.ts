import { getStripeClient } from '@/lib/stripe/client'
import Stripe from 'stripe'

export interface SubscriptionData {
  id: string
  status: string
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  items: Array<{
    id: string
    productName: string
    productDescription: string | null
    amount: number
    currency: string
    interval: string | null
  }>
  created: Date
  canceledAt: Date | null
}

/**
 * Get all active subscriptions for a Stripe customer
 */
export async function getUserSubscriptions(stripeCustomerId: string): Promise<SubscriptionData[]> {
  const stripe = getStripeClient()

  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: 'all',
    expand: ['data.items.data.price.product'],
    limit: 100,
  })

  return subscriptions.data.map((sub) => {
    const items = sub.items.data.map((item) => {
      const product = item.price.product as Stripe.Product
      return {
        id: item.id,
        productName: product.name,
        productDescription: product.description,
        amount: (item.price.unit_amount || 0) / 100,
        currency: item.price.currency,
        interval: item.price.recurring?.interval || null,
      }
    })

    return {
      id: sub.id,
      status: sub.status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      items,
      created: new Date(sub.created * 1000),
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
    }
  })
}

/**
 * Get payment methods for a Stripe customer
 */
export async function getPaymentMethods(stripeCustomerId: string) {
  const stripe = getStripeClient()

  const paymentMethods = await stripe.paymentMethods.list({
    customer: stripeCustomerId,
    type: 'card',
  })

  const customer = (await stripe.customers.retrieve(stripeCustomerId)) as Stripe.Customer
  const defaultPaymentMethodId =
    typeof customer.invoice_settings?.default_payment_method === 'string'
      ? customer.invoice_settings.default_payment_method
      : customer.invoice_settings?.default_payment_method?.id

  return paymentMethods.data.map((pm) => ({
    id: pm.id,
    brand: pm.card?.brand || 'card',
    last4: pm.card?.last4 || '****',
    expMonth: pm.card?.exp_month || 0,
    expYear: pm.card?.exp_year || 0,
    isDefault: pm.id === defaultPaymentMethodId,
    isExpiringSoon: isExpiringSoon(pm.card?.exp_month || 0, pm.card?.exp_year || 0),
  }))
}

/**
 * Check if a card is expiring within 3 months
 */
function isExpiringSoon(month: number, year: number): boolean {
  const now = new Date()
  const expiry = new Date(year, month - 1)
  const threeMonthsFromNow = new Date()
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)
  return expiry <= threeMonthsFromNow && expiry >= now
}

/**
 * Get recent invoices for a Stripe customer
 */
export async function getInvoices(stripeCustomerId: string, limit = 12) {
  const stripe = getStripeClient()

  const invoices = await stripe.invoices.list({
    customer: stripeCustomerId,
    limit,
  })

  return invoices.data.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    amountDue: (invoice.amount_due || 0) / 100,
    amountPaid: (invoice.amount_paid || 0) / 100,
    currency: invoice.currency,
    created: new Date(invoice.created * 1000),
    pdfUrl: invoice.invoice_pdf,
    hostedUrl: invoice.hosted_invoice_url,
    lines: invoice.lines.data.map((line) => ({
      description: line.description,
      amount: (line.amount || 0) / 100,
      quantity: line.quantity,
    })),
  }))
}
