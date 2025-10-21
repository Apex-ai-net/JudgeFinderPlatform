import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { isStripeEnabled } from '@/lib/ads/stripe'
import { getAdvertiserProfileForUser, listAvailableAdSpots } from '@/lib/ads/service'
import { SkipLink } from '@/components/ui/SkipLink'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Calendar, DollarSign, MapPin, User } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdvertiserDashboardPage(): Promise<JSX.Element> {
  const user = await currentUser()
  if (!user) {
    redirect('/sign-in')
  }

  const advertiserProfile = await getAdvertiserProfileForUser(user.id)
  if (!advertiserProfile) {
    redirect('/dashboard/advertiser/onboarding')
  }

  const stripeReady = isStripeEnabled()
  const environment = process.env.NODE_ENV || 'development'
  const sampleSpots = await listAvailableAdSpots(3)

  // Fetch active ad campaigns for this advertiser
  const supabase = await createClient()
  const { data: activeBookings } = await supabase
    .from('ad_spot_bookings')
    .select(
      `
      *,
      judge:judges(id, name, slug, court_name, jurisdiction)
    `
    )
    .eq('advertiser_id', advertiserProfile.id)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('created_at', { ascending: false })

  return (
    <>
      <SkipLink />
      <main id="main-content" role="main" className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Advertising Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Welcome back, {advertiserProfile.firm_name}. Manage your campaigns and track performance.
          </p>
        </header>

        {/* Quick Actions */}
        <section
          aria-labelledby="quick-actions-heading"
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <h2 id="quick-actions-heading" className="sr-only">Quick Actions</h2>

          <Link
            href="/dashboard/advertiser/campaigns"
            className="rounded-lg border border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Campaigns</h3>
            </div>
            <p className="text-sm text-muted-foreground">Create and manage advertising campaigns</p>
          </Link>

          <Link
            href="/dashboard/advertiser/performance"
            className="rounded-lg border border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-secondary" />
              </div>
              <h3 className="font-semibold text-foreground">Performance</h3>
            </div>
            <p className="text-sm text-muted-foreground">View analytics and campaign metrics</p>
          </Link>

          <Link
            href="/dashboard/advertiser/creative"
            className="rounded-lg border border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-success" />
              </div>
              <h3 className="font-semibold text-foreground">Ad Creative</h3>
            </div>
            <p className="text-sm text-muted-foreground">Manage logo and ad content</p>
          </Link>
        </section>

        {/* Account Status */}
        <section
          aria-labelledby="account-status-heading"
          className={`rounded-lg border p-6 ${
            advertiserProfile.verification_status === 'verified'
              ? 'border-success/30 bg-success/10 text-success'
              : advertiserProfile.verification_status === 'pending'
                ? 'border-warning/30 bg-warning/10 text-warning'
                : 'border-primary/30 bg-primary/10 text-primary'
          }`}
        >
          <h2 id="account-status-heading" className="text-lg font-semibold mb-2">
            Account Status
          </h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="font-medium opacity-90">Status</dt>
              <dd className="capitalize mt-1">{advertiserProfile.account_status}</dd>
            </div>
            <div>
              <dt className="font-medium opacity-90">Verification</dt>
              <dd className="capitalize mt-1">{advertiserProfile.verification_status}</dd>
            </div>
            <div>
              <dt className="font-medium opacity-90">Environment</dt>
              <dd className="uppercase mt-1">{environment}</dd>
            </div>
            <div>
              <dt className="font-medium opacity-90">Stripe</dt>
              <dd className="mt-1">{stripeReady ? 'Configured' : 'Not configured'}</dd>
            </div>
          </dl>
        </section>

        {/* Active Campaigns Section */}
        {activeBookings && activeBookings.length > 0 && (
          <section
            aria-labelledby="active-campaigns-heading"
            className="rounded-lg border border-border bg-card p-6 shadow-sm"
          >
            <h2 id="active-campaigns-heading" className="text-lg font-semibold text-foreground mb-4">
              Your Active Ad Campaigns
            </h2>
            <div className="space-y-4">
              {activeBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-lg border border-border bg-muted p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <Link
                        href={`/judges/${booking.judge.slug}`}
                        className="text-base font-semibold text-foreground hover:text-primary"
                      >
                        Judge {booking.judge.name}
                      </Link>
                      <p className="text-sm text-muted-foreground mt-1">{booking.judge.court_name}</p>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'active'
                          ? 'bg-success/20 text-success border border-success/30'
                          : booking.status === 'past_due'
                            ? 'bg-destructive/20 text-destructive border border-destructive/30'
                            : 'bg-primary/20 text-primary border border-primary/30'
                      }`}
                    >
                      {booking.status === 'active'
                        ? 'Active'
                        : booking.status === 'past_due'
                          ? 'Payment Due'
                          : 'Trial'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 text-muted-foreground/50" aria-hidden />
                      <span>Slot #{booking.position}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4 text-muted-foreground/50" aria-hidden />
                      <span>${booking.monthly_price}/mo</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 text-muted-foreground/50" aria-hidden />
                      <span>
                        {booking.billing_interval === 'annual' ? 'Annual' : 'Monthly'} billing
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4 text-muted-foreground/50" aria-hidden />
                      <span className="capitalize">{booking.court_level} court</span>
                    </div>
                  </div>

                  {booking.current_period_end && (
                    <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground/70">
                      {booking.cancel_at_period_end ? (
                        <p>
                          <span className="font-medium text-warning">
                            Canceling at period end
                          </span>{' '}
                          - Active until {new Date(booking.current_period_end).toLocaleDateString()}
                        </p>
                      ) : (
                        <p>
                          Next billing date:{' '}
                          {new Date(booking.current_period_end).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
              <p>
                To manage your subscriptions, visit your{' '}
                <Link
                  href="/dashboard/billing"
                  className="text-primary hover:underline font-medium"
                >
                  billing dashboard
                </Link>
                .
              </p>
            </div>
          </section>
        )}

        <section
          aria-labelledby="preview-placements-heading"
          className="rounded-lg border border-border bg-card p-6 shadow-sm"
        >
          <h2 id="preview-placements-heading" className="text-lg font-semibold text-foreground mb-3">
            Preview available placements
          </h2>
          {sampleSpots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No ad spots are marked as available yet. We\'re preparing inventory for the beta
              launch.
            </p>
          ) : (
            <ul className="space-y-3">
              {sampleSpots.map((spot) => (
                <li key={spot.id} className="rounded border border-border bg-muted px-4 py-3">
                  <div className="flex justify-between text-sm text-foreground">
                    <span className="font-medium capitalize">{spot.entity_type} placement</span>
                    <span className="text-muted-foreground">Position {spot.position}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-sm text-muted-foreground">
                    <span>Base price: ${spot.base_price_monthly.toLocaleString()} / mo</span>
                    <span>Impressions: {spot.impressions_total.toLocaleString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  )
}
