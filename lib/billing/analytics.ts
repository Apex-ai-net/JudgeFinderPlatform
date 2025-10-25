import { stripe } from '@/lib/stripe/client'

export interface MonthlySpending {
  month: string // YYYY-MM format
  amount: number
  invoiceCount: number
}

export interface SpendingAnalytics {
  totalSpent: number
  avgMonthlySpend: number
  monthlyBreakdown: MonthlySpending[]
  lastInvoiceDate: Date | null
  currentMonthSpend: number
  previousMonthSpend: number
  spendTrend: 'up' | 'down' | 'stable'
}

/**
 * Calculates spending analytics from Stripe invoices
 */
export async function getSpendingAnalytics(stripeCustomerId: string): Promise<SpendingAnalytics> {
  try {
    if (!stripe) {
      throw new Error('Stripe client not initialized')
    }

    // Fetch all paid invoices
    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 100,
      status: 'paid',
    })

    // Group invoices by month
    const monthlyMap = new Map<string, { amount: number; count: number }>()

    for (const invoice of invoices.data) {
      const date = new Date(invoice.created * 1000)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      const existing = monthlyMap.get(monthKey) || { amount: 0, count: 0 }
      monthlyMap.set(monthKey, {
        amount: existing.amount + invoice.amount_paid / 100,
        count: existing.count + 1,
      })
    }

    // Convert to array and sort by month (newest first)
    const monthlyBreakdown: MonthlySpending[] = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        amount: data.amount,
        invoiceCount: data.count,
      }))
      .sort((a, b) => b.month.localeCompare(a.month))

    // Calculate totals
    const totalSpent = monthlyBreakdown.reduce((sum, m) => sum + m.amount, 0)
    const avgMonthlySpend = monthlyBreakdown.length > 0 ? totalSpent / monthlyBreakdown.length : 0

    // Get current and previous month spending
    const now = new Date()
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1)
    const previousMonthKey = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`

    const currentMonthSpend = monthlyMap.get(currentMonthKey)?.amount || 0
    const previousMonthSpend = monthlyMap.get(previousMonthKey)?.amount || 0

    // Determine trend
    let spendTrend: 'up' | 'down' | 'stable' = 'stable'
    if (currentMonthSpend > previousMonthSpend * 1.1) {
      spendTrend = 'up'
    } else if (currentMonthSpend < previousMonthSpend * 0.9) {
      spendTrend = 'down'
    }

    const lastInvoiceDate =
      invoices.data.length > 0 ? new Date(invoices.data[0].created * 1000) : null

    return {
      totalSpent,
      avgMonthlySpend,
      monthlyBreakdown,
      lastInvoiceDate,
      currentMonthSpend,
      previousMonthSpend,
      spendTrend,
    }
  } catch (error) {
    console.error('Error calculating spending analytics:', error)
    throw new Error('Failed to calculate spending analytics')
  }
}

/**
 * Formats month key to readable format
 */
export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/**
 * Gets last N months for chart display
 */
export function getLastNMonths(monthlyBreakdown: MonthlySpending[], n = 6): MonthlySpending[] {
  return monthlyBreakdown.slice(0, n).reverse()
}
