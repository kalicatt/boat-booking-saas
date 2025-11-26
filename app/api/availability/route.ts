import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addMinutes, areIntervalsOverlapping, isSameMinute } from 'date-fns'
import { memoGet, memoSet } from '@/lib/memoCache'
import { getParisTodayISO, getParisNowMinutes } from '@/lib/time'
import { areIntervalsOverlapping as overlap } from 'date-fns'

// --- CONFIGURATION ---
const TOUR_DURATION = 25
const BUFFER_TIME = 5
const INTERVAL = 10 // Départs toutes les 10 min

// Nouveaux horaires d'ouverture (Base de calcul rotation)
const OPEN_TIME = "10:00" 
const CLOSE_TIME = "18:00" // On scanne large, le filtre précis se fait dans la boucle

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
    // Cache key (memo cache)
    const cacheKey = `availability:${dateParam}:${langParam}:${adults}:${children}:${babies}`
    const memoHit = memoGet(cacheKey)
    if (memoHit) return NextResponse.json(memoHit)
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
      // Consider a day block if it spans the whole day range
      return bStart <= dayStartUtc && bEnd >= dayEndUtc
    })
    if (hasFullDayBlock) {
      const reason = blocks.find(b => b.scope === 'day')?.reason || 'Journée indisponible'
      const result = { date: dateParam, availableSlots: [], blockedReason: reason }
      memoSet(cacheKey, result)
      return NextResponse.json(result)
    }

    const availableSlots: string[] = []
    // Itération "mur du temps" avec simple compteur minutes pour éviter tout décalage de fuseau
    const openParts = OPEN_TIME.split(':').map(Number)
    const closeParts = CLOSE_TIME.split(':').map(Number)
    const openMins = openParts[0] * 60 + openParts[1]
    const closeMins = closeParts[0] * 60 + closeParts[1]

    const startTimeInMinutes = openMins

    // Filtre temps réel côté serveur en TZ boutique (Europe/Paris)
    const todayLocalISO = getParisTodayISO()
    const nowLocalMinutes = getParisNowMinutes()

    for (let minutesTotal = openMins; minutesTotal <= closeMins; minutesTotal += INTERVAL) {
      // 1) Filtre horaires (matin/après-midi)
      const isMorning = (minutesTotal >= 600 && minutesTotal <= 705)
      const isAfternoon = (minutesTotal >= 810 && minutesTotal <= 1065)
      if (!isMorning && !isAfternoon) continue

      // 1.b) Pour la journée d'aujourd'hui, masquage des créneaux déjà passés
      if (dateParam === todayLocalISO && minutesTotal <= nowLocalMinutes + 5) continue

      // 2) Calcul de la barque assignée
      const slotsElapsed = (minutesTotal - startTimeInMinutes) / INTERVAL
      const boatIndex = Math.floor(slotsElapsed) % boats.length
      const assignedBoat = boats[boatIndex]
      if (!assignedBoat) continue

      // 3) Construction de l'intervalle pour comparaison avec la base (en UTC explicite)
      const hh = String(Math.floor(minutesTotal / 60)).padStart(2, '0')
      const mm = String(minutesTotal % 60).padStart(2, '0')
      const slotStartUtc = new Date(`${dateParam}T${hh}:${mm}:00.000Z`)
      const slotEndUtc = addMinutes(slotStartUtc, TOUR_DURATION + BUFFER_TIME)

      const boatBookings = bookings.filter(b => b.boatId === assignedBoat.id)
      const conflicts = boatBookings.filter(b => {
        const busyEnd = addMinutes(b.endTime, BUFFER_TIME)
        return areIntervalsOverlapping(
          { start: slotStartUtc, end: slotEndUtc },
          { start: b.startTime, end: busyEnd }
        )
      })

      // Blocked intervals: exclude slot if overlaps any block
      const blocked = blocks.some(b => overlap({ start: slotStartUtc, end: slotEndUtc }, { start: b.start, end: b.end }))

      let isSlotAvailable = false
      if (!blocked && conflicts.length === 0) {
        isSlotAvailable = true
      } else if (!blocked) {
        const isExactStart = conflicts.every(b => isSameMinute(b.startTime, slotStartUtc))
        const isSameLang = conflicts.every(b => b.language === requestedLang)
        const currentPeople = conflicts.reduce((sum, b) => sum + b.numberOfPeople, 0)
        if (isExactStart && isSameLang && (currentPeople + peopleNeeded <= assignedBoat.capacity)) {
          isSlotAvailable = true
        }
      }

      if (isSlotAvailable) {
        availableSlots.push(`${hh}:${mm}`)
      }
    }

    // If no slots and there were blocks, surface the reason of the most relevant block
    let blockedReason: string | undefined
    if (availableSlots.length === 0 && blocks.length > 0) {
      blockedReason = blocks[0]?.reason || 'Aucun créneau disponible sur ce créneau'
    }
    const result = { date: dateParam, availableSlots, ...(blockedReason ? { blockedReason } : {}) }
    memoSet(cacheKey, result)
    return NextResponse.json(result)

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
// (memo cache calls are inside the GET handler)