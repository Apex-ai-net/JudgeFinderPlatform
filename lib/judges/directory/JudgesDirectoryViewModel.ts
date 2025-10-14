import type { JudgesDirectoryDataManager } from './JudgesDirectoryDataManager'
import type { JudgeDirectoryState, JudgesDirectoryViewModelOptions } from './types'
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

  get hasCachedResults(): boolean {
    return this.store.hasCachedResults
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

  setPage(page: number) {
    this.store.setPage(page)
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
}
