/**
 * Global test setup for Vitest
 * Configures environment, mocks, and test utilities
 */

import { vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom'

// Mock environment variables for testing
// Note: NODE_ENV is already set to 'test' by Vitest
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.GOOGLE_AI_API_KEY = 'test-google-ai-key'
process.env.CLERK_SECRET_KEY = 'test-clerk-secret-key'
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'test-clerk-publishable-key'
process.env.COURTLISTENER_API_KEY = 'test-courtlistener-key'

// Mock Next.js modules
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => ({
    get: vi.fn(),
  })),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
  })),
  redirect: vi.fn(),
}))

// Mock Clerk authentication
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => ({
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    getToken: vi.fn(async () => 'test-token'),
  })),
  currentUser: vi.fn(async () => ({
    id: 'test-user-id',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
  })),
  clerkClient: vi.fn(),
}))

// Mock logger to reduce noise in tests
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    apiRequest: vi.fn(),
    apiResponse: vi.fn(),
  },
}))

// Global test utilities
global.fetch = vi.fn()

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})

// Clean up after each test
afterEach(() => {
  vi.restoreAllMocks()
})
