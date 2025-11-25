import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addMinutes, parseISO, getHours, getMinutes, areIntervalsOverlapping, isSameMinute } from 'date-fns'
import { Resend } from 'resend'
import { BookingTemplate } from '@/components/emails/BookingTemplate'
import { createLog } from '@/lib/logger'

const resend = new Resend(process.env.RESEND_API_KEY)

// --- CONFIGURATION ---
const TOUR_DURATION = 25
const BUFFER_TIME = 5
const OPEN_TIME = "09:00"

// TARIFS
const PRICE_ADULT = 9
const PRICE_CHILD = 4
const PRICE_BABY = 0

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // On récupère le captchaToken en plus des autres infos
    const { date, time, adults, children, babies, language, userDetails, isStaffOverride, captchaToken } = body

    // ============================================================
    // 1. SÉCURITÉ : VÉRIFICATION CAPTCHA
    // ============================================================
    // On ne vérifie le captcha que si ce n'est PAS un override staff.
    // Le staff (via le dashboard) n'envoie pas de captcha, le public (via le widget) en envoie un.
    
    if (!isStaffOverride) {
        if (!captchaToken) {
            return NextResponse.json({ error: "Veuillez valider le captcha." }, { status: 400 })
        }

        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`
        
        const captchaRes = await fetch(verifyUrl, { method: 'POST' })
        const captchaData = await captchaRes.json()

        if (!captchaData.success) {
            return NextResponse.json({ error: "Échec de la validation Captcha. Êtes-vous un robot ?" }, { status: 400 })
        }
    }
    // ============================================================


    const myStart = parseISO(`${date}T${time}:00`)
    const myEnd = addMinutes(myStart, TOUR_DURATION)
    const myTotalEnd = addMinutes(myEnd, BUFFER_TIME)

    const people = adults + children + babies
    const finalPrice = (adults * PRICE_ADULT) + (children * PRICE_CHILD) + (babies * PRICE_BABY)

    // 2. Charger les barques
    const boats = await prisma.boat.findMany({ 
        where: { status: 'ACTIVE' },
        orderBy: { id: 'asc' }
    })

    // 3. CALCUL ROTATION
    const startHourRef = parseInt(OPEN_TIME.split(':')[0])
    const startMinRef = parseInt(OPEN_TIME.split(':')[1])
    const startTimeInMinutes = startHourRef * 60 + startMinRef

    const currentHours = getHours(myStart)
    const currentMinutes = getMinutes(myStart)
    const minutesTotal = currentHours * 60 + currentMinutes
    
    const slotsElapsed = (minutesTotal - startTimeInMinutes) / 10
    const boatIndex = slotsElapsed % boats.length 
    
    const targetBoat = boats[boatIndex]

    if (!targetBoat) {
        return NextResponse.json({ error: "Aucune barque assignée à ce créneau." }, { status: 409 })
    }

    // 4. VÉRIFICATION CONFLITS
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

        // 5. LOGIQUE DE DÉPASSEMENT DE CAPACITÉ (Staff Override)
        const hasCapacity = (totalPeople + people <= targetBoat.capacity) || isStaffOverride === true

        if (isExactStart && isSameLang && hasCapacity) {
            canBook = true
        }
    }

    if (!canBook) {
         const errorMsg = isStaffOverride 
            ? `Impossible de forcer : Langue ou horaire incompatible sur ${targetBoat.name}.`
            : `Le créneau est complet sur la barque ${targetBoat.name}.`

         return NextResponse.json({ error: errorMsg }, { status: 409 })
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

    // Log : on précise si c'était un override
    const logPrefix = isStaffOverride ? "[STAFF OVERRIDE] " : ""
    await createLog("NEW_BOOKING", `${logPrefix}Réservation de ${userDetails.lastName} (${people}p) sur ${targetBoat.name}`)

    // --- ENVOI EMAIL ---
    try {
      if (userDetails.email && userDetails.email.includes('@')) {
          await resend.emails.send({
            from: 'Sweet Narcisse <onboarding@resend.dev>',
            to: [userDetails.email],
            subject: 'Confirmation de votre tour en barque 🛶',
            react: BookingTemplate({
              firstName: userDetails.firstName,
              date: date,
              time: time,
              people: people,
              adults: adults,
              children: children,
              babies: babies,
              totalPrice: finalPrice,
              bookingId: newBooking.id
            })
          })
      }
    } catch (e) { 
        console.error("Erreur email:", e) 
    }

    return NextResponse.json({ success: true, bookingId: newBooking.id })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erreur technique" }, { status: 500 })
  }
}