import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addMinutes, parseISO, getHours, getMinutes, areIntervalsOverlapping, isSameMinute } from 'date-fns'
import { Resend } from 'resend'
import { BookingTemplate } from '@/components/emails/BookingTemplate'
import { createLog } from '@/lib/logger' // Pour l'audit log

const resend = new Resend(process.env.RESEND_API_KEY)

// --- CONFIGURATION ---
const TOUR_DURATION = 25
const BUFFER_TIME = 5
const OPEN_TIME = "09:00" // Doit être identique à availability

// TARIFS
const PRICE_ADULT = 9
const PRICE_CHILD = 4
const PRICE_BABY = 0

export async function POST(request: Request) {
  try {
    const body = await request.json()
    // On récupère le détail complet
    const { date, time, adults, children, babies, language, userDetails } = body

    const myStart = parseISO(`${date}T${time}:00`)
    const myEnd = addMinutes(myStart, TOUR_DURATION)
    const myTotalEnd = addMinutes(myEnd, BUFFER_TIME)

    // Calculs totaux
    const people = adults + children + babies
    const finalPrice = (adults * PRICE_ADULT) + (children * PRICE_CHILD) + (babies * PRICE_BABY)

    // 1. Charger les barques
    const boats = await prisma.boat.findMany({ 
        where: { status: 'ACTIVE' },
        orderBy: { id: 'asc' }
    })

    // 2. CALCULER QUELLE BARQUE EST DE SERVICE (ROTATION)
    const startHourRef = parseInt(OPEN_TIME.split(':')[0])
    const startMinRef = parseInt(OPEN_TIME.split(':')[1])
    const startTimeInMinutes = startHourRef * 60 + startMinRef

    const currentHours = getHours(myStart)
    const currentMinutes = getMinutes(myStart)
    const minutesTotal = currentHours * 60 + currentMinutes
    
    const slotsElapsed = (minutesTotal - startTimeInMinutes) / 10
    const boatIndex = slotsElapsed % boats.length 
    
    const targetBoat = boats[boatIndex] // LA barque imposée

    if (!targetBoat) {
        return NextResponse.json({ error: "Aucune barque assignée à ce créneau." }, { status: 409 })
    }

    // 3. Vérifier si CETTE barque peut accepter (Double sécurité)
    const conflicts = await prisma.booking.findMany({
      where: {
        boatId: targetBoat.id,
        status: { not: 'CANCELLED' },
        AND: [
             { startTime: { lt: myTotalEnd } },
             { endTime: { gt: myStart } }
        ]
      }
    })

    const realConflicts = conflicts.filter(b => {
        const busyEnd = addMinutes(b.endTime, BUFFER_TIME)
        return areIntervalsOverlapping(
            { start: myStart, end: myTotalEnd },
            { start: b.startTime, end: busyEnd }
        )
    })

    let canBook = false

    if (realConflicts.length === 0) {
        canBook = true
    } else {
        // Si occupée -> Vérif Langue & Place
        const isExactStart = realConflicts.every(b => isSameMinute(b.startTime, myStart))
        const isSameLang = realConflicts.every(b => b.language === language)
        const totalPeople = realConflicts.reduce((sum, b) => sum + b.numberOfPeople, 0)

        if (isExactStart && isSameLang && (totalPeople + people <= targetBoat.capacity)) {
            canBook = true
        }
    }

    if (!canBook) {
         return NextResponse.json({ 
             error: `Le créneau est réservé à la barque ${targetBoat.name} mais elle n'est pas compatible.` 
         }, { status: 409 })
    }

    // --- ENREGISTREMENT ---
    const newBooking = await prisma.booking.create({
      data: {
        date: parseISO(date),
        startTime: myStart,
        endTime: myEnd,
        numberOfPeople: people,
        adults: adults,
        children: children,
        babies: babies,
        language: language,
        totalPrice: finalPrice,
        status: 'CONFIRMED',
        boat: { connect: { id: targetBoat.id } },
        user: {
          connectOrCreate: {
            where: { email: userDetails.email },
            create: { ...userDetails }
          }
        }
      }
    })

    // Log de l'action (optionnel mais bien pour l'admin)
    await createLog("NEW_BOOKING", `Réservation de ${userDetails.lastName} (${people}p) sur ${targetBoat.name}`)

    // --- ENVOI EMAIL ---
   // ... dans la fonction POST, après la création de la réservation ...

    // --- ENVOI EMAIL ---
    try {
      await resend.emails.send({
        from: 'Sweet Narcisse <onboarding@resend.dev>',
        to: [userDetails.email],
        subject: 'Confirmation de votre tour en barque 🛶',
        react: BookingTemplate({
          firstName: userDetails.firstName,
          date: date,
          time: time,
          people: people,
          
          // NOUVEAU: On passe le détail des passagers
          adults: adults,
          children: children,
          babies: babies,
          
          totalPrice: finalPrice,
          bookingId: newBooking.id
        })
      })
    } catch (e) { 
        console.error("Erreur email:", e) 
    }
// ...

    return NextResponse.json({ success: true, bookingId: newBooking.id })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erreur technique" }, { status: 500 })
  }
}