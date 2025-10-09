/**
 * CourtListener API Client - Authentication Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CourtListenerClient } from '@/lib/courtlistener/client'
import { createPaginatedResponse } from '@/tests/helpers/test-utils'
import { setupCourtListenerEnv, getFetchCallHeaders } from '@/tests/helpers/courtlistener-helpers'

setupCourtListenerEnv()

describe('CourtListenerClient - Authentication', (): void => {
  let client: CourtListenerClient
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach((): void => {
    fetchMock = vi.fn()
    global.fetch = fetchMock
    client = new CourtListenerClient()
  })

  afterEach((): void => {
    vi.restoreAllMocks()
  })

  it('should include Authorization header with Token prefix', async (): Promise<void> => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => createPaginatedResponse([]),
      headers: new Headers(),
    })

    await client.listJudges({ pageSize: 1 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const headers = getFetchCallHeaders(fetchMock, 0)
    expect(headers['Authorization']).toBe('Token test-api-key')
  })

  it('should throw error when API key is missing', (): void => {
    delete process.env.COURTLISTENER_API_KEY
    delete process.env.COURTLISTENER_API_TOKEN

    expect(() => new CourtListenerClient()).toThrow(
      'COURTLISTENER_API_KEY or COURTLISTENER_API_TOKEN environment variable is required'
    )

    // Restore for other tests
    process.env.COURTLISTENER_API_KEY = 'test-api-key'
  })

  it('should accept COURTLISTENER_API_TOKEN as alternative', (): void => {
    process.env.COURTLISTENER_API_TOKEN = 'alternative-token'
    delete process.env.COURTLISTENER_API_KEY

    const altClient = new CourtListenerClient()
    expect(altClient).toBeInstanceOf(CourtListenerClient)

    // Restore
    process.env.COURTLISTENER_API_KEY = 'test-api-key'
    delete process.env.COURTLISTENER_API_TOKEN
  })

  it('should include proper User-Agent header', async (): Promise<void> => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => createPaginatedResponse([]),
      headers: new Headers(),
    })

    await client.listJudges({ pageSize: 1 })

    const headers = getFetchCallHeaders(fetchMock, 0)
    expect(headers['User-Agent']).toContain('JudgeFinder')
    expect(headers['User-Agent']).toContain('judgefinder.io')
  })
})
