import { useEffect, useMemo, useRef } from 'react'
import { JudgesDirectoryDataManager } from './JudgesDirectoryDataManager'
import { JudgesDirectoryViewModel } from './JudgesDirectoryViewModel'
import type { JudgeDirectoryApiResponse } from './types'

interface UseJudgesDirectoryViewModelOptions {
  initialData?: JudgeDirectoryApiResponse
}

export function useJudgesDirectoryViewModel(
  options: UseJudgesDirectoryViewModelOptions = {}
): JudgesDirectoryViewModel {
  const managerRef = useRef<JudgesDirectoryDataManager>()
  const viewModelRef = useRef<JudgesDirectoryViewModel>()

  if (!managerRef.current) {
    managerRef.current = new JudgesDirectoryDataManager()
  }

  const manager = managerRef.current

  if (!viewModelRef.current) {
    viewModelRef.current = new JudgesDirectoryViewModel({
      manager,
      initialState: options.initialData,
    })
  } else if (options.initialData && !viewModelRef.current.state.initialized) {
    viewModelRef.current = new JudgesDirectoryViewModel({
      manager,
      initialState: options.initialData,
    })
  }

  const viewModel = viewModelRef.current

  useEffect(() => {
    // CRITICAL FIX: Only load initial data if SSR didn't provide it
    // When initialData exists, the store is already initialized with correct page data
    // Calling loadInitial() would overwrite it with page 1, breaking pagination
    if (!options.initialData) {
      void viewModel.loadInitial()
    }
  }, [])

  return viewModel
}
