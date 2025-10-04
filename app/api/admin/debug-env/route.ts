import { NextRequest, NextResponse } from 'next/server'
import { DebugEnvManager } from '@/lib/admin/debug-env-manager'
import { isAdmin } from '@/lib/auth/is-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Require admin authentication
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: 'Unauthorized - Admin access required' },
      { status: 403 }
    )
  }

  const manager = new DebugEnvManager()
  const status = await manager.gatherEnvironmentStatus()

  return NextResponse.json(status, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
