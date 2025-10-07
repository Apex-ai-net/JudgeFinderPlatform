'use client'

import { useEffect, useMemo, useRef } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeGrid as Grid, type GridChildComponentProps, type GridOnItemsRenderedProps } from 'react-window'
import { motion } from 'framer-motion'
import { JudgeCardSkeleton } from '@/components/ui/Skeleton'
import type { JudgesDirectoryViewModel } from '@/lib/judges/directory/JudgesDirectoryViewModel'
import { JudgesDirectoryGridCard } from './JudgesDirectoryGridCard'

const GRID_COLUMN_GAP = 24
const GRID_ROW_GAP = 24
const CARD_WIDTH = 360
const CARD_HEIGHT = 320

interface JudgesDirectoryResultsGridProps {
  viewModel: JudgesDirectoryViewModel
}

export function JudgesDirectoryResultsGrid({ viewModel }: JudgesDirectoryResultsGridProps) {
  const judges = viewModel.visibleJudges
  const count = judges.length
  const loading = viewModel.state.loading
  const hasMore = viewModel.state.has_more
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Infinite scroll sentinel
  useEffect(() => {
    if (!sentinelRef.current) return
    if (!hasMore) return
    const el = sentinelRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && !viewModel.state.loading) {
          void viewModel.loadMore()
        }
      },
      { root: null, rootMargin: '200px', threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, viewModel])

  const itemData = useMemo(
    () => ({
      judges,
      recentYears: viewModel.state.recentYears,
    }),
    [judges, viewModel.state.recentYears]
  )

  if (count === 0) {
    return null
  }

  return (
    <div className="relative" aria-busy={loading}>
      <AutoSizer disableHeight>
        {({ width }) => {
          // Responsive column calculation with a smaller minimum card width on mobile
          const MIN_CARD_WIDTH = 280
          const gridColumnCount = Math.max(1, Math.floor((width + GRID_COLUMN_GAP) / (MIN_CARD_WIDTH + GRID_COLUMN_GAP)))
          const rowCount = Math.ceil(count / gridColumnCount)
          const perColumnWidth = Math.floor(
            (width - GRID_COLUMN_GAP * (gridColumnCount + 1)) / gridColumnCount,
          )

          const handleItemsRendered = ({ visibleRowStopIndex }: GridOnItemsRenderedProps) => {
            if (visibleRowStopIndex >= rowCount - 2 && hasMore && !loading) {
              void viewModel.loadMore()
            }
          }

          return (
            <Grid
              columnCount={gridColumnCount}
              columnWidth={perColumnWidth + GRID_COLUMN_GAP}
              height={rowCount * (CARD_HEIGHT + GRID_ROW_GAP)}
              rowCount={rowCount}
              rowHeight={CARD_HEIGHT + GRID_ROW_GAP}
              width={width}
              itemData={itemData}
              itemKey={({ columnIndex, rowIndex, data }) => {
                // Use actual judge ID to prevent React Window from reusing cells when new data loads
                const index = rowIndex * gridColumnCount + columnIndex
                const judge = data.judges[index]
                return judge?.id || `empty-${rowIndex}-${columnIndex}`
              }}
              onItemsRendered={handleItemsRendered}
            >
              {({ columnIndex, rowIndex, style }: GridChildComponentProps) => {
                const index = rowIndex * gridColumnCount + columnIndex
                const judge = itemData.judges[index]

                if (!judge) {
                  return null
                }

                return (
                  <div
                    style={{
                      ...style,
                      width: perColumnWidth,
                      height: CARD_HEIGHT,
                      left: Number(style.left) + GRID_COLUMN_GAP,
                      top: Number(style.top) + GRID_ROW_GAP,
                    }}
                  >
                    <JudgesDirectoryGridCard judge={judge} recentYears={itemData.recentYears} />
                  </div>
                )
              }}
            </Grid>
          )
        }}
      </AutoSizer>

      {loading && hasMore && (
        <motion.div
          className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {Array.from({ length: Math.min(3, count) }).map((_, index) => (
            <JudgeCardSkeleton key={index} />
          ))}
        </motion.div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-8" />

      {/* Manual fallback for accessibility and older browsers */}
      {hasMore && !loading && (
        <motion.div
          className="mt-4 flex justify-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.button
            onClick={() => void viewModel.loadMore()}
            className="inline-flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Load more
          </motion.button>
        </motion.div>
      )}
    </div>
  )
}

