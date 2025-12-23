import { NextResponse } from 'next/server'
import { getMobileUser, isStaff, forbiddenResponse } from '@/lib/mobileAuth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/**
 * API mobile: Récupérer les statistiques du jour
 * 
 * GET /api/mobile/stats/today
 * Headers: Authorization: Bearer <token>
 */
export async function GET(request: Request) {
  const user = await getMobileUser(request)
  if (!isStaff(user)) {
    return forbiddenResponse()
  }

  try {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    // Compter les check-ins du jour (réservations avec date aujourd'hui et embarquées)
    const checkinsCount = await prisma.booking.count({
      where: {
        checkinStatus: 'EMBARQUED',
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    })

    // Calculer le total des paiements du jour (isPaid = true, créés aujourd'hui)
    const paymentsResult = await prisma.booking.aggregate({
      where: {
        isPaid: true,
        createdAt: {
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

    // Dernière réservation embarquée du jour
    const lastCheckin = await prisma.booking.findFirst({
      where: {
        checkinStatus: 'EMBARQUED',
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: {
        startTime: 'desc'
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
          checkedInAt: lastCheckin.startTime.toISOString()
        } : null
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[mobile/stats/today] failed', message)
    return NextResponse.json({ error: 'Unable to fetch stats', details: message }, { status: 500 })
  }
}
