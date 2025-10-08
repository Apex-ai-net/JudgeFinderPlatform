import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/server'
import { updateUserRole } from '@/lib/auth/roles'
import { encrypt } from '@/lib/security/encryption'
import { extractAuditContext, logPIIAccess, logPIIModification, logEncryptionOperation } from '@/lib/audit/logger'

export const dynamic = 'force-dynamic'

const payloadSchema = z.object({
  firm_name: z.string().min(2),
  firm_type: z.enum(['solo', 'small', 'medium', 'large', 'enterprise']),
  contact_email: z.string().email(),
  contact_phone: z.string().optional(),
  bar_number: z.string().min(3),
  bar_state: z.string().min(2),
  website: z.string().url().optional(),
  description: z.string().optional(),
  specializations: z.array(z.string()).optional(),
  billing_email: z.string().email().optional(),
  billing_address: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await request.json()
    const parsed = payloadSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const supabase = await createServerClient()

    // Extract audit context
    const auditContext = extractAuditContext(request, userId, userId)

    // If profile already exists, log access and return it
    const { data: existing } = await supabase
      .from('advertiser_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      // Log PII access
      await logPIIAccess(
        auditContext,
        'advertiser_profile',
        existing.id,
        ['bar_number', 'contact_email', 'contact_phone', 'billing_email']
      )
      return NextResponse.json({ profile: existing })
    }

    // Encrypt sensitive PII fields
    const encryptedBarNumber = encrypt(parsed.data.bar_number)

    // Log encryption operation
    await logEncryptionOperation(
      auditContext,
      'encrypt',
      'advertiser_profile',
      'new_profile',
      ['bar_number']
    )

    const insertPayload = {
      user_id: userId,
      ...parsed.data,
      bar_number: encryptedBarNumber, // Store encrypted
      account_status: 'pending',
      verification_status: 'pending',
    }

    const { data: created, error } = await supabase
      .from('advertiser_profiles')
      .insert(insertPayload)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }

    // Log PII modification (creation)
    await logPIIModification(
      auditContext,
      'advertiser_profile',
      created.id,
      ['bar_number', 'contact_email', 'contact_phone', 'billing_email', 'billing_address'],
      'create'
    )

    // Update Clerk role metadata
    const role = parsed.data.firm_type === 'solo' ? 'attorney' : 'law_firm'
    await updateUserRole(userId, role)

    return NextResponse.json({ profile: created })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}


