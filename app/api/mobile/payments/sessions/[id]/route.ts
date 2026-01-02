import { NextResponse } from 'next/server'
import { getMobileUser, isStaff, forbiddenResponse } from '@/lib/mobileAuth'
import { updateSessionStatus } from '@/lib/payments/paymentSessions'
import type { PaymentSessionStatus, Prisma } from '@prisma/client'

export const runtime = 'nodejs'

/**
 * API mobile: Mettre à jour le status d'une PaymentSession
 * 
 * PATCH /api/mobile/payments/sessions/[id]
 * Body: { status: 'PROCESSING' | 'SUCCEEDED' | 'FAILED', error?: string }
 * Headers: Authorization: Bearer <token>
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getMobileUser(request)
  if (!isStaff(user)) {
    return forbiddenResponse()
  }

  try {
    const { id } = await params
    const body = await request.json()
    const status = body?.status as PaymentSessionStatus
    
    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    const validStatuses: PaymentSessionStatus[] = ['PROCESSING', 'SUCCEEDED', 'FAILED', 'EXPIRED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const updateData: Prisma.PaymentSessionUpdateInput = {}
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
