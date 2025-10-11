import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section Skeleton */}
      <div className="bg-gradient-to-br from-enterprise-primary/20 via-enterprise-deep/10 to-background px-4 py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        <div className="mx-auto max-w-7xl relative z-10">
          <Skeleton className="h-12 w-3/4 md:w-2/3 mb-4" />
          <Skeleton className="h-6 w-2/3 md:w-1/2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 pb-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* Left Column - Profile and Analytics */}
          <div className="space-y-8">
            {/* Profile Section Skeleton */}
            <section className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="flex items-start gap-6">
                <Skeleton className="h-24 w-24 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-8 w-2/3" />
                  <Skeleton className="h-5 w-1/2" />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-6 w-full" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Professional Background Skeleton */}
            <section className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <Skeleton className="h-7 w-48 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            </section>

            {/* Analytics Section Skeleton */}
            <section className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <Skeleton className="h-7 w-40 mb-6" />
              <div className="space-y-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center mb-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-3 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </section>

            {/* Recent Decisions Skeleton */}
            <section className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <Skeleton className="h-7 w-40 mb-4" />
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Table of Contents Skeleton */}
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm sticky top-24">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </div>

            {/* Advertiser Slots Skeleton */}
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-20 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            </div>

            {/* Donation Card Skeleton */}
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>

            {/* Related Content Skeleton */}
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <Skeleton className="h-6 w-36 mb-4" />
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ Skeleton */}
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
