'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeGrid as Grid, type GridChildComponentProps } from 'react-window'
import { motion } from 'framer-motion'
import { JudgeCardSkeleton } from '@/components/ui/Skeleton'
import type { JudgesDirectoryViewModel } from '@/lib/judges/directory/JudgesDirectoryViewModel'
import { JudgesDirectoryGridCard } from './JudgesDirectoryGridCard'
import { JudgesPagination } from './JudgesPagination'

const GRID_COLUMN_GAP = 24
const GRID_ROW_GAP = 24
const CARD_HEIGHT = 320

interface JudgesDirectoryResultsGridProps {
  viewModel: JudgesDirectoryViewModel
}

export function JudgesDirectoryResultsGrid({
  viewModel,
}: JudgesDirectoryResultsGridProps): JSX.Element {
  const router = useRouter()
  const searchParams = useSearchParams()
  const judges = viewModel.state.judges
  const count = judges.length
  const loading = viewModel.state.loading

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

  const handlePageChange = (page: number): void => {
    // Prefetch/update view state immediately for better UX
    viewModel.setPage(page)
    const params = new URLSearchParams(searchParams.toString())
    if (page === 1) {
      params.delete('page')
    } else {
      params.set('page', page.toString())
    }
    const newUrl = params.toString() ? `/judges?${params.toString()}` : '/judges'
    router.push(newUrl, { scroll: false })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="relative" aria-busy={loading}>
      <AutoSizer disableHeight>
        {({ width }) => {
          const MIN_CARD_WIDTH = 280
          const gridColumnCount = Math.max(
            1,
            Math.floor((width + GRID_COLUMN_GAP) / (MIN_CARD_WIDTH + GRID_COLUMN_GAP))
          )
          const rowCount = Math.min(Math.ceil(count / gridColumnCount), count)
          const perColumnWidth = Math.floor(
            (width - GRID_COLUMN_GAP * (gridColumnCount + 1)) / gridColumnCount
          )
          const gridHeight = Math.min(rowCount * (CARD_HEIGHT + GRID_ROW_GAP) + GRID_ROW_GAP, 10000)

          return (
            <Grid
              columnCount={gridColumnCount}
              columnWidth={perColumnWidth + GRID_COLUMN_GAP}
              height={gridHeight}
              rowCount={rowCount}
              rowHeight={CARD_HEIGHT + GRID_ROW_GAP}
              width={width}
              itemData={itemData}
              itemKey={({ columnIndex, rowIndex, data }) => {
                const index = rowIndex * gridColumnCount + columnIndex
                const judge = data.judges[index]
                return judge?.id || `empty-${rowIndex}-${columnIndex}`
              }}
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

      {loading && (
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

      {viewModel.state.totalPages > 1 && (
        <JudgesPagination
          currentPage={viewModel.state.currentPage}
          totalPages={viewModel.state.totalPages}
          onPageChange={handlePageChange}
          loading={loading}
        />
      )}
    </div>
  )
}
