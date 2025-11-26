import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addMinutes, areIntervalsOverlapping, isSameMinute } from 'date-fns'

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

// --- In-memory memo cache (fallback when Redis is not used) ---
type MemoEntry = { value: { date: string | null; availableSlots: string[] }, expiresAt: number }
const memoCache: Map<string, MemoEntry> = new Map()
const MEMO_TTL_MS = 90 * 1000

function memoGet(key: string): { date: string | null; availableSlots: string[] } | null {
  const e = memoCache.get(key)
  if (!e) return null
  if (Date.now() > e.expiresAt) { memoCache.delete(key); return null }
  return e.value
}

function memoSet(key: string, value: { date: string | null; availableSlots: string[] }) {
  memoCache.set(key, { value, expiresAt: Date.now() + MEMO_TTL_MS })
}

export function memoInvalidateByDate(date: string) {
  const prefix = `availability:${date}:`
  for (const k of memoCache.keys()) {
    if (k.startsWith(prefix)) memoCache.delete(k)
  }
}
  const langParam = searchParams.get('lang')

  if (!dateParam || !langParam) {
    return NextResponse.json({ error: 'Params manquants' }, { status: 400 })
  }

  const peopleNeeded = adults + children + babies 
  const requestedLang = langParam

  if (peopleNeeded === 0) return NextResponse.json({ date: dateParam, availableSlots: [] })

  try {
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

    const availableSlots: string[] = []
    // Itération "mur du temps" avec simple compteur minutes pour éviter tout décalage de fuseau
    const openParts = OPEN_TIME.split(':').map(Number)
    const closeParts = CLOSE_TIME.split(':').map(Number)
    const openMins = openParts[0] * 60 + openParts[1]
    const closeMins = closeParts[0] * 60 + closeParts[1]

    const startTimeInMinutes = openMins

    // Filtre "moins de 5 minutes avant" pour la journée en cours, basé sur l'heure locale
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const todayLocalISO = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const nowLocalMinutes = now.getHours() * 60 + now.getMinutes()

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

      let isSlotAvailable = false
      if (conflicts.length === 0) {
        isSlotAvailable = true
      } else {
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

    return NextResponse.json({ date: dateParam, availableSlots })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
    // Cache key (works for both memo and potential Redis)
    const cacheKey = `availability:${dateParam}:${langParam}:${adults}:${children}:${babies}`
    const memoHit = memoGet(cacheKey)
    if (memoHit) return NextResponse.json(memoHit)