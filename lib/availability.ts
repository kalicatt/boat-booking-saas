import { addMinutes, areIntervalsOverlapping, isSameMinute } from 'date-fns'
import { getParisTodayISO, getParisNowMinutes } from '@/lib/time'
import { TOUR_DURATION_MINUTES, TOUR_BUFFER_MINUTES, DEPARTURE_INTERVAL_MINUTES } from '@/lib/config'
import { areIntervalsOverlapping as overlap } from 'date-fns'

interface AvailabilityParams {
  dateParam: string
  requestedLang: string
  peopleNeeded: number
  boats: any[]
  bookings: any[]
  blocks: any[]
}

const OPEN_TIME = '10:00'
const CLOSE_TIME = '18:00'

export function computeAvailability({ dateParam, requestedLang, peopleNeeded, boats, bookings, blocks }: AvailabilityParams) {
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

  for (let minutesTotal = openMins; minutesTotal <= closeMins; minutesTotal += DEPARTURE_INTERVAL_MINUTES) {
    const isMorning = (minutesTotal >= 600 && minutesTotal <= 705)
    const isAfternoon = (minutesTotal >= 810 && minutesTotal <= 1065)
    if (!isMorning && !isAfternoon) continue

    if (dateParam === todayLocalISO && minutesTotal <= nowLocalMinutes + 5) continue

    const slotsElapsed = (minutesTotal - startTimeInMinutes) / DEPARTURE_INTERVAL_MINUTES
    const boatIndex = Math.floor(slotsElapsed) % boats.length
    const assignedBoat = boats[boatIndex]
    if (!assignedBoat) continue

    const hh = String(Math.floor(minutesTotal / 60)).padStart(2, '0')
    const mm = String(minutesTotal % 60).padStart(2, '0')
    const slotStartUtc = new Date(`${dateParam}T${hh}:${mm}:00.000Z`)
    const slotEndUtc = addMinutes(slotStartUtc, TOUR_DURATION_MINUTES + TOUR_BUFFER_MINUTES)

    const boatBookings = bookings.filter(b => b.boatId === assignedBoat.id)
    const conflicts = boatBookings.filter(b => {
      const busyEnd = addMinutes(b.endTime, TOUR_BUFFER_MINUTES)
      return areIntervalsOverlapping(
        { start: slotStartUtc, end: slotEndUtc },
        { start: b.startTime, end: busyEnd }
      )
    })

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

  let blockedReason: string | undefined
  if (availableSlots.length === 0 && blocks.length > 0) {
    blockedReason = blocks[0]?.reason || 'Aucun créneau disponible sur ce créneau'
  }
  return { date: dateParam, availableSlots, ...(blockedReason ? { blockedReason } : {}) }
}
