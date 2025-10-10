type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, any>
  error?: Error
  url?: string
  userAgent?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isServer = typeof window === 'undefined'

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    }

    // Add browser context if available
    if (!this.isServer) {
      entry.url = window.location.href
      entry.userAgent = navigator.userAgent
    }

    return entry
  }

  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, context } = entry
    const prefix = `[${timestamp}] ${level.toUpperCase()}`

    let formatted = `${prefix}: ${message}`

    if (context && Object.keys(context).length > 0) {
      formatted += ` | Context: ${JSON.stringify(context)}`
    }

    return formatted
  }

  private sendToLoggingService(entry: LogEntry) {
    // In production, use structured console logging
    if (!this.isDevelopment) {
      this.consoleLog(entry)
    }
  }

  private consoleLog(entry: LogEntry) {
    // Redact sensitive values from the log context to avoid leaking secrets in logs
    const sanitizedEntry = this.sanitizeLogEntry(entry)
    const message = this.formatMessage(sanitizedEntry)

    switch (sanitizedEntry.level) {
      case 'debug':
        console.debug(message, sanitizedEntry.context)
        break
      case 'info':
        console.info(message, sanitizedEntry.context)
        break
      case 'warn':
        console.warn(message, sanitizedEntry.context)
        if (sanitizedEntry.error) console.warn(sanitizedEntry.error)
        break
      case 'error':
        console.error(message, sanitizedEntry.context)
        if (sanitizedEntry.error) console.error(sanitizedEntry.error)
        break
    }
  }

  // Remove or mask sensitive keys from the log context recursively
  private sanitizeLogEntry(entry: LogEntry): LogEntry {
    const redactedKeys = new Set<string>([
      'secret',
      'token',
      'apikey',
      'api_key',
      'password',
      'passwd',
      'authorization',
      'authorizationToken',
      'aws_secret_access_key',
      'stripe_secret',
      'db_password',
    ])

    const redactValue = (value: any): any => {
      if (value == null) return value
      if (typeof value === 'string') {
        // Basic redaction for obvious secret-like strings
        if (/[Pp]ass(word)?|[Ss]ecret|token|key|password/.test(value)) {
          return '[REDACTED]'
        }
        return value
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        return value
      }
      if (Array.isArray(value)) {
        return value.map((v) => redactValue(v))
      }
      if (typeof value === 'object') {
        const clone: any = {}
        for (const k of Object.keys(value)) {
          const v = (value as any)[k]
          if (redactedKeys.has(k.toLowerCase())) {
            clone[k] = '[REDACTED]'
          } else {
            clone[k] = redactValue(v)
          }
        }
        return clone
      }
      return value
    }

    // Shallow clone to avoid mutating original object
    const cloned: LogEntry = {
      ...entry,
      context: entry.context ? redactValue(entry.context) : entry.context,
    }
    // If there are top-level properties that might contain secrets, redact them as well
    for (const key of Object.keys(cloned)) {
      if (key === 'context') continue
      // @ts-ignore - allow dynamic keys in the log entry
      ;(cloned as any)[key] = redactValue((cloned as any)[key])
    }
    return cloned
  }

  debug(message: string, context?: Record<string, any>) {
    if (!this.isDevelopment) return

    const entry = this.createLogEntry('debug', message, context)
    this.consoleLog(entry)
  }

  info(message: string, context?: Record<string, any>) {
    const entry = this.createLogEntry('info', message, context)

    if (this.isDevelopment) {
      this.consoleLog(entry)
    } else {
      this.sendToLoggingService(entry)
    }
  }

  warn(message: string, context?: Record<string, any>, error?: Error) {
    const entry = this.createLogEntry('warn', message, context, error)

    if (this.isDevelopment) {
      this.consoleLog(entry)
    } else {
      this.sendToLoggingService(entry)
    }
  }

  error(message: string, context?: Record<string, any>, error?: Error) {
    const entry = this.createLogEntry('error', message, context, error)

    // Always log errors, both in dev and production
    this.consoleLog(entry)

    if (!this.isDevelopment) {
      this.sendToLoggingService(entry)
    }
  }

  // Special method for API request logging
  apiRequest(method: string, path: string, context?: Record<string, any>) {
    this.info(`API ${method} ${path}`, {
      type: 'api_request',
      method,
      path,
      ...context,
    })
  }

  // Special method for API response logging
  apiResponse(
    method: string,
    path: string,
    status: number,
    duration?: number,
    context?: Record<string, any>
  ) {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info'

    this[level](`API ${method} ${path} - ${status}`, {
      type: 'api_response',
      method,
      path,
      status,
      duration,
      ...context,
    })
  }

  // Special method for database operations
  database(operation: string, table: string, context?: Record<string, any>) {
    this.debug(`DB ${operation} on ${table}`, {
      type: 'database',
      operation,
      table,
      ...context,
    })
  }

  // Special method for performance monitoring
  performance(operation: string, duration: number, context?: Record<string, any>) {
    const level = duration > 5000 ? 'warn' : duration > 2000 ? 'info' : 'debug'

    this[level](`Performance: ${operation} took ${duration}ms`, {
      type: 'performance',
      operation,
      duration,
      ...context,
    })
  }
}

export const logger = new Logger()

// Convenience exports for backward compatibility
export const log = logger.info.bind(logger)
export const logError = logger.error.bind(logger)
export const logWarn = logger.warn.bind(logger)
export const logDebug = logger.debug.bind(logger)
