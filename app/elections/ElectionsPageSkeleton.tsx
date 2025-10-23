import { Vote, Calendar, MapPin, BookOpen } from 'lucide-react'

export function ElectionsPageSkeleton(): JSX.Element {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section Skeleton */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />

        <div className="relative z-10 text-center px-4 max-w-7xl mx-auto w-full">
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Vote className="h-4 w-4" />
              California Voter Guide
            </span>
          </div>

          <div className="mb-6">
            <div className="h-16 md:h-24 bg-muted/50 rounded-lg animate-pulse max-w-4xl mx-auto mb-4" />
            <div className="h-16 md:h-24 bg-muted/30 rounded-lg animate-pulse max-w-3xl mx-auto" />
          </div>

          <div className="mx-auto mb-12 max-w-3xl">
            <div className="h-6 bg-muted/50 rounded animate-pulse mb-2" />
            <div className="h-6 bg-muted/30 rounded animate-pulse max-w-2xl mx-auto" />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <div className="h-14 w-64 bg-primary/20 rounded-xl animate-pulse" />
            <div className="h-14 w-48 bg-muted/50 rounded-xl animate-pulse" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="h-10 w-20 bg-primary/20 rounded mx-auto mb-2 animate-pulse" />
                <div className="h-4 w-32 bg-muted/50 rounded mx-auto animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Elections Section Skeleton */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="h-10 w-96 bg-muted/50 rounded-lg animate-pulse mx-auto mb-4" />
            <div className="h-6 w-full max-w-2xl bg-muted/30 rounded animate-pulse mx-auto" />
          </div>

          <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="h-10 w-48 bg-muted/50 rounded-lg animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-20 bg-muted/50 rounded-lg animate-pulse" />
              <div className="h-8 w-20 bg-muted/50 rounded-lg animate-pulse" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ElectionCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Search by Address Section Skeleton */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
            <div className="h-10 w-96 bg-muted/50 rounded-lg animate-pulse mx-auto mb-4" />
            <div className="h-6 w-full max-w-md bg-muted/30 rounded animate-pulse mx-auto mb-6" />
            <div className="bg-background border-2 border-dashed border-border rounded-xl p-8">
              <div className="h-20 bg-muted/20 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* Educational Resources Section Skeleton */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
            <div className="h-10 w-96 bg-muted/50 rounded-lg animate-pulse mx-auto mb-4" />
            <div className="h-6 w-full max-w-2xl bg-muted/30 rounded animate-pulse mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-12 w-12 bg-primary/10 rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-3">
                    <div className="h-6 bg-muted/50 rounded animate-pulse" />
                    <div className="h-4 bg-muted/30 rounded animate-pulse" />
                    <div className="h-4 bg-muted/30 rounded animate-pulse w-3/4" />
                    <div className="h-4 w-24 bg-primary/20 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Calendar Section Skeleton */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
            <div className="h-10 w-96 bg-muted/50 rounded-lg animate-pulse mx-auto mb-4" />
            <div className="h-6 w-full max-w-2xl bg-muted/30 rounded animate-pulse mx-auto" />
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 h-12 w-12 bg-primary/10 rounded-lg animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-muted/50 rounded animate-pulse" />
                      <div className="h-6 bg-muted/50 rounded animate-pulse" />
                      <div className="h-4 bg-muted/30 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function ElectionCardSkeleton(): JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-muted/50 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-muted/30 rounded animate-pulse w-1/2" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-4 bg-muted/30 rounded animate-pulse" />
        <div className="h-4 bg-muted/30 rounded animate-pulse w-2/3" />
        <div className="h-4 bg-muted/30 rounded animate-pulse w-1/2" />

        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="h-3 w-20 bg-muted/30 rounded animate-pulse" />
            <div className="h-3 w-24 bg-muted/50 rounded animate-pulse" />
          </div>
          <div className="flex items-center justify-between">
            <div className="h-3 w-28 bg-muted/30 rounded animate-pulse" />
            <div className="h-4 w-16 bg-primary/20 rounded animate-pulse" />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-4 w-32 bg-primary/20 rounded animate-pulse" />
      </div>
    </div>
  )
}
