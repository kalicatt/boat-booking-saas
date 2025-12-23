import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminAccessContext } from '@/lib/adminAccess'

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
    // Vérifier l'authentification (admin ou employee)
    const adminContext = await getAdminAccessContext()
    if (!adminContext?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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
    const where: any = {
      date: {
        gte: dateFrom,
        lte: dateTo
      }
    }
    
    if (status) {
      where.checkinStatus = status
    }
    
    if (boat) {
      where.boat = boat
    }

    // Récupérer les bookings
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: [
          { date: 'desc' },
          { slot: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit,
        skip: offset,
        select: {
          id: true,
          publicReference: true,
          customerName: true,
          customerEmail: true,
          boat: true,
          date: true,
          slot: true,
          checkinStatus: true,
          updatedAt: true, // Utilisé comme checkinAt si EMBARQUED
          paymentStatus: true,
          paymentMethod: true,
          paidAt: true,
          totalPrice: true,
          adults: true,
          children: true,
          infants: true,
          createdAt: true
        }
      }),
      prisma.booking.count({ where })
    ])

    // Formater la réponse
    const formattedBookings = bookings.map(booking => ({
      id: booking.id,
      publicReference: booking.publicReference,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      boat: booking.boat,
      date: booking.date.toISOString().split('T')[0],
      slot: booking.slot,
      checkinStatus: booking.checkinStatus,
      checkinAt: booking.checkinStatus === 'EMBARQUED' ? booking.updatedAt.toISOString() : null,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      paidAt: booking.paidAt?.toISOString() || null,
      totalPrice: booking.totalPrice,
      adults: booking.adults,
      children: booking.children,
      infants: booking.infants,
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
