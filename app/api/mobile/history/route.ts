import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMobileUser, isStaff, forbiddenResponse } from '@/lib/mobileAuth'
import type { Prisma, CheckinStatus } from '@prisma/client'

/**
 * GET /api/mobile/history
 * 
 * Récupère l'historique des réservations avec check-ins
 * 
 * Query params:
 * - limit: number (default 50, max 200)
 * - offset: number (default 0)
 * - dateFrom: ISO date (default today - 7 days)
 * - dateTo: ISO date (default today)
 * - status: PENDING | CONFIRMED | EMBARQUED | COMPLETED | CANCELLED
 * - boat: boat name
 * 
 * Response:
 * {
 *   bookings: [{
 *     id: string,
 *     publicReference: string,
 *     customerName: string,
 *     customerEmail: string,
 *     boat: string,
 *     date: string (YYYY-MM-DD),
 *     slot: string (HH:MM - HH:MM),
 *     checkinStatus: string,
 *     checkinAt: string | null,
 *     paymentStatus: string,
 *     paymentMethod: string | null,
 *     paidAt: string | null,
 *     totalPrice: number,
 *     adults: number,
 *     children: number,
 *     infants: number,
 *     createdAt: string
 *   }],
 *   total: number,
 *   limit: number,
 *   offset: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification mobile (admin ou employee)
    const user = await getMobileUser(request)
    if (!isStaff(user)) {
      return forbiddenResponse()
    }

    const { searchParams } = new URL(request.url)
    
    // Paramètres pagination
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Paramètres filtres
    const status = searchParams.get('status')
    const boat = searchParams.get('boat')
    
    // Dates par défaut: derniers 7 jours
    const defaultDateFrom = new Date()
    defaultDateFrom.setDate(defaultDateFrom.getDate() - 7)
    defaultDateFrom.setHours(0, 0, 0, 0)
    
    const defaultDateTo = new Date()
    defaultDateTo.setHours(23, 59, 59, 999)
    
    const dateFrom = searchParams.get('dateFrom') 
      ? new Date(searchParams.get('dateFrom')!)
      : defaultDateFrom
      
    const dateTo = searchParams.get('dateTo')
      ? new Date(searchParams.get('dateTo')!)
      : defaultDateTo

    // Construire le where clause
    const where: Prisma.BookingWhereInput = {
      date: {
        gte: dateFrom,
        lte: dateTo
      }
    }
    
    if (status) {
      where.checkinStatus = status as CheckinStatus
    }
    
    if (boat) {
      where.boat = { is: { name: boat } }
    }

    // Récupérer les bookings
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: [
          { date: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit,
        skip: offset,
        select: {
          id: true,
          publicReference: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          boat: {
            select: {
              name: true
            }
          },
          date: true,
          startTime: true,
          endTime: true,
          checkinStatus: true,
          isPaid: true,
          totalPrice: true,
          adults: true,
          children: true,
          babies: true,
          createdAt: true
        }
      }),
      prisma.booking.count({ where })
    ])

    // Formater la réponse
    const formattedBookings = bookings.map(booking => ({
      id: booking.id,
      publicReference: booking.publicReference,
      customerName: `${booking.user.firstName} ${booking.user.lastName}`,
      customerEmail: booking.user.email,
      boat: booking.boat?.name || 'Non assigné',
      date: booking.date.toISOString().split('T')[0],
      slot: `${booking.startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${booking.endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      checkinStatus: booking.checkinStatus,
      isPaid: booking.isPaid,
      totalPrice: booking.totalPrice,
      adults: booking.adults,
      children: booking.children,
      babies: booking.babies,
      createdAt: booking.createdAt.toISOString()
    }))

    return NextResponse.json({
      bookings: formattedBookings,
      total,
      limit,
      offset
    })

  } catch (error) {
    console.error('[MOBILE_HISTORY_ERROR]', error)
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
}
