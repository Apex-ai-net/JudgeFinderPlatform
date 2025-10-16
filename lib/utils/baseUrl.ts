export function getBaseUrl(): string {
  // CRITICAL: In browser (client-side), ALWAYS use window.location.origin
  // This ensures API calls work in preview deployments, branch deploys, and production
  // Without this, previews would call production API and fail with CORS/404 errors
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // Server-side only below this point

  // In development (server-side), use localhost
  if (process.env.NODE_ENV === 'development') {
    return `http://localhost:${process.env.PORT || 3005}`
  }

  // Production/preview server-side: Use Netlify environment variables
  // Priority order: explicit URL > Netlify URLs > fallback
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.DEPLOY_PRIME_URL || // Netlify deploy preview (higher priority)
    process.env.URL || // Netlify primary URL
    'https://judgefinder.io'

  // Normalize: trim whitespace and trailing slash
  url = url.trim().replace(/\/$/, '')

  // Enforce https scheme if missing or using http (only in production)
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
    if (parsed.protocol !== 'https:' && process.env.NODE_ENV !== 'development') {
      parsed.protocol = 'https:'
    }
    return `${parsed.protocol}//${parsed.host}`
  } catch {
    // Fallback to default
    return 'https://judgefinder.io'
  }
}
