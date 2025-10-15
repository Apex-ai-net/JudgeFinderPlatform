import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, AlertCircle, Package } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Billing & Purchases | JudgeFinder Dashboard',
  description: 'View your ad space purchases and billing history',
  robots: {
    index: false,
    follow: false,
  },
}

interface AdOrder {
  id: string
  created_at: string
  organization_name: string
  customer_email: string
  ad_type: string
  status: string
  amount_total: number
  currency: string
  payment_status: string | null
  stripe_session_id: string
  metadata: {
    billing_cycle?: string
    tier?: string
  }
}

export default async function BillingDashboard({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; session_id?: string }>
}) {
  // Require authentication
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in?returnBackUrl=/dashboard/billing')
  }

  const params = searchParams ? await searchParams : {}
  const showSuccess = params.success === '1'

  // Query ad orders (RLS automatically filters by current user)
  const supabase = await createServerClient()
  const { data: orders, error } = await supabase
    .from('ad_orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch orders:', error)
  }

  const typedOrders = (orders || []) as AdOrder[]

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Success Message */}
        {showSuccess && (
          <div className="mb-6 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
                  Purchase Successful!
                </h3>
                <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                  Your payment has been processed. Your ad space is now active.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Billing & Purchases</h1>
          <p className="mt-2 text-muted-foreground">
            View your ad space purchases and billing history
          </p>
        </div>

        {/* Orders List */}
        {typedOrders.length > 0 ? (
          <div className="space-y-4">
            {typedOrders.map((order) => (
              <div
                key={order.id}
                className="bg-card rounded-lg border border-border shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold text-foreground">{order.organization_name}</h3>
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium">Type:</span>{' '}
                        {order.metadata?.tier || order.ad_type || 'Universal Access'}
                      </p>
                      {order.metadata?.billing_cycle && (
                        <p>
                          <span className="font-medium">Billing:</span>{' '}
                          {order.metadata.billing_cycle === 'annual'
                            ? 'Annual ($5,000/year)'
                            : 'Monthly ($500/month)'}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Email:</span> {order.customer_email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="mb-2">
                      <p className="text-2xl font-bold text-foreground">
                        ${(order.amount_total / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground uppercase">
                        {order.currency || 'USD'}
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3" />
                      {order.status === 'paid' ? 'Paid' : order.status}
                    </div>
                  </div>
                </div>

                {/* Session ID (for support) */}
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground font-mono">
                    Order ID: {order.stripe_session_id}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No purchases yet</h3>
            <p className="text-muted-foreground mb-6">
              You haven't purchased any ad space. Get started to reach California legal
              professionals.
            </p>
            <Link
              href="/ads/buy"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
            >
              <Package className="h-5 w-5" />
              Purchase Ad Space
            </Link>
          </div>
        )}

        {/* Help Text */}
        {typedOrders.length > 0 && (
          <div className="mt-8 rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Need help?</strong> Contact support at{' '}
              <a href="mailto:support@judgefinder.io" className="text-primary hover:underline">
                support@judgefinder.io
              </a>{' '}
              with your order ID for assistance.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
