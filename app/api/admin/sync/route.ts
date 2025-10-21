import { auth } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/auth/is-admin'
import { NextRequest, NextResponse } from 'next/server'
import { buildRateLimiter, getClientIp } from '@/lib/security/rate-limit'

export const dynamic = 'force-dynamic'

type SyncType = 'judges' | 'courts' | 'decisions'

interface SyncRequestBody {
  type?: SyncType
}

const ALLOWED_SYNC_TYPES: SyncType[] = ['judges', 'courts', 'decisions']

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await ensureAdminAccess()

    // SECURITY: Rate limit admin sync endpoint to prevent abuse
    const rateLimiter = buildRateLimiter({
      tokens: 10,
      window: '1 m',
      prefix: 'admin:sync',
    })
    const ip = getClientIp(request)
    const { success } = await rateLimiter.limit(`${ip}:${userId}`)
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const { type } = await parseRequestBody(request)

    simulateSyncTrigger(type, userId)

    return NextResponse.json({
      success: true,
      message: `${type} sync triggered successfully`,
      jobId: `sync-${type}-${Date.now()}`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({ error: extractMessage(error) }, { status: statusCodeFor(error) })
  }
}

async function ensureAdminAccess(): Promise<string> {
  const { userId } = await auth()
  if (!userId || !(await isAdmin())) {
    throw new Error('Forbidden')
  }
  return userId
}

async function parseRequestBody(request: Request): Promise<Required<SyncRequestBody>> {
  const body = (await request.json().catch(() => ({}))) as SyncRequestBody
  if (!body.type || !ALLOWED_SYNC_TYPES.includes(body.type)) {
    throw new ValidationError('Invalid sync type. Must be judges, courts, or decisions')
  }
  return { type: body.type }
}

function simulateSyncTrigger(type: SyncType, userId: string): void {
  console.log(`Triggering ${type} sync by admin user ${userId}`)
}

function extractMessage(error: unknown): string {
  if (error instanceof ValidationError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Internal server error'
}

function statusCodeFor(error: unknown): number {
  if (error instanceof ValidationError) {
    return 400
  }
  if (error instanceof Error && error.message === 'Forbidden') {
    return 403
  }
  return 500
}

class ValidationError extends Error {}
