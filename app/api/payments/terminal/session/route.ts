import { NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/mobileAuth'
import { prisma } from '@/lib/prisma'
import { createPaymentSession } from '@/lib/payments/paymentSessions'

export const runtime = 'nodejs'

const STAFF_ROLES = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN', 'EMPLOYEE']

export async function POST(request: Request) {
  console.log('[terminal/session] POST called')
  const user = await getMobileUser(request)
  const role = user?.role || 'GUEST'
  console.log('[terminal/session] user:', user?.email, 'role:', role)
  if (!user || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const payload = await request.json()
    console.log('[terminal/session] payload:', JSON.stringify(payload))
    const bookingId = typeof payload?.bookingId === 'string' ? payload.bookingId : null
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { boat: true, user: true } })
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const amountCents = typeof payload?.amountCents === 'number' && Number.isFinite(payload.amountCents)
      ? Math.max(1, Math.round(payload.amountCents))
      : Math.max(1, Math.round(booking.totalPrice * 100))

    const currency = typeof payload?.currency === 'string' ? payload.currency.toUpperCase() : 'EUR'
    const targetDeviceId = typeof payload?.targetDeviceId === 'string' ? payload.targetDeviceId : null

    const metadata = {
      bookingReference: booking.publicReference,
      slot: booking.startTime.toISOString(),
      boat: booking.boat?.name,
      customer: `${booking.user?.lastName || ''} ${booking.user?.firstName || ''}`.trim() || undefined
    }

    const created = await createPaymentSession({
      bookingId,
      amount: amountCents,
      currency,
      createdById: user?.userId,
      methodType: 'card',
      targetDeviceId,
      metadata
    })

    console.log('[terminal/session] created session:', created.id, 'status:', created.status, 'targetDevice:', targetDeviceId)
    return NextResponse.json({ session: created })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[terminal/session] create failed', message)
    return NextResponse.json({ error: 'Unable to create payment session', details: message }, { status: 500 })
  }
}
