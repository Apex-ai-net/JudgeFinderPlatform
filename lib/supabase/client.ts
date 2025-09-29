import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'
import { useAuth } from '@clerk/nextjs'

// Re-export for backwards compatibility
export { createSupabaseBrowserClient as createBrowserClient }

export function createClient() {
  return createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function createClerkSupabaseClient() {
  return createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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