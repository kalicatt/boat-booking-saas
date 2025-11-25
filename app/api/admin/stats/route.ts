import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseISO } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startParam = searchParams.get('start')
  const endParam = searchParams.get('end')

  if (!startParam || !endParam) {
    return NextResponse.json({ error: 'Dates manquantes' }, { status: 400 })
  }

  // Conversion des dates
  const startDate = parseISO(startParam)
  const endDate = parseISO(endParam)

  // Filtre commun : Dans la plage de date ET non annulé
  const whereClause = {
    startTime: { gte: startDate, lte: endDate },
    status: { not: 'CANCELLED' } 
  }

  try {
    // 1. CALCULS GLOBAUX (Sommes)
    const totals = await prisma.booking.aggregate({
      where: whereClause,
      _sum: {
        totalPrice: true,    // Somme du CA
        numberOfPeople: true // Somme des passagers
      },
      _count: {
        id: true // Nombre de réservations
      }
    })

    // 2. RÉPARTITION PAR LANGUE
    const byLanguage = await prisma.booking.groupBy({
      by: ['language'],
      where: whereClause,
      _count: {
        id: true
      }
    })

    // 3. RÉPARTITION PAR BARQUE
    // D'abord on groupe les résas par boatId
    const byBoatRaw = await prisma.booking.groupBy({
      by: ['boatId'],
      where: whereClause,
      _sum: {
        numberOfPeople: true // On compte les passagers transportés par barque
      }
    })

    // Ensuite on récupère les noms des barques pour que ce soit lisible
    const allBoats = await prisma.boat.findMany()

    // On fusionne les deux infos (Nom du bateau + Chiffres)
    const byBoat = byBoatRaw.map(item => {
      const boatInfo = allBoats.find(b => b.id === item.boatId)
      return {
        name: boatInfo?.name || `Barque ${item.boatId}`,
        people: item._sum.numberOfPeople || 0
      }
    })

    // 4. ENVOI DE LA RÉPONSE
    return NextResponse.json({
      revenue: totals._sum.totalPrice || 0,
      passengers: totals._sum.numberOfPeople || 0,
      bookingsCount: totals._count.id || 0,
      byLanguage: byLanguage, // Renvoie [{ language: 'FR', _count: { id: 10 } }, ...]
      byBoat: byBoat          // Renvoie [{ name: 'Le Cygne', people: 50 }, ...]
    })

  } catch (error) {
    console.error("Erreur Stats API:", error)
    return NextResponse.json({ error: "Erreur calcul stats" }, { status: 500 })
  }
}