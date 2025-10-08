/**
 * Environment Variable Validator
 * Validates required environment variables and provides helpful error messages
 */

import { logger } from './logger'

export interface EnvVariable {
  name: string
  required: boolean
  description?: string
  validator?: (value: string) => boolean
  transform?: (value: string) => any
}

export interface EnvValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  values: Record<string, any>
}

// Define all required environment variables
const ENV_VARIABLES: EnvVariable[] = [
  // Supabase Configuration
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    validator: (value) => value.includes('supabase.co') || value.includes('supabase.io')
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous/public key',
    validator: (value) => value.length > 20
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabase service role key (server-side only)',
    validator: (value) => value.length > 20
  },
  
  // Clerk Authentication
  {
    name: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    required: true,
    description: 'Clerk publishable key',
    validator: (value) => value.length > 10 // Less strict - Clerk keys can have different formats
  },
  {
    name: 'CLERK_SECRET_KEY',
    required: true,
    description: 'Clerk secret key',
    validator: (value) => value.length > 10 // Less strict - Clerk keys can have different formats
  },
  {
    name: 'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
    required: false,
    description: 'Clerk sign-in URL',
    validator: (value) => value.startsWith('/')
  },
  {
    name: 'NEXT_PUBLIC_CLERK_SIGN_UP_URL',
    required: false,
    description: 'Clerk sign-up URL',
    validator: (value) => value.startsWith('/')
  },
  {
    name: 'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL',
    required: false,
    description: 'Redirect URL after sign-in',
    validator: (value) => value.startsWith('/')
  },
  {
    name: 'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL',
    required: false,
    description: 'Redirect URL after sign-up',
    validator: (value) => value.startsWith('/')
  },
  
  // External APIs
  {
    name: 'COURTLISTENER_API_KEY',
    required: true,
    description: 'CourtListener API key for fetching court data',
    validator: (value) => value.length > 10
  },
  {
    name: 'OPENAI_API_KEY',
    required: false,
    description: 'OpenAI API key for AI analytics (fallback)',
    validator: (value) => value.startsWith('sk-')
  },
  {
    name: 'GOOGLE_AI_API_KEY',
    required: false,
    description: 'Google AI API key for primary analytics',
    validator: (value) => value.length > 20
  },
  {
    name: 'COURTLISTENER_REQUEST_DELAY_MS',
    required: false,
    description: 'Base delay between CourtListener requests (ms)',
    validator: (value) => Number(value) >= 0,
    transform: (value) => Number(value)
  },
  {
    name: 'COURTLISTENER_MAX_RETRIES',
    required: false,
    description: 'Maximum retry attempts for CourtListener requests',
    validator: (value) => Number(value) >= 0,
    transform: (value) => Number(value)
  },
  {
    name: 'COURTLISTENER_REQUEST_TIMEOUT_MS',
    required: false,
    description: 'Timeout for individual CourtListener requests (ms)',
    validator: (value) => Number(value) >= 1000,
    transform: (value) => Number(value)
  },
  {
    name: 'COURTLISTENER_BACKOFF_CAP_MS',
    required: false,
    description: 'Maximum backoff delay when retrying CourtListener requests (ms)',
    validator: (value) => Number(value) >= 0,
    transform: (value) => Number(value)
  },
  {
    name: 'COURTLISTENER_CIRCUIT_THRESHOLD',
    required: false,
    description: 'Error threshold before opening CourtListener circuit breaker',
    validator: (value) => Number.isInteger(Number(value)) && Number(value) >= 0,
    transform: (value) => Number(value)
  },
  {
    name: 'COURTLISTENER_CIRCUIT_COOLDOWN_MS',
    required: false,
    description: 'Cooldown duration after circuit breaker opens (ms)',
    validator: (value) => Number(value) >= 0,
    transform: (value) => Number(value)
  },
  
  // Application Configuration
  {
    name: 'NEXT_PUBLIC_SITE_URL',
    required: true,
    description: 'Public site URL',
    validator: (value) => value.startsWith('http://') || value.startsWith('https://')
  },
  {
    name: 'NODE_ENV',
    required: false,
    description: 'Node environment',
    validator: (value) => ['development', 'production', 'test'].includes(value)
  },
  
  // Upstash Redis (for rate limiting)
  {
    name: 'UPSTASH_REDIS_REST_URL',
    required: true,
    description: 'Upstash Redis URL for rate limiting',
    validator: (value) => value.startsWith('https://')
  },
  {
    name: 'UPSTASH_REDIS_REST_TOKEN',
    required: true,
    description: 'Upstash Redis token',
    validator: (value) => value.length > 20
  },
  
  // Sentry Error Tracking
  {
    name: 'SENTRY_DSN',
    required: false,
    description: 'Sentry DSN for error tracking',
    validator: (value) => value.startsWith('https://')
  },
  {
    name: 'NEXT_PUBLIC_SENTRY_DSN',
    required: false,
    description: 'Public Sentry DSN for client-side errors',
    validator: (value) => value.startsWith('https://')
  },
  {
    name: 'SENTRY_ENVIRONMENT',
    required: false,
    description: 'Sentry environment identifier',
    validator: (value) => ['development', 'staging', 'production'].includes(value)
  },
  {
    name: 'SENTRY_RELEASE',
    required: false,
    description: 'Sentry release version',
    validator: (value) => value.length > 0
  },

  // Stripe Payment Processing
  {
    name: 'STRIPE_SECRET_KEY',
    required: false,
    description: 'Stripe secret key for payment processing',
    validator: (value) => value.startsWith('sk_test_') || value.startsWith('sk_live_')
  },
  {
    name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    required: false,
    description: 'Stripe publishable key',
    validator: (value) => value.startsWith('pk_test_') || value.startsWith('pk_live_')
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: false,
    description: 'Stripe webhook signing secret',
    validator: (value) => value.startsWith('whsec_')
  },

  // Analytics
  {
    name: 'NEXT_PUBLIC_GA_MEASUREMENT_ID',
    required: false,
    description: 'Google Analytics 4 measurement ID',
    validator: (value) => value.startsWith('G-')
  },
  {
    name: 'NEXT_PUBLIC_POSTHOG_KEY',
    required: false,
    description: 'PostHog API key',
    validator: (value) => value.startsWith('phc_')
  },
  {
    name: 'NEXT_PUBLIC_POSTHOG_HOST',
    required: false,
    description: 'PostHog host URL',
    validator: (value) => value.startsWith('https://')
  },

  // Admin Configuration
  {
    name: 'ADMIN_USER_IDS',
    required: false,
    description: 'Comma-separated list of admin user IDs',
    validator: (value) => value.length > 0
  },

  // Internal Security
  {
    name: 'SYNC_API_KEY',
    required: true,
    description: 'API key for internal sync operations',
    validator: (value) => value.length >= 20
  },
  {
    name: 'CRON_SECRET',
    required: true,
    description: 'Secret for authenticating scheduled tasks',
    validator: (value) => value.length >= 20
  },

  // SEO Verification
  {
    name: 'NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION',
    required: false,
    description: 'Google Search Console verification code',
    validator: (value) => value.length > 10
  },
  {
    name: 'NEXT_PUBLIC_BING_SITE_VERIFICATION',
    required: false,
    description: 'Bing Webmaster Tools verification code',
    validator: (value) => value.length > 10
  },

  // Feature Flags
  {
    name: 'ENABLE_BETA_FEATURES',
    required: false,
    description: 'Enable beta features',
    validator: (value) => ['true', 'false'].includes(value.toLowerCase()),
    transform: (value) => value.toLowerCase() === 'true'
  },
  {
    name: 'DEBUG_MODE',
    required: false,
    description: 'Enable debug logging',
    validator: (value) => ['true', 'false'].includes(value.toLowerCase()),
    transform: (value) => value.toLowerCase() === 'true'
  },
  {
    name: 'MAINTENANCE_MODE',
    required: false,
    description: 'Enable maintenance mode',
    validator: (value) => ['true', 'false'].includes(value.toLowerCase()),
    transform: (value) => value.toLowerCase() === 'true'
  }
]

/**
 * Validates all environment variables
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const values: Record<string, any> = {}
  
  for (const envVar of ENV_VARIABLES) {
    const value = process.env[envVar.name]
    
    // Check if required variable is missing
    if (envVar.required && !value) {
      errors.push(`Missing required environment variable: ${envVar.name}${envVar.description ? ` (${envVar.description})` : ''}`)
      continue
    }
    
    // Skip optional variables that are not set
    if (!envVar.required && !value) {
      continue
    }
    
    // Validate the value if validator is provided
    if (value && envVar.validator && !envVar.validator(value)) {
      errors.push(`Invalid value for ${envVar.name}: ${envVar.description || 'validation failed'}`)
      continue
    }
    
    // Transform value if transformer is provided
    if (value) {
      values[envVar.name] = envVar.transform ? envVar.transform(value) : value
    }
  }
  
  // Add warnings for optional but recommended variables
  if (!process.env.OPENAI_API_KEY && !process.env.GOOGLE_AI_API_KEY) {
    warnings.push('No AI API keys configured. AI analytics features will be disabled.')
  }

  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    warnings.push('Sentry not configured. Error tracking will be disabled.')
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    warnings.push('Stripe not configured. Payment processing will be disabled.')
  }

  if (!process.env.ADMIN_USER_IDS) {
    warnings.push('No admin user IDs configured. Admin features may not work properly.')
  }

  if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    warnings.push('No analytics configured. Usage tracking will be disabled.')
  }

  // Production-specific warnings
  if (process.env.NODE_ENV === 'production') {
    if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
      warnings.push('WARNING: Using Stripe test key in production environment!')
    }

    if (process.env.CLERK_SECRET_KEY?.includes('test')) {
      warnings.push('WARNING: Using Clerk test key in production environment!')
    }

    if (process.env.NEXT_PUBLIC_SITE_URL?.includes('localhost')) {
      warnings.push('WARNING: Site URL points to localhost in production!')
    }

    if (!process.env.SENTRY_DSN) {
      warnings.push('PRODUCTION: Sentry strongly recommended for production error tracking.')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    values
  }
}

/**
 * Validates environment on startup and logs results
 */
export function validateEnvironmentOnStartup(): boolean {
  const result = validateEnvironment()
  
  if (!result.valid) {
    logger.error('Environment validation failed', { errors: result.errors })
    console.error('\n❌ Environment Validation Failed:\n')
    result.errors.forEach(error => console.error(`   • ${error}`))
    console.error('\nPlease check your environment variables configuration.\n')
    
    // In production, we should fail fast
    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
    
    return false
  }
  
  if (result.warnings.length > 0) {
    logger.warn('Environment validation warnings', { warnings: result.warnings })
    console.warn('\n⚠️ Environment Warnings:\n')
    result.warnings.forEach(warning => console.warn(`   • ${warning}`))
    console.warn('')
  }
  
  logger.info('Environment validation successful', { 
    configuredVars: Object.keys(result.values).length 
  })
  
  return true
}

/**
 * Get validated environment variable value
 */
export function getEnvVar(name: string): string | undefined {
  const envVar = ENV_VARIABLES.find(v => v.name === name)
  
  if (!envVar) {
    logger.warn(`Unknown environment variable requested: ${name}`)
    return process.env[name]
  }
  
  const value = process.env[name]
  
  if (envVar.required && !value) {
    logger.error(`Required environment variable missing: ${name}`)
    throw new Error(`Missing required environment variable: ${name}`)
  }
  
  if (value && envVar.validator && !envVar.validator(value)) {
    logger.error(`Invalid environment variable value: ${name}`)
    throw new Error(`Invalid value for environment variable: ${name}`)
  }
  
  return value
}

/**
 * Check if the environment is properly configured for production
 */
export function isProductionReady(): boolean {
  const result = validateEnvironment()

  // Check for production-specific requirements
  const productionRequirements = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'COURTLISTENER_API_KEY',
    'NEXT_PUBLIC_SITE_URL',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'SYNC_API_KEY',
    'CRON_SECRET'
  ]

  const missingProduction = productionRequirements.filter(
    name => !process.env[name]
  )

  if (missingProduction.length > 0) {
    logger.error('Missing production environment variables', {
      missing: missingProduction
    })
    return false
  }

  // Check for production-recommended variables
  const recommendedProduction = [
    'SENTRY_DSN',
    'NEXT_PUBLIC_SENTRY_DSN',
    'GOOGLE_AI_API_KEY',
    'ADMIN_USER_IDS'
  ]

  const missingRecommended = recommendedProduction.filter(
    name => !process.env[name]
  )

  if (missingRecommended.length > 0) {
    logger.warn('Missing recommended production variables', {
      missing: missingRecommended
    })
  }

  return result.valid
}

/**
 * Get environment configuration summary
 */
export function getEnvironmentSummary(): {
  configured: string[]
  missing: string[]
  invalid: string[]
  warnings: string[]
} {
  const result = validateEnvironment()
  const configured: string[] = []
  const missing: string[] = []
  const invalid: string[] = []

  for (const envVar of ENV_VARIABLES) {
    const value = process.env[envVar.name]

    if (!value) {
      if (envVar.required) {
        missing.push(envVar.name)
      }
      continue
    }

    if (envVar.validator && !envVar.validator(value)) {
      invalid.push(envVar.name)
    } else {
      configured.push(envVar.name)
    }
  }

  return {
    configured,
    missing,
    invalid,
    warnings: result.warnings
  }
}

/**
 * Generate environment variable template
 */
export function generateEnvTemplate(): string {
  const template = ENV_VARIABLES.map(envVar => {
    const required = envVar.required ? '# REQUIRED' : '# OPTIONAL'
    const description = envVar.description ? ` - ${envVar.description}` : ''
    return `${required}${description}\n${envVar.name}=`
  }).join('\n\n')
  
  return `# JudgeFinder Platform Environment Variables\n# Generated on ${new Date().toISOString()}\n\n${template}`
}