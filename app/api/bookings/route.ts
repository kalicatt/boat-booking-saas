import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addMinutes, parseISO, areIntervalsOverlapping, isSameMinute } from 'date-fns'
import { Resend } from 'resend'
import { BookingTemplate } from '@/components/emails/BookingTemplate'
import { createLog } from '@/lib/logger'
import { BookingRequestSchema } from '@/lib/validation'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { nanoid } from 'nanoid'
import { memoInvalidateByDate } from '@/lib/memoCache'
import { getParisTodayISO, getParisNowParts } from '@/lib/time'

const resend = new Resend(process.env.RESEND_API_KEY)

// --- CONFIGURATION ---
const TOUR_DURATION = 25
const BUFFER_TIME = 5
const OPEN_TIME = "10:00" // <--- 10h00
const INTERVAL = 10
const PRICE_ADULT = 9
const PRICE_CHILD = 4
const PRICE_BABY = 0

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const rl = rateLimit({ key: `booking:create:${ip}`, limit: 50, windowMs: 60_000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Trop de requêtes', retryAfter: rl.retryAfter }, { status: 429 })
    const json = await request.json()
    const parsed = BookingRequestSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', issues: parsed.error.flatten() }, { status: 422 })
    }
    const pendingOnly = Boolean((json as any)?.pendingOnly)
    const { date, time, adults, children, babies, language, userDetails, isStaffOverride, captchaToken, message, paymentMethod } = parsed.data as any

    // 1. CAPTCHA
    if (!isStaffOverride) {
        if (!captchaToken) return NextResponse.json({ error: "Captcha requis" }, { status: 400 })
        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`
        const captchaRes = await fetch(verifyUrl, { method: 'POST' })
        const captchaData = await captchaRes.json()
        if (!captchaData.success) return NextResponse.json({ error: "Captcha invalide" }, { status: 400 })
    }

    // 2. DATES (CONSTRUCTION UTC STRICTE)
    // On force la date en UTC pour que 10:00 reste 10:00 (pas de TZ locale)
    const isoDateTime = `${date}T${time}:00.000Z`
    const myStart = new Date(isoDateTime)
    const myEnd = addMinutes(myStart, TOUR_DURATION)
    const myTotalEnd = addMinutes(myEnd, BUFFER_TIME)

    const people = adults + children + babies
    const finalPrice = (adults * PRICE_ADULT) + (children * PRICE_CHILD) + (babies * PRICE_BABY)

    // --- VALIDATION HORAIRES ---
    // On utilise getUTCHours() car on a forcé le Z (UTC)
    const currentHours = myStart.getUTCHours()
    const currentMinutes = myStart.getUTCMinutes()
    const minutesTotal = currentHours * 60 + currentMinutes

    // Plages : 10h00 (600) -> 11h45 (705) ET 13h30 (810) -> 17h45 (1065)
    const isMorning = (minutesTotal >= 600 && minutesTotal <= 705)
    const isAfternoon = (minutesTotal >= 810 && minutesTotal <= 1065)

    if (!isMorning && !isAfternoon) {
        return NextResponse.json({ error: `Horaire ${time} impossible. (10h-11h45 / 13h30-17h45)` }, { status: 400 })
    }

    // 2.b VERROU: Interdiction de réserver moins de 5 minutes avant le départ
    // On compare dans la même "échelle murale" que le front (dates locales traitées comme UTC)
    const pad = (n: number) => String(n).padStart(2, '0')
    const todayLocalISO = getParisTodayISO()
    const { hh: hhNow, mm: mmNow } = getParisNowParts()
    if (date === todayLocalISO) {
      const hh = pad(hhNow)
      const mm = pad(mmNow)
      const wallNow = new Date(`${todayLocalISO}T${hh}:${mm}:00.000Z`)
      const diffMs = myStart.getTime() - wallNow.getTime()
      if (diffMs <= 5 * 60 * 1000 && !isStaffOverride) {
        return NextResponse.json({ error: `Réservation trop tardive: moins de 5 minutes avant le départ.` }, { status: 400 })
      }
    }

    // 3. CHARGEMENT BARQUES
    const boats = await prisma.boat.findMany({ where: { status: 'ACTIVE' }, orderBy: { id: 'asc' } })
    if (boats.length === 0) return NextResponse.json({ error: "Aucune barque active" }, { status: 500 })
    
    // 4. CALCUL ROTATION (Basé sur 10h00)
    const startHourRef = parseInt(OPEN_TIME.split(':')[0])
    const startMinRef = parseInt(OPEN_TIME.split(':')[1])
    const startTimeInMinutes = startHourRef * 60 + startMinRef
    
    // Calcul des slots écoulés depuis 10h00
    const slotsElapsed = (minutesTotal - startTimeInMinutes) / INTERVAL
    
    // Rotation simple : 10h00 = Bateau 0, 10h10 = Bateau 1, etc.
    const boatIndex = ((Math.floor(slotsElapsed) % boats.length) + boats.length) % boats.length
    const targetBoat = boats[boatIndex]

    if (!targetBoat) return NextResponse.json({ error: "Erreur rotation barque." }, { status: 409 })

    // 5. VERROU + CONFLITS (transaction)
    const slotKey = Math.floor(myStart.getTime() / 60000) // minutes epoch (int32)

    // 6. CLIENT UNIQUE
    let userEmailToUse = userDetails.email;
    if (isStaffOverride) {
        const uniqueId = nanoid(6);
        const safeLastName = (userDetails.lastName || 'Inconnu').replace(/\s+/g, '').toLowerCase();
        const safeFirstName = (userDetails.firstName || 'Client').replace(/\s+/g, '').toLowerCase();
        userEmailToUse = `guichet.${safeLastName}.${safeFirstName}.${uniqueId}@local.com`;
    }

    let txResult: any
    try {
    txResult = await prisma.$transaction(async (tx) => {
      // verrou de transaction par (boatId, slotKey)
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${targetBoat.id}, ${slotKey})`;

      // Re-vérifier les conflits sous verrou
      const conflicts = await tx.booking.findMany({
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
      if (realConflicts.length === 0) canBook = true 
      else {
          const isExactStart = realConflicts.every(b => isSameMinute(b.startTime, myStart))
          const isSameLang = realConflicts.every(b => b.language === language)
          const totalPeople = realConflicts.reduce((sum, b) => sum + b.numberOfPeople, 0)
          if ((isExactStart && isSameLang && (totalPeople + people <= targetBoat.capacity)) || isStaffOverride === true) canBook = true
      }

      if (!canBook) {
        return { ok: false as const, conflict: true as const }
      }

      // Création sous verrou
      const newBooking = await tx.booking.create({
        data: {
          date: new Date(`${date}T00:00:00.000Z`),
          startTime: myStart,
          endTime: myEnd,
          numberOfPeople: people,
          adults, children, babies,
          language,
          totalPrice: finalPrice,
          status: pendingOnly ? 'PENDING' : 'CONFIRMED',
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
          },
          isPaid: pendingOnly ? false : true
        }
      })

      return { ok: true as const, id: newBooking.id, status: newBooking.status, finalPrice }
    })
    } catch (e: any) {
      console.error('Transaction booking failed:', e?.message || e)
      return NextResponse.json({ error: 'Erreur technique (transaction)', details: String(e?.message || e) }, { status: 500 })
    }

    if (!('ok' in txResult) || !txResult.ok) {
      return NextResponse.json({ error: `Conflit sur ${targetBoat.name}` }, { status: 409 })
    }

    const logPrefix = isStaffOverride ? "[STAFF OVERRIDE] " : ""
    await createLog("NEW_BOOKING", `${logPrefix}Réservation de ${userDetails.lastName} (${people}p) sur ${targetBoat.name}`)

    // 8. Enregistrer le paiement si guichet
    try {
      if (isStaffOverride && txResult.ok) {
        const amountMinor = Math.round((txResult as any).finalPrice * 100)
        const method = paymentMethod as string | undefined
        if (method === 'cash') {
          await prisma.payment.create({ data: { provider: 'cash', bookingId: txResult.id, amount: amountMinor, currency: 'EUR', status: 'succeeded' } })
        } else if (method === 'card') {
          await prisma.payment.create({ data: { provider: 'card', bookingId: txResult.id, amount: amountMinor, currency: 'EUR', status: 'succeeded' } })
        } else if (method === 'paypal') {
          await prisma.payment.create({ data: { provider: 'paypal', bookingId: txResult.id, amount: amountMinor, currency: 'EUR', status: 'succeeded' } })
        } else if (method === 'applepay') {
          await prisma.payment.create({ data: { provider: 'applepay', bookingId: txResult.id, amount: amountMinor, currency: 'EUR', status: 'succeeded' } })
        } else if (method === 'googlepay') {
          await prisma.payment.create({ data: { provider: 'googlepay', bookingId: txResult.id, amount: amountMinor, currency: 'EUR', status: 'succeeded' } })
        } else if (method === 'ANCV' || method === 'CityPass') {
          await prisma.payment.create({ data: { provider: 'voucher', methodType: method, bookingId: txResult.id, amount: amountMinor, currency: 'EUR', status: 'succeeded' } })
        }
      }
    } catch (e: any) { 
      console.error('Erreur enregistrement paiement guichet', e?.message || e)
      return NextResponse.json({ error: 'Erreur paiement', details: String(e?.message || e) }, { status: 500 })
    }

    // 9. EMAIL
    try {
      if (!pendingOnly && userEmailToUse && !userEmailToUse.endsWith('@local.com') && userEmailToUse.includes('@')) {
          await resend.emails.send({
            from: 'Sweet Narcisse <onboarding@resend.dev>',
            to: [userEmailToUse],
            subject: 'Confirmation de votre tour en barque 🛶',
            react: await BookingTemplate({ 
              firstName: userDetails.firstName,
              date, time, people, adults, children, babies,
              totalPrice: finalPrice,
              bookingId: txResult.id
            })
          })
      }
    } catch (e) { console.error("Erreur email", e) }

    // Invalidate memo availability cache for this date
    memoInvalidateByDate(date)

    return NextResponse.json({ success: true, bookingId: txResult.id, status: txResult.status })
  } catch (error) {
    console.error("ERREUR API:", error)
    return NextResponse.json({ error: "Erreur technique" }, { status: 500 })
  }
}