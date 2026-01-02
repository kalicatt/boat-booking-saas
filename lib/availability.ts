import { addMinutes, areIntervalsOverlapping, isSameMinute } from 'date-fns'
import { getParisTodayISO, getParisNowMinutes, parseParisWallDate } from '@/lib/time'
import { TOUR_DURATION_MINUTES, TOUR_BUFFER_MINUTES, DEPARTURE_INTERVAL_MINUTES, BOAT_DEPARTURE_OFFSETS_MINUTES, MIN_BOOKING_DELAY_MINUTES } from '@/lib/config'
import type { Boat, Booking, BlockedInterval } from '@prisma/client'

type AvailabilityBoat = Pick<Boat, 'id' | 'capacity'>
type AvailabilityBooking = Pick<Booking, 'boatId' | 'startTime' | 'endTime' | 'language' | 'numberOfPeople'> & {
  reservedSeats?: number | null
  isPrivate?: boolean | null
}
type AvailabilityBlock = Pick<BlockedInterval, 'scope' | 'start' | 'end' | 'reason'>

interface AvailabilityParams {
  dateParam: string
  requestedLang: string
  peopleNeeded: number
  isPrivateRequest?: boolean
  boats: AvailabilityBoat[]
  bookings: AvailabilityBooking[]
  blocks: AvailabilityBlock[]
}

const OPEN_TIME = '10:00'
const CLOSE_TIME = '18:00'

export function computeAvailability({ dateParam, requestedLang, peopleNeeded, isPrivateRequest, boats, bookings, blocks }: AvailabilityParams) {
  if (boats.length === 0) return { date: dateParam, availableSlots: [] }

  const dayStartUtc = new Date(`${dateParam}T00:00:00.000Z`)
  const dayEndUtc = new Date(`${dateParam}T23:59:59.999Z`)

  const hasFullDayBlock = blocks.some(b => {
    if (b.scope !== 'day') return false
    const bStart = new Date(b.start)
    const bEnd = new Date(b.end)
    return bStart <= dayStartUtc && bEnd >= dayEndUtc
  })
  if (hasFullDayBlock) {
    const reason = blocks.find(b => b.scope === 'day')?.reason || 'Journée indisponible'
    return { date: dateParam, availableSlots: [], blockedReason: reason }
  }

  const openParts = OPEN_TIME.split(':').map(Number)
  const closeParts = CLOSE_TIME.split(':').map(Number)
  const openMins = openParts[0] * 60 + openParts[1]
  const closeMins = closeParts[0] * 60 + closeParts[1]
  const startTimeInMinutes = openMins

  const todayLocalISO = getParisTodayISO()
  const nowLocalMinutes = getParisNowMinutes()

  const availableSlots: string[] = []

  const cycleMinutes = TOUR_DURATION_MINUTES + TOUR_BUFFER_MINUTES // 30
  const activeOffsets = BOAT_DEPARTURE_OFFSETS_MINUTES.slice(0, Math.max(1, Math.min(boats.length, BOAT_DEPARTURE_OFFSETS_MINUTES.length)))
  const normalizedRequestedLang = requestedLang.toUpperCase()

  for (let minutesTotal = openMins; minutesTotal < closeMins; minutesTotal += DEPARTURE_INTERVAL_MINUTES) {
    const isMorning = (minutesTotal >= 600 && minutesTotal <= 705)
    const isAfternoon = (minutesTotal >= 810 && minutesTotal <= 1080)
    if (!isMorning && !isAfternoon) continue

    if (dateParam === todayLocalISO && minutesTotal < nowLocalMinutes + MIN_BOOKING_DELAY_MINUTES) continue

    const withinCycle = ((minutesTotal - startTimeInMinutes) % cycleMinutes + cycleMinutes) % cycleMinutes
    const offsetIndex = activeOffsets.findIndex(off => withinCycle === off)
    if (offsetIndex === -1) continue // only generate slots exactly at configured offsets

    // Le bateau assigné à ce créneau est déterminé par l'offsetIndex
    const assignedBoat = boats[offsetIndex]
    if (!assignedBoat) continue

    const hh = String(Math.floor(minutesTotal / 60)).padStart(2, '0')
    const mm = String(minutesTotal % 60).padStart(2, '0')
    
    // IMPORTANT: Convertir l'heure locale Paris en UTC pour la comparaison
    // Le planning affiche 14:25 heure de Paris, qui est stocké comme 13:25 UTC en hiver
    const { instant: slotStartUtc } = parseParisWallDate(dateParam, `${hh}:${mm}`)
    const slotEndUtc = addMinutes(slotStartUtc, TOUR_DURATION_MINUTES + TOUR_BUFFER_MINUTES)

    const blocked = blocks.some(block => areIntervalsOverlapping({ start: slotStartUtc, end: slotEndUtc }, { start: block.start, end: block.end }))
    if (blocked) continue

    // Chercher les réservations qui commencent EXACTEMENT à ce créneau sur N'IMPORTE QUEL bateau
    const exactStartConflicts = bookings.filter(booking => {
      return isSameMinute(booking.startTime, slotStartUtc)
    })

    let isSlotAvailable = false
    
    if (exactStartConflicts.length === 0) {
      // Aucune réservation à cette heure exacte - créneau libre
      isSlotAvailable = true
    } else {
      // Cas privatisation côté client: créneau uniquement si vide (exclusif)
      if (isPrivateRequest) {
        isSlotAvailable = false
      } else {
      // Il y a des réservations à cette heure exacte
      // Vérifier si elles sont TOUTES dans la même langue demandée
      const isSameLang = exactStartConflicts.every(booking => booking.language?.toUpperCase() === normalizedRequestedLang)
      
      // Debug pour 14:25
      if (hh === '14' && mm === '25') {
        console.log(`[DEBUG 14:25] SlotStartUtc: ${slotStartUtc.toISOString()}`)
        console.log(`[DEBUG 14:25] Found ${exactStartConflicts.length} conflicts`)
        console.log(`[DEBUG 14:25] Requested lang: ${normalizedRequestedLang}`)
        exactStartConflicts.forEach(c => {
          console.log(`[DEBUG 14:25] Conflict: lang=${c.language}, people=${c.numberOfPeople}, startTime=${c.startTime.toISOString()}`)
        })
        console.log(`[DEBUG 14:25] isSameLang: ${isSameLang}`)
      }
      
      if (isSameLang) {
        // Même langue - on peut potentiellement rejoindre si capacité OK
        // Trouver le bateau de ces réservations et vérifier sa capacité
        const boatIds = [...new Set(exactStartConflicts.map(b => b.boatId))]
        
        // Pour chaque bateau utilisé, vérifier s'il reste de la place
        let canJoin = false
        for (const boatId of boatIds) {
          const boat = boats.find(b => b.id === boatId)
          if (!boat) continue
          
          const boatBookings = exactStartConflicts.filter(b => b.boatId === boatId)
          const currentSeats = boatBookings.reduce((sum, b) => sum + (b.reservedSeats ?? b.numberOfPeople), 0)

          // Une réservation privative bloque totalement ce bateau sur ce créneau
          const hasPrivate = boatBookings.some((b) => Boolean(b.isPrivate))
          if (hasPrivate) continue
          
          if (currentSeats + peopleNeeded <= boat.capacity) {
            canJoin = true
            break
          }
        }
        
        isSlotAvailable = canJoin
      }
      // Si langue différente, le créneau n'est PAS disponible (isSlotAvailable reste false)
      }
    }

    if (isSlotAvailable) {
      availableSlots.push(`${hh}:${mm}`)
    }
  }

  let blockedReason: string | undefined
  if (availableSlots.length === 0 && blocks.length > 0) {
    blockedReason = blocks[0]?.reason || 'Aucun créneau disponible sur ce créneau'
  }
  return { date: dateParam, availableSlots, ...(blockedReason ? { blockedReason } : {}) }
}
