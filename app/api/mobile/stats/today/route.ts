import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const STAFF_ROLES = ['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN', 'EMPLOYEE']

/**
 * API mobile: Récupérer les statistiques du jour
 * 
 * GET /api/mobile/stats/today
 */
export async function GET(request: Request) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role || 'GUEST'
  if (!STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    // Compter les check-ins du jour
    const checkinsCount = await prisma.booking.count({
      where: {
        checkinStatus: 'EMBARQUED',
        updatedAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    })

    // Calculer le total des paiements du jour (PAID)
    const paymentsResult = await prisma.booking.aggregate({
      where: {
        paymentStatus: 'PAID',
        paidAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      _sum: {
        totalPrice: true
      },
      _count: true
    })

    const totalAmount = paymentsResult._sum.totalPrice || 0
    const paymentsCount = paymentsResult._count

    // Dernière réservation embarquée
    const lastCheckin = await prisma.booking.findFirst({
      where: {
        checkinStatus: 'EMBARQUED',
        updatedAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      include: {
        user: true,
        boat: true
      }
    })

    return NextResponse.json({
      today: {
        checkinsCount,
        paymentsCount,
        totalAmount,
        lastCheckin: lastCheckin ? {
          id: lastCheckin.id,
          publicReference: lastCheckin.publicReference,
          customerName: `${lastCheckin.user?.firstName || ''} ${lastCheckin.user?.lastName || ''}`.trim(),
          boat: lastCheckin.boat?.name,
          time: lastCheckin.startTime.toISOString(),
          checkedInAt: lastCheckin.updatedAt.toISOString()
        } : null
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[mobile/stats/today] failed', message)
    return NextResponse.json({ error: 'Unable to fetch stats', details: message }, { status: 500 })
  }
}
