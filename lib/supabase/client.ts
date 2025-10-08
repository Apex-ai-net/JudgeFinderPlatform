import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'
import { useAuth } from '@clerk/nextjs'

// Re-export for backwards compatibility
export { createSupabaseBrowserClient as createBrowserClient }

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase environment variables not configured')
  }

  return createSupabaseBrowserClient(url, key)
}

export function createClerkSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase environment variables not configured')
  }

  return createSupabaseBrowserClient(
    url,
    key,
    {
      global: {
        fetch: async (url, options = {}) => {
          const clerkToken = await window.Clerk?.session?.getToken({
            template: 'supabase'
          })

          const headers = new Headers(options?.headers)
          if (clerkToken) {
            headers.set('Authorization', `Bearer ${clerkToken}`)
          }

          return fetch(url, {
            ...options,
            headers,
          })
        },
      },
    }
  )
}