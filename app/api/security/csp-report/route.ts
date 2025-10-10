import { NextRequest, NextResponse } from 'next/server'
import { logCSPViolation } from '@/lib/audit/logger'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

/**
 * CSP Violation Reporting Endpoint
 * Handles Content Security Policy violation reports from browsers
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const contentType = request.headers.get('content-type') || ''

    let violationReport: any

    // CSP reports can come in different formats
    if (contentType.includes('application/csp-report')) {
      const body = await request.json()
      violationReport = body['csp-report'] || body
    } else if (contentType.includes('application/json')) {
      violationReport = await request.json()
    } else {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
    }

    // Extract client information
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip')?.trim() ||
      'unknown'

    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Log the violation
    await logCSPViolation(violationReport, ipAddress, userAgent)

    // Determine severity
    const severity = assessViolationSeverity(violationReport)

    // Log high-severity violations to application logger immediately
    if (severity === 'high' || severity === 'critical') {
      logger.warn('High-severity CSP violation detected', {
        scope: 'security',
        violatedDirective: violationReport['violated-directive'],
        blockedUri: violationReport['blocked-uri'],
        documentUri: violationReport['document-uri'],
        sourceFile: violationReport['source-file'],
        ipAddress,
        severity,
      })
    }

    // Return 204 No Content (standard for CSP report endpoints)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    logger.error('Failed to process CSP violation report', { error })

    // Still return 204 to prevent browser errors
    return new NextResponse(null, { status: 204 })
  }
}

/**
 * Assess the severity of a CSP violation
 */
function assessViolationSeverity(report: any): 'low' | 'medium' | 'high' | 'critical' {
  const violatedDirective = report['violated-directive'] || ''
  const blockedUri = report['blocked-uri'] || ''
  const documentUri = report['document-uri'] || ''

  // Critical: inline-script or eval violations (potential XSS)
  if (
    violatedDirective.includes('script-src') &&
    (blockedUri.includes('eval') || blockedUri.includes('inline'))
  ) {
    return 'critical'
  }

  // High: script-src violations from external domains
  if (violatedDirective.includes('script-src') && blockedUri.startsWith('http')) {
    return 'high'
  }

  // High: frame-src violations (potential clickjacking)
  if (violatedDirective.includes('frame-src')) {
    return 'high'
  }

  // Medium: connect-src violations (API/websocket issues)
  if (violatedDirective.includes('connect-src')) {
    return 'medium'
  }

  // Medium: img-src or style-src violations
  if (violatedDirective.includes('img-src') || violatedDirective.includes('style-src')) {
    return 'medium'
  }

  // Low: everything else
  return 'low'
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}
