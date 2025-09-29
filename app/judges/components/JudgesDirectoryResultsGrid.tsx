'use client'

import { useMemo } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeGrid as Grid, type GridChildComponentProps } from 'react-window'
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
    <div className="relative">
      <AutoSizer disableHeight>
        {({ width }) => {
          const gridColumnCount = Math.max(1, Math.floor((width + GRID_COLUMN_GAP) / (CARD_WIDTH + GRID_COLUMN_GAP)))
          const rowCount = Math.ceil(count / gridColumnCount)

          return (
            <Grid
              columnCount={gridColumnCount}
              columnWidth={CARD_WIDTH + GRID_COLUMN_GAP}
              height={Math.min(900, rowCount * (CARD_HEIGHT + GRID_ROW_GAP))}
              rowCount={rowCount}
              rowHeight={CARD_HEIGHT + GRID_ROW_GAP}
              width={width}
              itemData={itemData}
              itemKey={({ columnIndex, rowIndex }) => `${rowIndex}-${columnIndex}-${viewModel.state.recentYears}`}
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
                      width: CARD_WIDTH,
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
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: Math.min(3, count) }).map((_, index) => (
            <JudgeCardSkeleton key={index} />
          ))}
        </div>
      )}
    </div>
  )
}

