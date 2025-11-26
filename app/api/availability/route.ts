import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addMinutes, areIntervalsOverlapping, isSameMinute, isPast } from 'date-fns'

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
    // Construction des créneaux en UTC explicite
    let currentSlot = new Date(`${dateParam}T${OPEN_TIME}:00.000Z`)
    const endTimeLimit = new Date(`${dateParam}T${CLOSE_TIME}:00.000Z`)

    // --- CALCUL DE RÉFÉRENCE POUR LA ROTATION ---
    const startHourRef = parseInt(OPEN_TIME.split(':')[0])
    const startMinRef = parseInt(OPEN_TIME.split(':')[1])
    const startTimeInMinutes = startHourRef * 60 + startMinRef

    while (currentSlot <= endTimeLimit) { // <= pour inclure potentiellement la dernière limite si elle tombe pile
      const slotTime = currentSlot
      const currentHours = slotTime.getUTCHours()
      const currentMinutes = slotTime.getUTCMinutes()
      const minutesTotal = currentHours * 60 + currentMinutes

      // --- 0. FILTRE PASSÉ ---
      if (isPast(slotTime)) {
          currentSlot = addMinutes(currentSlot, INTERVAL)
          continue
      }

      // --- 1. FILTRES HORAIRES PRÉCIS ---
      // Matin : 10h00 (600min) à 11h45 (705min) inclus
      const isMorning = (minutesTotal >= 600 && minutesTotal <= 705)
      
      // Aprèm : 13h30 (810min) à 17h45 (1065min) inclus
      const isAfternoon = (minutesTotal >= 810 && minutesTotal <= 1065)

      if (!isMorning && !isAfternoon) {
          currentSlot = addMinutes(currentSlot, INTERVAL)
          continue
      }

      // --- 2. CALCUL DE LA BARQUE ASSIGNÉE (ROTATION) ---
      const slotsElapsed = (minutesTotal - startTimeInMinutes) / INTERVAL
      
      const boatIndex = Math.floor(slotsElapsed) % boats.length 
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
          isSlotAvailable = true
      } else {
          const isExactStart = conflicts.every(b => isSameMinute(b.startTime, slotTime))
          const isSameLang = conflicts.every(b => b.language === requestedLang)
          const currentPeople = conflicts.reduce((sum, b) => sum + b.numberOfPeople, 0)

          if (isExactStart && isSameLang && (currentPeople + peopleNeeded <= assignedBoat.capacity)) {
              isSlotAvailable = true
          }
      }

      if (isSlotAvailable) {
        const hh = String(slotTime.getUTCHours()).padStart(2, '0')
        const mm = String(slotTime.getUTCMinutes()).padStart(2, '0')
        availableSlots.push(`${hh}:${mm}`)
      }

      currentSlot = addMinutes(currentSlot, INTERVAL)
    }

    return NextResponse.json({ date: dateParam, availableSlots })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}