'use client'

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-10 w-48 bg-muted/50 rounded-lg animate-shimmer" />
              <div className="h-6 w-64 bg-muted/30 rounded-lg animate-shimmer" />
            </div>
            <div className="hidden sm:block space-y-2">
              <div className="h-5 w-32 bg-muted/30 rounded-lg animate-shimmer ml-auto" />
              <div className="h-4 w-40 bg-muted/20 rounded-lg animate-shimmer ml-auto" />
            </div>
          </div>
        </div>

        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-card rounded-xl border border-border p-6"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-3 flex-1">
                  <div className="h-3 w-24 bg-muted/50 rounded animate-shimmer" />
                  <div className="h-8 w-16 bg-muted/60 rounded animate-shimmer" />
                </div>
                <div className="w-12 h-12 bg-muted/40 rounded-lg animate-shimmer" />
              </div>
              <div className="h-3 w-full bg-muted/30 rounded animate-shimmer mt-3" />
            </div>
          ))}
        </div>

        {/* Content Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Actions Skeleton */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="h-6 w-32 bg-muted/50 rounded animate-shimmer mb-4" />
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-12 bg-muted/30 rounded-lg animate-shimmer"
                    style={{ animationDelay: `${i * 50}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity Skeleton */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="h-6 w-40 bg-muted/50 rounded animate-shimmer mb-4" />
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-start space-x-3"
                    style={{ animationDelay: `${i * 75}ms` }}
                  >
                    <div className="w-10 h-10 bg-muted/40 rounded-full animate-shimmer" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-muted/40 rounded animate-shimmer" />
                      <div className="h-3 w-1/2 bg-muted/30 rounded animate-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-muted/20 rounded-xl border border-border p-6"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="h-5 w-32 bg-muted/50 rounded animate-shimmer" />
                  <div className="h-4 w-full bg-muted/30 rounded animate-shimmer" />
                  <div className="h-4 w-3/4 bg-muted/30 rounded animate-shimmer" />
                </div>
                <div className="w-10 h-10 bg-muted/40 rounded-lg animate-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
