import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { retryFailedPayment } from '@/lib/billing/dunning'

export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/dunning/retry
 * Manually retry a failed payment
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { invoiceId } = body

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId is required' }, { status: 400 })
    }

    const invoice = await retryFailedPayment(invoiceId)

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        status: invoice.status,
        amount_paid: invoice.amount_paid / 100,
      },
    })
  } catch (error) {
    console.error('Failed to retry payment:', error)

    // Return user-friendly error message
    const errorMessage = error instanceof Error ? error.message : 'Failed to retry payment'

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
