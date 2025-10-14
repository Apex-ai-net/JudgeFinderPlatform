'use client'

import { observer } from 'mobx-react-lite'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { JudgesDirectoryHeader } from './components/JudgesDirectoryHeader'
import { JudgesDirectoryLayout } from './components/JudgesDirectoryLayout'
import { JudgesDirectorySearchPanel } from './components/JudgesDirectorySearchPanel'
import { JudgesDirectorySummary } from './components/JudgesDirectorySummary'
import { JudgesDirectoryResultsGrid } from './components/JudgesDirectoryResultsGrid'
import { JudgesDirectoryEmptyState } from './components/JudgesDirectoryEmptyState'
import { JudgesDirectoryMetrics } from './components/JudgesDirectoryMetrics'
import { JudgesDirectoryTopBar } from './components/JudgesDirectoryTopBar'
import { useJudgesDirectoryViewModel } from '@/lib/judges/directory/useJudgesDirectoryViewModel'
import type { JudgeDirectoryApiResponse } from '@/lib/judges/directory/types'

interface JudgesViewProps {
  initialData?: JudgeDirectoryApiResponse
}

const ResultsSection = observer(function ResultsSection({
  viewModel,
}: {
  viewModel: ReturnType<typeof useJudgesDirectoryViewModel>
}) {
  const { state } = viewModel

  if (state.loading && !viewModel.hasCachedResults) {
    return <JudgesDirectoryResultsGrid viewModel={viewModel} />
  }

  if (state.error && !viewModel.hasCachedResults) {
    return (
      <JudgesDirectoryEmptyState
        showError
        message="We couldn't load judges right now"
        description="Check your network connection and retry. We'll reload the list as soon as we're able to reach the data source again."
        onRetry={() => viewModel.refresh()}
      />
    )
  }

  if (state.judges.length === 0) {
    return (
      <JudgesDirectoryEmptyState
        message={
          state.onlyWithDecisions ? 'No judges with recent decisions found' : 'No judges found'
        }
        description={
          state.onlyWithDecisions
            ? 'Try unchecking the filter to see all judges or adjusting your search criteria.'
            : 'Try adjusting your search filters.'
        }
      />
    )
  }

  return <JudgesDirectoryResultsGrid viewModel={viewModel} />
})

export const JudgesView = observer(function JudgesView({ initialData }: JudgesViewProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const viewModel = useJudgesDirectoryViewModel({ initialData })

  useEffect(() => {
    const searchQuery = searchParams.get('search') || searchParams.get('q') || ''
    const pageParam = searchParams.get('page')
    const page = pageParam ? parseInt(pageParam, 10) : 1

    if (searchQuery) {
      viewModel.setSearchTerm(searchQuery)
      void viewModel.refresh()
    }

    if (page !== viewModel.state.currentPage) {
      viewModel.setPage(Number.isFinite(page) && page >= 1 ? page : 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()])

  return (
    <JudgesDirectoryLayout
      header={<JudgesDirectoryHeader showSkeleton={viewModel.isInitialLoading} />}
      search={<JudgesDirectorySearchPanel viewModel={viewModel} />}
      summary={<JudgesDirectorySummary viewModel={viewModel} />}
      results={<ResultsSection viewModel={viewModel} />}
      metrics={<JudgesDirectoryMetrics viewModel={viewModel} />}
      topbar={<JudgesDirectoryTopBar viewModel={viewModel} />}
    />
  )
})
