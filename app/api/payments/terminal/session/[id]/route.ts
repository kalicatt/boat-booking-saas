import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { completeSessionSuccess, failSession, getSession, updateSessionStatus } from '@/lib/payments/paymentSessions'
import { cancelTapToPayIntent } from '@/lib/payments/stripeTerminal'

export const runtime = 'nodejs'

const STAFF_ROLES = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN', 'EMPLOYEE']

type PatchPayload = {
  status?: 'processing' | 'succeeded' | 'failed' | 'cancelled'
  deviceId?: string
  intentId?: string
  message?: string
  payload?: unknown
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role || 'GUEST'
  if (!STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'Missing session id' }, { status: 400 })
  }

  let payload: PatchPayload
  try {
    payload = await request.json()
  } catch {
    payload = {}
  }

  if (!payload.status) {
    return NextResponse.json({ error: 'status is required' }, { status: 400 })
  }
  const normalizedStatus = payload.status.toLowerCase()
  if (!['processing', 'succeeded', 'failed', 'cancelled'].includes(normalizedStatus)) {
    return NextResponse.json({ error: 'Unsupported status' }, { status: 400 })
  }
  if (!payload.deviceId) {
    return NextResponse.json({ error: 'deviceId is required' }, { status: 400 })
  }

  try {
    const sessionRecord = await getSession(id)
    if (!sessionRecord) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (sessionRecord.claimedByDeviceId && sessionRecord.claimedByDeviceId !== payload.deviceId) {
      return NextResponse.json({ error: 'Session claimed by another device' }, { status: 409 })
    }

    if (normalizedStatus === 'processing') {
      await updateSessionStatus(id, 'PROCESSING', { processingAt: new Date() })
      return NextResponse.json({ status: 'PROCESSING' })
    }

    if (normalizedStatus === 'cancelled') {
      if (sessionRecord.intentId) {
        try {
          await cancelTapToPayIntent(sessionRecord.intentId)
        } catch (error) {
          console.warn('[terminal/session] cancel intent failed', error)
        }
      }
      await updateSessionStatus(id, 'CANCELLED', { lastError: payload.message || null, completedAt: new Date() })
      await prisma.payment.updateMany({ where: { paymentSessionId: id }, data: { status: 'cancelled', rawPayload: payload.payload ?? undefined } })
      return NextResponse.json({ status: 'CANCELLED' })
    }

    if (normalizedStatus === 'succeeded') {
      await completeSessionSuccess(id)
      await prisma.payment.updateMany({
        where: { paymentSessionId: id },
        data: {
          status: 'succeeded',
          rawPayload: payload.payload ?? undefined
        }
      })
      if (sessionRecord.bookingId) {
        await prisma.booking.update({ where: { id: sessionRecord.bookingId }, data: { isPaid: true } })
      }
      return NextResponse.json({ status: 'SUCCEEDED' })
    }

    if (normalizedStatus === 'failed') {
      const errorMessage = payload.message || 'Payment failed'
      await failSession(id, errorMessage)
      await prisma.payment.updateMany({
        where: { paymentSessionId: id },
        data: {
          status: 'failed',
          rawPayload: payload.payload ?? undefined
        }
      })
      return NextResponse.json({ status: 'FAILED', message: errorMessage })
    }

    return NextResponse.json({ status: 'IGNORED' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[terminal/session] patch failed', message)
    return NextResponse.json({ error: 'Unable to update session', details: message }, { status: 500 })
  }
}
