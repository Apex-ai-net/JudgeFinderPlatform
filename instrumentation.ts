/**
 * Next.js Instrumentation
 *
 * This file is automatically loaded by Next.js before any other code.
 * Use it to initialize monitoring, telemetry, and observability tools.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

/**
 * Validates that monitoring and observability are properly configured
 */
function validateMonitoringSetup(): void {
  const isProduction = process.env.NODE_ENV === 'production'
  const isDevelopment = process.env.NODE_ENV === 'development'

  const warnings: string[] = []

  // Check Sentry configuration
  if (!process.env.SENTRY_DSN) {
    warnings.push('SENTRY_DSN not configured - error tracking disabled')
  }

  // Check Redis configuration for rate limiting and caching
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    warnings.push('Upstash Redis not configured - caching and rate limiting degraded')
  }

  if (warnings.length > 0 && isProduction) {
    console.warn('\n' + '⚠'.repeat(40))
    console.warn('WARNING: Monitoring not fully configured for production')
    console.warn('⚠'.repeat(40))
    warnings.forEach(w => console.warn(`  ⚠️  ${w}`))
    console.warn('\nProduction deployments should have full monitoring configured.')
    console.warn('⚠'.repeat(40) + '\n')
  }

  if (warnings.length === 0 || isDevelopment) {
    console.log('[instrumentation] Monitoring configuration validated')
  }
}

/**
 * Validates that authentication is properly configured
 * Implements fail-fast pattern for production deployments
 */
function validateAuthenticationSetup(): void {
  const isProduction = process.env.NODE_ENV === 'production'
  const isDevelopment = process.env.NODE_ENV === 'development'

  const requiredAuthVars = {
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY': process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    'CLERK_SECRET_KEY': process.env.CLERK_SECRET_KEY
  }

  const missingVars: string[] = []
  const invalidVars: string[] = []

  // Check for missing variables
  for (const [name, value] of Object.entries(requiredAuthVars)) {
    if (!value) {
      missingVars.push(name)
    } else if (
      value.includes('YOUR_') ||
      value.includes('CONFIGURE') ||
      value.includes('PLACEHOLDER')
    ) {
      invalidVars.push(name)
    }
  }

  // Check specifically for Clerk publishable key format
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  if (publishableKey && !publishableKey.startsWith('pk_')) {
    invalidVars.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (must start with pk_)')
  }

  const hasAuthErrors = missingVars.length > 0 || invalidVars.length > 0

  if (hasAuthErrors && isProduction) {
    // FAIL FAST in production
    console.error('\n' + '='.repeat(80))
    console.error('CRITICAL SECURITY ERROR: Authentication not properly configured')
    console.error('='.repeat(80))

    if (missingVars.length > 0) {
      console.error('\nMissing required authentication variables:')
      missingVars.forEach(v => console.error(`  ❌ ${v}`))
    }

    if (invalidVars.length > 0) {
      console.error('\nInvalid authentication variables:')
      invalidVars.forEach(v => console.error(`  ❌ ${v}`))
    }

    console.error('\nProduction deployments MUST have valid Clerk authentication configured.')
    console.error('Without proper authentication, protected routes would be publicly accessible.')
    console.error('\nPlease configure valid Clerk keys before deploying to production.')
    console.error('Visit https://clerk.com to get your authentication keys.')
    console.error('='.repeat(80) + '\n')

    throw new Error('CRITICAL: Authentication not configured for production deployment')
  }

  if (hasAuthErrors && isDevelopment) {
    // WARN in development
    console.warn('\n' + '⚠'.repeat(40))
    console.warn('WARNING: Authentication not properly configured')
    console.warn('⚠'.repeat(40))

    if (missingVars.length > 0) {
      console.warn('\nMissing authentication variables:')
      missingVars.forEach(v => console.warn(`  ⚠️  ${v}`))
    }

    if (invalidVars.length > 0) {
      console.warn('\nInvalid authentication variables:')
      invalidVars.forEach(v => console.warn(`  ⚠️  ${v}`))
    }

    console.warn('\nRunning in INSECURE MODE - protected routes will not require authentication.')
    console.warn('This is only acceptable for local development.')
    console.warn('Configure Clerk keys from https://clerk.com for full authentication.')
    console.warn('⚠'.repeat(40) + '\n')
  }

  if (!hasAuthErrors) {
    console.log('[instrumentation] Authentication configuration validated successfully')
  }
}

export async function register() {
  // Validate environment variables before anything else
  const { validateEnvironmentOnStartup } = await import('@/lib/utils/env-validator')
  validateEnvironmentOnStartup()

  // SECURITY: Validate authentication configuration at startup
  validateAuthenticationSetup()

  // Validate monitoring configuration
  validateMonitoringSetup()

  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize Sentry for server-side error tracking
    if (process.env.SENTRY_DSN) {
      try {
        const Sentry = await import('@sentry/nextjs')

        Sentry.init({
          dsn: process.env.SENTRY_DSN,

          // Performance Monitoring
          tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? (process.env.NODE_ENV === 'production' ? '0.1' : '1.0')),
          profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? '0.1'),

          // Session Replay
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,

          // Environment
          environment: process.env.NODE_ENV || 'development',

          // Release tracking
          release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NETLIFY_BUILD_ID || 'development',

          // Enable profiling for slow transactions
          enableTracing: true,

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
                const sensitiveParams = ['key', 'token', 'api_key', 'password']
                sensitiveParams.forEach(param => {
                  if (url.searchParams.has(param)) {
                    url.searchParams.delete(param)
                  }
                })
                event.request.url = url.toString()
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
            'AbortError',
            'cancelled',
          ],

          // Configure integrations
          integrations: [
            Sentry.httpIntegration({
              // Track slow HTTP requests
              // Note: shouldCreateSpanForRequest moved to top-level tracesSampler
            }),
          ],

          // Custom trace sampling for performance monitoring
          tracesSampler: (samplingContext) => {
            const url = samplingContext.request?.url || ''
            // Track all API routes and external API calls
            if (url.includes('/api/') || url.includes('courtlistener') || url.includes('supabase')) {
              return 1.0 // 100% sampling for API calls
            }
            return 0.1 // 10% for other requests
          },
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
