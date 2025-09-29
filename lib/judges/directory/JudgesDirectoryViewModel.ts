import type { JudgesDirectoryDataManager } from './JudgesDirectoryDataManager'
import type { JudgeDirectoryState, JudgeWithDecisions, JudgesDirectoryViewModelOptions } from './types'
import { JudgesDirectoryStore, getJudgesDirectoryStore } from './judgesDirectoryStore'

export class JudgesDirectoryViewModel {
  private readonly store: JudgesDirectoryStore

  constructor(options: JudgesDirectoryViewModelOptions) {
    const manager = options.manager as JudgesDirectoryDataManager
    this.store = getJudgesDirectoryStore(manager, options.initialState)
  }

  get state(): JudgeDirectoryState {
    return this.store.state
  }

  get visibleJudges(): JudgeWithDecisions[] {
    return this.store.visibleJudges
  }

  get hasCachedResults(): boolean {
    return this.store.hasCachedResults
  }

  get canLoadMore(): boolean {
    return this.store.canLoadMore
  }

  get isInitialLoading(): boolean {
    return this.store.isInitialLoading
  }

  setSearchTerm(value: string) {
    this.store.setSearchTerm(value)
  }

  setJurisdiction(value: string | null) {
    this.store.setJurisdiction(value)
  }

  toggleOnlyWithDecisions(enabled: boolean) {
    this.store.toggleOnlyWithDecisions(enabled)
  }

  setRecentYears(years: number) {
    this.store.setRecentYears(years)
  }

  increaseVisibleCount() {
    this.store.increaseVisibleCount()
  }

  clearError() {
    this.store.clearError()
  }

  async loadInitial() {
    await this.store.loadInitial()
  }

  async refresh() {
    await this.store.refresh()
  }

  async loadMore() {
    await this.store.loadMore()
  }
}

