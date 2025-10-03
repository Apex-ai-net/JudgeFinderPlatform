/**
 * Next.js Instrumentation
 *
 * This file is automatically loaded by Next.js before any other code.
 * Use it to initialize monitoring, telemetry, and observability tools.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Validate environment variables before anything else
  const { validateEnvironmentOnStartup } = await import('@/lib/utils/env-validator')
  validateEnvironmentOnStartup()

  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize Sentry for server-side error tracking
    if (process.env.SENTRY_DSN) {
      try {
        const Sentry = await import('@sentry/nextjs')

        Sentry.init({
          dsn: process.env.SENTRY_DSN,

          // Performance Monitoring
          tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

          // Session Replay
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,

          // Environment
          environment: process.env.NODE_ENV || 'development',

          // Release tracking
          release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',

          // Filter sensitive data
          beforeSend(event) {
            // Remove sensitive headers
            if (event.request?.headers) {
              delete event.request.headers['authorization']
              delete event.request.headers['cookie']
              delete event.request.headers['x-api-key']
            }

            // Remove query parameters with sensitive data
            if (event.request?.url) {
              try {
                const url = new URL(event.request.url)
                if (url.searchParams.has('key')) {
                  url.searchParams.delete('key')
                  event.request.url = url.toString()
                }
              } catch {
                // Invalid URL, skip sanitization
              }
            }

            return event
          },

          // Ignore certain errors
          ignoreErrors: [
            'ResizeObserver loop limit exceeded',
            'Non-Error promise rejection captured',
            'Network request failed',
          ],

          // Configure integrations
          integrations: [
            // Add custom integrations here if needed
          ],
        })

        console.log('[instrumentation] Sentry initialized for nodejs runtime')
      } catch (error) {
        console.error('[instrumentation] Failed to initialize Sentry:', error)
      }
    } else {
      console.warn('[instrumentation] SENTRY_DSN not configured - error tracking disabled')
    }
  }

  // Edge runtime initialization
  if (process.env.NEXT_RUNTIME === 'edge') {
    if (process.env.SENTRY_DSN) {
      try {
        const Sentry = await import('@sentry/nextjs')

        Sentry.init({
          dsn: process.env.SENTRY_DSN,
          tracesSampleRate: 0.1,
          environment: process.env.NODE_ENV || 'development',
        })

        console.log('[instrumentation] Sentry initialized for edge runtime')
      } catch (error) {
        console.error('[instrumentation] Failed to initialize Sentry for edge:', error)
      }
    }
  }
}

/**
 * Optional: onRequestError hook for custom error handling
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
export async function onRequestError(
  err: Error,
  request: Request,
  context: {
    routerKind: 'pages' | 'app'
    routePath: string
    routeType: 'render' | 'route' | 'action' | 'middleware'
  }
) {
  // Log error with context
  console.error('[instrumentation] Request error:', {
    error: err.message,
    stack: err.stack,
    url: request.url,
    method: request.method,
    context,
  })

  // Send to Sentry if initialized
  if (process.env.SENTRY_DSN) {
    try {
      const Sentry = await import('@sentry/nextjs')
      Sentry.captureException(err, {
        contexts: {
          nextjs: {
            router_kind: context.routerKind,
            route_path: context.routePath,
            route_type: context.routeType,
          },
        },
        tags: {
          route_path: context.routePath,
          route_type: context.routeType,
        },
      })
    } catch {
      // Sentry not available, error already logged
    }
  }
}
