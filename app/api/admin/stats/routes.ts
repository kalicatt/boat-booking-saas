import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseISO, startOfDay, endOfDay } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startParam = searchParams.get('start')
  const endParam = searchParams.get('end')

  if (!startParam || !endParam) {
    return NextResponse.json({ error: 'Dates manquantes' }, { status: 400 })
  }

  const startDate = parseISO(startParam)
  const endDate = parseISO(endParam)

  // Filtre de base pour toutes les requêtes
  const whereClause = {
    startTime: { gte: startDate, lte: endDate },
    status: { not: 'CANCELLED' } // On ne compte pas les annulés dans le CA
  }

  try {
    // 1. CHIFFRES CLÉS (Sommes)
    const totals = await prisma.booking.aggregate({
      where: whereClause,
      _sum: {
        totalPrice: true,
        numberOfPeople: true
      },
      _count: {
        id: true // Nombre de réservations
      }
    })

    // 2. RÉPARTITION PAR LANGUE (Pour camembert)
    const byLanguage = await prisma.booking.groupBy({
      by: ['language'],
      where: whereClause,
      _count: {
        id: true
      }
    })

    // 3. RÉPARTITION PAR BARQUE (Pour voir la plus utilisée)
    const byBoat = await prisma.booking.groupBy({
      by: ['boatId'],
      where: whereClause,
      _count: {
        id: true
      },
      _sum: {
        numberOfPeople: true
      }
    })

    // On récupère les noms des barques pour l'affichage
    const boatNames = await prisma.boat.findMany({ select: { id: true, name: true } })

    // On formate les données barques pour le frontend
    const formattedBoats = byBoat.map(item => {
      const boat = boatNames.find(b => b.id === item.boatId)
      return {
        name: boat?.name || 'Inconnu',
        count: item._count.id,
        people: item._sum.numberOfPeople || 0
      }
    })

    return NextResponse.json({
      revenue: totals._sum.totalPrice || 0,
      passengers: totals._sum.numberOfPeople || 0,
      bookingsCount: totals._count.id || 0,
      byLanguage,
      byBoat: formattedBoats
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erreur calcul stats" }, { status: 500 })
  }
}