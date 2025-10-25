import { stripe } from '@/lib/stripe/client'

export interface InvoiceLineItem {
  id: string
  description: string | null
  amount: number
  quantity: number | null
  period?: {
    start: Date
    end: Date
  }
}

export interface Invoice {
  id: string
  number: string | null
  status: string
  amountDue: number
  amountPaid: number
  currency: string
  created: Date
  dueDate: Date | null
  paidAt: Date | null
  pdfUrl: string | null
  hostedUrl: string | null
  lines: InvoiceLineItem[]
  subtotal: number
  tax: number | null
  total: number
}

/**
 * Fetches invoices for a Stripe customer
 */
export async function getCustomerInvoices(
  stripeCustomerId: string,
  limit = 12
): Promise<Invoice[]> {
  try {
    if (!stripe) {
      throw new Error('Stripe client not initialized')
    }

    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit,
      expand: ['data.lines.data'],
    })

    return invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status || 'draft',
      amountDue: invoice.amount_due / 100,
      amountPaid: invoice.amount_paid / 100,
      currency: invoice.currency.toUpperCase(),
      created: new Date(invoice.created * 1000),
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      paidAt: invoice.status_transitions.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : null,
      pdfUrl: invoice.invoice_pdf || null,
      hostedUrl: invoice.hosted_invoice_url || null,
      lines: invoice.lines.data.map((line) => ({
        id: line.id,
        description: line.description,
        amount: line.amount / 100,
        quantity: line.quantity,
        period: line.period
          ? {
              start: new Date(line.period.start * 1000),
              end: new Date(line.period.end * 1000),
            }
          : undefined,
      })),
      subtotal: invoice.subtotal / 100,
      tax: invoice.tax ? invoice.tax / 100 : null,
      total: invoice.total / 100,
    }))
  } catch (error) {
    console.error('Error fetching invoices:', error)
    throw new Error('Failed to fetch invoice history')
  }
}

/**
 * Formats invoice status for display
 */
export function getInvoiceStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    draft: 'Draft',
    open: 'Open',
    paid: 'Paid',
    uncollectible: 'Uncollectible',
    void: 'Void',
  }
  return statusMap[status] || status
}

/**
 * Gets color classes for invoice status badge
 */
export function getInvoiceStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    paid: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    open: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    draft: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400',
    uncollectible: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    void: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-500',
  }
  return colorMap[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
}
