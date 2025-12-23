import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withCache, CACHE_TTL } from '@/lib/cache'
import { computeAvailability } from '@/lib/availability'

type AvailabilityPayload = { date: string; availableSlots: string[]; blockedReason?: string }

// Logic moved to lib/availability.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date')
  const adults = parseInt(searchParams.get('adults') || '0')
  const children = parseInt(searchParams.get('children') || '0')
  const babies = parseInt(searchParams.get('babies') || '0')

// Memo cache is provided by '@/lib/memoCache'
  const langParam = searchParams.get('lang')

  if (!dateParam || !langParam) {
    return NextResponse.json({ error: 'Params manquants' }, { status: 400 })
  }

  const peopleNeeded = adults + children + babies 
  const requestedLang = langParam

  if (peopleNeeded === 0) return NextResponse.json({ date: dateParam, availableSlots: [] })

  try {
    // TEMPORAIRE: Désactiver le cache pour debug
    // const cacheKey = `availability:${dateParam}:${langParam}:${adults}:${children}:${babies}`
    
    // Fetch boats
    const boats = await prisma.boat.findMany({ 
      where: { status: 'ACTIVE' },
      orderBy: { id: 'asc' } 
    })

    if (boats.length === 0) {
      return NextResponse.json({ date: dateParam, availableSlots: [] })
    }

    // Fenêtre du jour en UTC "flottant" (pas de décalage local)
    const dayStartUtc = new Date(`${dateParam}T00:00:00.000Z`)
    const dayEndUtc = new Date(`${dateParam}T23:59:59.999Z`)
    
    const bookings = await prisma.booking.findMany({
      where: {
        startTime: { gte: dayStartUtc, lte: dayEndUtc },
        status: { not: 'CANCELLED' }
      }
    })

    // Debug logging
    console.log(`[AVAILABILITY DEBUG] Date: ${dateParam}, Lang: ${requestedLang}`)
    console.log(`[AVAILABILITY DEBUG] Found ${bookings.length} bookings for this day`)
    bookings.forEach(b => {
      console.log(`  - Booking ${b.id}: ${b.startTime.toISOString()} | Lang: ${b.language} | People: ${b.numberOfPeople}`)
    })

    // Fetch any blocks overlapping the requested day once
    const blocks = await prisma.blockedInterval.findMany({
      where: {
        start: { lte: dayEndUtc },
        end: { gte: dayStartUtc },
      }
    })

    // If a full-day block exists, short-circuit to no availability
    const hasFullDayBlock = blocks.some(b => {
      if (b.scope !== 'day') return false
      const bStart = new Date(b.start)
      const bEnd = new Date(b.end)
      return bStart <= dayStartUtc && bEnd >= dayEndUtc
    })
    
    if (hasFullDayBlock) {
      const reason = blocks.find(b => b.scope === 'day')?.reason || 'Journée indisponible'
      return NextResponse.json({ date: dateParam, availableSlots: [], blockedReason: reason })
    }

    const result = computeAvailability({
      dateParam,
      requestedLang,
      peopleNeeded,
      boats,
      bookings,
      blocks
    })
    
    console.log(`[AVAILABILITY DEBUG] Result: ${result.availableSlots.length} slots, includes 14:25: ${result.availableSlots.includes('14:25')}`)
    
    return NextResponse.json(result)

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
// (memo cache calls are inside the GET handler)