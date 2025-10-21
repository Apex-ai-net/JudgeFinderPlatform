'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { shimmer } from '@/lib/animations/presets'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmerEffect?: boolean
}

export function Skeleton({
  className,
  shimmerEffect = true,
  ...props
}: SkeletonProps): JSX.Element {
  if (shimmerEffect) {
    return (
      // @ts-expect-error - Framer Motion types conflict with React div types
      <motion.div
        variants={shimmer}
        initial="initial"
        animate="animate"
        className={cn(
          'rounded-md bg-gradient-to-r from-muted via-muted-foreground/20 to-muted bg-[length:200%_100%]',
          className
        )}
        {...props}
      />
    )
  }

  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
}

export function JudgeCardSkeleton(): JSX.Element {
  return (
    <div className="bg-card rounded-xl shadow-md p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-6 w-3/4 mb-3 rounded-lg" />
      <Skeleton className="h-4 w-1/2 mb-4 rounded-lg" />
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-2/3 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-1/2 rounded-lg" />
        </div>
        <div className="pt-3 flex gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export function CourtCardSkeleton(): JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-24" />
          </div>

          <Skeleton className="h-6 w-full mb-2" />

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-20" />
            </div>

            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>

        <div className="ml-4">
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  )
}

export function JudgeProfileSkeleton(): JSX.Element {
  return (
    <div className="bg-card rounded-xl shadow-lg p-8 border border-border">
      <div className="flex items-start space-x-6">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-5 w-3/4" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SearchSkeleton(): JSX.Element {
  return (
    <div className="bg-card rounded-xl shadow-lg border border-border p-6 space-y-4">
      <Skeleton className="h-6 w-32 mb-4 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-10 w-28 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>

      <div className="mt-4 p-4 bg-muted rounded-lg">
        <Skeleton className="h-4 w-48 rounded" />
      </div>
    </div>
  )
}

export function JudgeDetailSkeleton(): JSX.Element {
  return (
    <div className="space-y-8">
      <div className="bg-card rounded-xl border border-border p-8">
        <div className="flex items-start gap-6">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-8 w-2/3 rounded-lg" />
            <Skeleton className="h-5 w-1/2 rounded-lg" />
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-6 w-full rounded-lg" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-6 w-full rounded-lg" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-6 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <Skeleton className="h-6 w-48 mb-4 rounded-lg" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-5/6 rounded" />
              <Skeleton className="h-4 w-4/6 rounded" />
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <Skeleton className="h-6 w-40 mb-4 rounded-lg" />
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <Skeleton className="h-6 w-32 mb-4 rounded-lg" />
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
