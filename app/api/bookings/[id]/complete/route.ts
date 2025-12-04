import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createLog } from '@/lib/logger'
import { BookingStatus } from '@prisma/client'
import { calculateRideDurationHours } from '@/lib/maintenance'

const AUTHORIZED_ROLES = new Set(['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN'])

type CompletePayload = {
  durationMinutes?: number
  notes?: string
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const role = (session?.user as { role?: string | null } | null)?.role ?? 'GUEST'

  if (!session?.user || !AUTHORIZED_ROLES.has(role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { id } = await params
  let payload: CompletePayload = {}
  try {
    payload = (await request.json()) as CompletePayload
  } catch {
    // optional body
  }

  const booking = await prisma.booking.findUnique({ where: { id }, include: { boat: true } })
  if (!booking || !booking.boatId) {
    return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
  }

  if (booking.status === BookingStatus.CANCELLED) {
    return NextResponse.json({ error: 'Réservation annulée' }, { status: 409 })
  }

  if (booking.status === BookingStatus.COMPLETED) {
    return NextResponse.json({ success: true, alreadyCompleted: true })
  }

  const durationHours = typeof payload.durationMinutes === 'number'
    ? Math.max(0, payload.durationMinutes) / 60
    : calculateRideDurationHours(booking.startTime, booking.endTime)

  try {
    const [updatedBooking, updatedBoat] = await prisma.$transaction([
      prisma.booking.update({ where: { id }, data: { status: BookingStatus.COMPLETED } }),
      prisma.boat.update({
        where: { id: booking.boatId },
        data: {
          totalTrips: { increment: 1 },
          tripsSinceService: { increment: 1 },
          hoursSinceService: { increment: durationHours }
        }
      })
    ])

    await createLog('BOOKING_COMPLETED', `Réservation ${id} complétée par ${session.user.email || session.user.name || 'admin'}`)

    return NextResponse.json({
      success: true,
      booking: { id: updatedBooking.id, status: updatedBooking.status },
      boat: {
        id: updatedBoat.id,
        totalTrips: updatedBoat.totalTrips,
        tripsSinceService: updatedBoat.tripsSinceService,
        hoursSinceService: updatedBoat.hoursSinceService
      }
    })
  } catch (error) {
    await createLog('BOOKING_COMPLETE_FAILED', `Erreur completion ${id}: ${error instanceof Error ? error.message : String(error)}`)
    return NextResponse.json({ error: 'Impossible de finaliser la réservation' }, { status: 500 })
  }
}
