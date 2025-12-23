import { prisma } from '@/lib/prisma'
import { ensureAdminPageAccess } from '@/lib/adminAccess'
import { PlanningClientPage } from './PlanningClientPage'
import { startOfWeek, endOfWeek, addDays } from 'date-fns'

export default async function PlanningPage() {
  await ensureAdminPageAccess({
    page: 'planning',
    auditEvent: 'VIEW_PLANNING'
  })

  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  // Récupérer les bateaux actifs
  const boats = await prisma.boat.findMany({
    where: {
      status: {
        in: ['ACTIVE', 'MAINTENANCE']
      }
    },
    select: {
      id: true,
      name: true,
      capacity: true,
      status: true
    },
    orderBy: {
      name: 'asc'
    }
  })

  // Récupérer les réservations de la semaine
  const bookings = await prisma.booking.findMany({
    where: {
      date: {
        gte: weekStart,
        lte: weekEnd
      },
      status: {
        not: 'CANCELLED'
      }
    },
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      numberOfPeople: true,
      adults: true,
      children: true,
      babies: true,
      status: true,
      boatId: true,
      publicReference: true,
      checkinStatus: true,
      language: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true
        }
      }
    },
    orderBy: {
      startTime: 'asc'
    }
  })

  // Transformer les données pour le client
  const transformedBookings = bookings.map(booking => ({
    id: booking.id,
    startTime: booking.startTime,
    endTime: booking.endTime || addDays(booking.startTime, 0),
    customerName: `${booking.user?.firstName || ''} ${booking.user?.lastName || ''}`.trim() || 'Client',
    guests: booking.numberOfPeople,
    adults: booking.adults || 0,
    children: booking.children || 0,
    babies: booking.babies || 0,
    status: (booking.checkinStatus || 'CONFIRMED') as 'CONFIRMED' | 'EMBARQUED' | 'NO_SHOW',
    boatId: booking.boatId ? booking.boatId.toString() : null,
    publicReference: booking.publicReference,
    email: booking.user?.email || null,
    phone: booking.user?.phone || null,
    language: booking.language || 'FR'
  }))

  return <PlanningClientPage boats={boats} bookings={transformedBookings} />
}