import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createLog } from '@/lib/logger'

const AUTHORIZED_ROLES = new Set(['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN'])

type CheckinPayload = {
  status?: 'EMBARQUED' | 'NO_SHOW'
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const role = (session?.user as { role?: string | null } | null)?.role ?? 'GUEST'

  if (!session?.user || !AUTHORIZED_ROLES.has(role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params

  let body: CheckinPayload = {}
  try {
    body = (await request.json()) as CheckinPayload
  } catch {
    // ignore empty bodies
  }

  const nextStatus: 'EMBARQUED' | 'NO_SHOW' = body.status === 'NO_SHOW' ? 'NO_SHOW' : 'EMBARQUED'

  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking) {
    return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
  }

  if (booking.status === 'CANCELLED') {
    return NextResponse.json({ error: 'Réservation annulée' }, { status: 409 })
  }

  if (booking.checkinStatus === nextStatus) {
    return NextResponse.json({ success: true, checkinStatus: booking.checkinStatus })
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { checkinStatus: nextStatus }
  })

  await createLog('BOOKING_CHECKIN', `Check-in ${nextStatus} pour la réservation ${id}`)

  return NextResponse.json({ success: true, checkinStatus: updated.checkinStatus })
}
