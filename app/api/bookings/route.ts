import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addMinutes, parseISO, getHours, getMinutes, areIntervalsOverlapping, isSameMinute } from 'date-fns'
import { Resend } from 'resend'
import { BookingTemplate } from '@/components/emails/BookingTemplate'
import { createLog } from '@/lib/logger'
import { nanoid } from 'nanoid'

const resend = new Resend(process.env.RESEND_API_KEY)

// --- CONFIGURATION ---
const TOUR_DURATION = 25
const BUFFER_TIME = 5
const OPEN_TIME = "10:00" // Ouverture 10h00
const INTERVAL = 10

// TARIFS
const PRICE_ADULT = 9
const PRICE_CHILD = 4
const PRICE_BABY = 0

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const { date, time, adults, children, babies, language, userDetails, isStaffOverride, captchaToken, message } = body

    // 1. SÉCURITÉ : CAPTCHA
    if (!isStaffOverride) {
        if (!captchaToken) return NextResponse.json({ error: "Captcha requis" }, { status: 400 })
        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`
        const captchaRes = await fetch(verifyUrl, { method: 'POST' })
        const captchaData = await captchaRes.json()
        if (!captchaData.success) return NextResponse.json({ error: "Captcha invalide" }, { status: 400 })
    }

    // 2. PRÉPARATION & VALIDATION HORAIRE
    const isoDateTime = `${date}T${time}:00.000Z`; 
    const myStart = new Date(isoDateTime);
    const myEnd = addMinutes(myStart, TOUR_DURATION)
    const myTotalEnd = addMinutes(myEnd, BUFFER_TIME)

    const people = adults + children + babies
    const finalPrice = (adults * PRICE_ADULT) + (children * PRICE_CHILD) + (babies * PRICE_BABY)

    // --- VALIDATION DES PLAGES HORAIRES ---
    const currentHours = myStart.getUTCHours()
    const currentMinutes = myStart.getUTCMinutes()
    const minutesTotal = currentHours * 60 + currentMinutes

    // Plages en minutes :
    // Matin : 10h00 (600) -> 11h45 (705)
    // Après-midi : 13h30 (810) -> 17h45 (1065)
    const isMorning = (minutesTotal >= 600 && minutesTotal <= 705)
    const isAfternoon = (minutesTotal >= 810 && minutesTotal <= 1065)

    if (!isMorning && !isAfternoon) {
        return NextResponse.json({ 
            error: `Horaire impossible. Ouvert de 10h00 à 11h45 et de 13h30 à 17h45.` 
        }, { status: 400 })
    }

    // 3. CHARGER LES BARQUES
    const boats = await prisma.boat.findMany({ where: { status: 'ACTIVE' }, orderBy: { id: 'asc' } })
    if (boats.length === 0) return NextResponse.json({ error: "Aucune barque active" }, { status: 500 })
    
    // 4. CALCUL ROTATION (Basé sur 10h00)
    const startHourRef = parseInt(OPEN_TIME.split(':')[0])
    const startMinRef = parseInt(OPEN_TIME.split(':')[1])
    const startTimeInMinutes = startHourRef * 60 + startMinRef
    
    const slotsElapsed = (minutesTotal - startTimeInMinutes) / INTERVAL
    const boatIndex = Math.floor(slotsElapsed) % boats.length 
    const targetBoat = boats[boatIndex]

    if (!targetBoat) {
        // Normalement impossible grâce au filtre horaire plus haut, mais sécurité
        return NextResponse.json({ error: "Erreur calcul rotation barque." }, { status: 409 })
    }

    // 5. VÉRIFICATION CONFLITS
    const conflicts = await prisma.booking.findMany({
      where: {
        boatId: targetBoat.id,
        status: { not: 'CANCELLED' },
        AND: [ { startTime: { lt: myTotalEnd } }, { endTime: { gt: myStart } } ]
      }
    })
    const realConflicts = conflicts.filter(b => {
        const busyEnd = addMinutes(b.endTime, BUFFER_TIME)
        return areIntervalsOverlapping({ start: myStart, end: myTotalEnd }, { start: b.startTime, end: busyEnd })
    })

    let canBook = false
    if (realConflicts.length === 0) {
        canBook = true 
    } else {
        const isExactStart = realConflicts.every(b => isSameMinute(b.startTime, myStart))
        const isSameLang = realConflicts.every(b => b.language === language)
        const totalPeople = realConflicts.reduce((sum, b) => sum + b.numberOfPeople, 0)
        const hasCapacity = (totalPeople + people <= targetBoat.capacity) || isStaffOverride === true
        if (isExactStart && isSameLang && hasCapacity) canBook = true
    }

    if (!canBook) {
         const errorMsg = isStaffOverride 
            ? `Impossible de forcer : Conflit sur ${targetBoat.name}.`
            : `Le créneau est complet sur la barque ${targetBoat.name}.`
         return NextResponse.json({ error: errorMsg }, { status: 409 })
    }

    // 6. CLIENT (Unique pour guichet)
    let userEmailToUse = userDetails.email;
    if (isStaffOverride) {
        const uniqueId = nanoid(6);
        const safeLastName = (userDetails.lastName || 'Inconnu').replace(/\s+/g, '').toLowerCase();
        const safeFirstName = (userDetails.firstName || 'Client').replace(/\s+/g, '').toLowerCase();
        userEmailToUse = `guichet.${safeLastName}.${safeFirstName}.${uniqueId}@local.com`;
    }

    // 7. ENREGISTREMENT
    const newBooking = await prisma.booking.create({
      data: {
        date: parseISO(date),
        startTime: myStart,
        endTime: myEnd,
        numberOfPeople: people,
        adults, children, babies,
        language,
        totalPrice: finalPrice,
        status: 'CONFIRMED',
        message: message || null,
        boat: { connect: { id: targetBoat.id } },
        user: {
          connectOrCreate: {
            where: { email: userEmailToUse },
            create: { 
                firstName: userDetails.firstName,
                lastName: userDetails.lastName,
                email: userEmailToUse,
                phone: userDetails.phone || null,
            }
          }
        }
      }
    })

    const logPrefix = isStaffOverride ? "[STAFF OVERRIDE] " : ""
    await createLog("NEW_BOOKING", `${logPrefix}Réservation de ${userDetails.lastName} (${people}p) sur ${targetBoat.name}`)

    // 8. EMAIL
    try {
      if (userEmailToUse && !userEmailToUse.endsWith('@local.com') && userEmailToUse.includes('@')) {
          await resend.emails.send({
            from: 'Sweet Narcisse <onboarding@resend.dev>',
            to: [userEmailToUse],
            subject: 'Confirmation de votre tour en barque 🛶',
            react: BookingTemplate({ 
              firstName: userDetails.firstName,
              date, time, people, adults, children, babies,
              totalPrice: finalPrice,
              bookingId: newBooking.id
            })
          })
      }
    } catch (e) { console.error("Erreur email", e) }

    return NextResponse.json({ success: true, bookingId: newBooking.id })
  } catch (error) {
    console.error("ERREUR API:", error)
    return NextResponse.json({ error: "Erreur technique" }, { status: 500 })
  }
}