import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { updateSessionStatus } from '@/lib/payments/paymentSessions'
import type { PaymentSessionStatus } from '@prisma/client'

export const runtime = 'nodejs'

const STAFF_ROLES = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN', 'EMPLOYEE']

/**
 * API mobile: Mettre à jour le status d'une PaymentSession
 * 
 * PATCH /api/mobile/payments/sessions/[id]
 * Body: { status: 'PROCESSING' | 'SUCCEEDED' | 'FAILED', error?: string }
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role || 'GUEST'
  if (!STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = params
    const body = await request.json()
    const status = body?.status as PaymentSessionStatus
    
    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    const validStatuses: PaymentSessionStatus[] = ['PROCESSING', 'SUCCEEDED', 'FAILED', 'EXPIRED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const updateData: any = {}
    if (status === 'FAILED' && body?.error) {
      updateData.lastError = String(body.error)
    }
    if (status === 'SUCCEEDED' || status === 'FAILED') {
      updateData.completedAt = new Date()
    }

    const updated = await updateSessionStatus(id, status, updateData)

    return NextResponse.json({ session: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[mobile/payments/sessions/update] failed', message)
    return NextResponse.json({ error: 'Unable to update session', details: message }, { status: 500 })
  }
}
