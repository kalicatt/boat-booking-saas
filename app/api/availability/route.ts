import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
// Import de isPast pour la nouvelle logique
import { addMinutes, format, parseISO, startOfDay, endOfDay, getHours, getMinutes, areIntervalsOverlapping, isSameMinute, isPast } from 'date-fns'

// --- CONFIGURATION ---
const TOUR_DURATION = 25
const BUFFER_TIME = 5
const INTERVAL = 10 // Départs toutes les 10 min

// Horaires d'ouverture (doivent matcher avec bookings/route.ts)
const OPEN_TIME = "09:00" 
const CLOSE_TIME = "19:00"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date')
  const adults = parseInt(searchParams.get('adults') || '0')
  const children = parseInt(searchParams.get('children') || '0')
  const babies = parseInt(searchParams.get('babies') || '0')
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

    const searchDate = parseISO(dateParam)
    const bookings = await prisma.booking.findMany({
      where: {
        startTime: { gte: startOfDay(searchDate), lte: endOfDay(searchDate) },
        status: { not: 'CANCELLED' }
      }
    })

    const availableSlots: string[] = []
    let currentSlot = parseISO(`${dateParam}T${OPEN_TIME}:00`)
    const endTimeLimit = parseISO(`${dateParam}T${CLOSE_TIME}:00`)

    // --- CALCUL DE RÉFÉRENCE POUR LA ROTATION ---
    const startHourRef = parseInt(OPEN_TIME.split(':')[0])
    const startMinRef = parseInt(OPEN_TIME.split(':')[1])
    const startTimeInMinutes = startHourRef * 60 + startMinRef

    while (currentSlot < endTimeLimit) {
      const slotTime = currentSlot
      const currentHours = getHours(slotTime)
      const currentMinutes = getMinutes(slotTime)
      const minutesTotal = currentHours * 60 + currentMinutes

      // ------------------------------------------
      // 🚀 NOUVELLE LOGIQUE : IGNORER LE PASSÉ
      // ------------------------------------------
      if (isPast(slotTime)) {
          currentSlot = addMinutes(currentSlot, INTERVAL)
          continue
      }
      // ------------------------------------------

      // --- 1. FILTRE PAUSE DÉJEUNER ---
      const LUNCH_START = 12 * 60 + 15
      const LUNCH_END = 13 * 60 + 30
      
      if (minutesTotal > LUNCH_START && minutesTotal < LUNCH_END) {
          currentSlot = addMinutes(currentSlot, INTERVAL)
          continue
      }

      // --- 2. CALCUL DE LA BARQUE ASSIGNÉE (ROTATION) ---
      const slotsElapsed = (minutesTotal - startTimeInMinutes) / 10
      
      const boatIndex = slotsElapsed % boats.length 
      const assignedBoat = boats[boatIndex]

      if (!assignedBoat) {
          currentSlot = addMinutes(currentSlot, INTERVAL)
          continue
      }

      // --- 3. VÉRIFICATION DISPO SUR CETTE BARQUE ---
      const myEnd = addMinutes(slotTime, TOUR_DURATION + BUFFER_TIME)
      const boatBookings = bookings.filter(b => b.boatId === assignedBoat.id)
      
      const conflicts = boatBookings.filter(b => {
          const busyEnd = addMinutes(b.endTime, BUFFER_TIME)
          return areIntervalsOverlapping(
             { start: slotTime, end: myEnd }, 
             { start: b.startTime, end: busyEnd }
          )
      })

      let isSlotAvailable = false

      if (conflicts.length === 0) {
          // Barque vide -> OK
          isSlotAvailable = true
      } else {
          // Barque occupée -> Vérif Langue Stricte + Capacité Restante
          const isExactStart = conflicts.every(b => isSameMinute(b.startTime, slotTime))
          const isSameLang = conflicts.every(b => b.language === requestedLang)
          const currentPeople = conflicts.reduce((sum, b) => sum + b.numberOfPeople, 0)

          if (isExactStart && isSameLang && (currentPeople + peopleNeeded <= assignedBoat.capacity)) {
              isSlotAvailable = true
          }
      }

      if (isSlotAvailable) {
        availableSlots.push(format(slotTime, 'HH:mm'))
      }

      currentSlot = addMinutes(currentSlot, INTERVAL)
    }

    return NextResponse.json({ date: dateParam, availableSlots })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}