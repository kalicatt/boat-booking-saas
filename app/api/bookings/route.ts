import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addMinutes, areIntervalsOverlapping, isSameMinute } from 'date-fns'
import { Resend } from 'resend'
import { createElement } from 'react'
import { BookingTemplate } from '@/components/emails/BookingTemplate'
import { sendMail } from '@/lib/mailer'
import { renderBookingHtml } from '@/lib/emailRender'
import { createLog } from '@/lib/logger'
import { BookingRequestSchema } from '@/lib/validation'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { nanoid } from 'nanoid'
import { memoInvalidateByDate } from '@/lib/memoCache'
import { getParisTodayISO, getParisNowParts } from '@/lib/time'
import { EMAIL_FROM, EMAIL_ROLES } from '@/lib/emailAddresses'
import type { Booking } from '@prisma/client'
import { generateBookingQrCodeDataUrl } from '@/lib/qr'

const resend: Resend | null = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

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
    const rl = await rateLimit({ key: `booking:create:${ip}`, limit: 50, windowMs: 60_000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Trop de requêtes', retryAfter: rl.retryAfter }, { status: 429 })
    const json = await request.json()
    const parsed = BookingRequestSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', issues: parsed.error.flatten() }, { status: 422 })
    }
    const payload = parsed.data
    const pendingOnly = Boolean(payload.pendingOnly)
    const {
      date,
      time,
      adults,
      children,
      babies,
      language,
      userDetails,
      isStaffOverride,
      captchaToken,
      message,
      paymentMethod,
      markAsPaid,
      invoiceEmail,
      forcedBoatId,
      groupChain,
      inheritPaymentForChain,
      private: isPrivate
    } = payload
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
    const paymentMethodDetails = typeof paymentMethod === 'object' && paymentMethod !== null
      ? { provider: paymentMethod.provider, methodType: paymentMethod.methodType }
      : undefined
    const paymentMethodValue = typeof paymentMethod === 'string'
      ? paymentMethod
      : paymentMethodDetails?.provider
    const shouldMarkPaid = Boolean(markAsPaid && paymentMethodValue)

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

    let targetBoat = undefined as (typeof boats)[number] | undefined

    if (isStaffOverride && typeof forcedBoatId === 'number' && Number.isFinite(forcedBoatId)) {
      targetBoat = boats.find((boat) => boat.id === forcedBoatId)
    }

    if (!targetBoat) {
      // Calcul des slots écoulés depuis 10h00
      const slotsElapsed = (minutesTotal - startTimeInMinutes) / INTERVAL

      // Rotation simple : 10h00 = Bateau 0, 10h10 = Bateau 1, etc.
      const boatIndex = ((Math.floor(slotsElapsed) % boats.length) + boats.length) % boats.length
      targetBoat = boats[boatIndex]
    }

    if (!targetBoat) return NextResponse.json({ error: "Erreur rotation barque." }, { status: 409 })

    // 5. VERROU + CONFLITS (transaction)

    // 6. CLIENT UNIQUE
    let userEmailToUse = userDetails.email;
    if (isStaffOverride) {
        const uniqueId = nanoid(6);
        const safeLastName = (userDetails.lastName || 'Inconnu').replace(/\s+/g, '').toLowerCase();
        const safeFirstName = (userDetails.firstName || 'Client').replace(/\s+/g, '').toLowerCase();
        userEmailToUse = `guichet.${safeLastName}.${safeFirstName}.${uniqueId}@local.com`;
    }

    type TxResultOk = { ok: true; booking: Booking; finalPrice: number }
    type TxResultErr = { ok: false; conflict?: true }
    type TxResult = TxResultOk | TxResultErr
    let txResult: TxResult | undefined
    try {
    txResult = await prisma.$transaction(async (tx) => {
      // Advisory lock disabled for serverless compatibility; relying on conflict checks below.

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

      // Création (privatisation remplit la capacité pour fermer le créneau)
      const paxAdults = isPrivate ? targetBoat.capacity : adults
      const paxChildren = isPrivate ? 0 : children
      const paxBabies = isPrivate ? 0 : babies
      const paxTotal = paxAdults + paxChildren + paxBabies
      const priceTotal = (paxAdults * PRICE_ADULT) + (paxChildren * PRICE_CHILD) + (paxBabies * PRICE_BABY)
      const booking = await tx.booking.create({
        data: {
          date: new Date(`${date}T00:00:00.000Z`),
          startTime: myStart,
          endTime: myEnd,
          numberOfPeople: paxTotal,
          adults: paxAdults, children: paxChildren, babies: paxBabies,
          language,
          totalPrice: priceTotal,
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
          isPaid: pendingOnly ? false : shouldMarkPaid
        }
      })

      return { ok: true as const, booking, finalPrice: priceTotal }
    })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('Transaction booking failed:', msg)
      return NextResponse.json({ error: 'Erreur technique (transaction)', details: String(msg) }, { status: 500 })
    }

    if (!('ok' in txResult) || !txResult.ok) {
      return NextResponse.json({ error: `Conflit sur ${targetBoat.name}` }, { status: 409 })
    }

    const logPrefix = isStaffOverride ? "[STAFF OVERRIDE] " : ""
    await createLog("NEW_BOOKING", `${logPrefix}Réservation de ${userDetails.lastName} (${isPrivate ? targetBoat.capacity : people}p${isPrivate ? ' PRIVATISATION' : ''}) sur ${targetBoat.name}`)

    const createdBooking = txResult.booking

    // 7. EMAIL CONFIRMATION
    try {
      const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')).replace(/\/$/, '')
      const secret = process.env.NEXTAUTH_SECRET || 'changeme'
      const token = (await import('crypto')).createHmac('sha256', secret).update(String(createdBooking.id)).digest('hex').slice(0,16)
      const cancelUrl = `${baseUrl}/api/bookings/${createdBooking.id}?action=cancel&token=${token}`
      const reservationSender = EMAIL_FROM.reservations
      const billingSender = EMAIL_FROM.billing
      const replyToContact = EMAIL_ROLES.contact
      const qrCodeDataUrl = await generateBookingQrCodeDataUrl(String(createdBooking.id))
      const emailProps = {
        firstName: userDetails.firstName || 'Client',
        date,
        time,
        people: isPrivate ? targetBoat.capacity : people,
        adults,
        childrenCount: children,
        babies,
        bookingId: String(createdBooking.id),
        totalPrice: finalPrice,
        qrCodeDataUrl
      }
      const html = await renderBookingHtml(emailProps)
      if(process.env.RESEND_API_KEY && resend){
        await resend.emails.send({ from: reservationSender, to: userEmailToUse, subject: `Confirmation de réservation – ${date} ${time}`, html, replyTo: replyToContact })
      } else {
        await sendMail({ to: userEmailToUse, subject: `Confirmation de réservation – ${date} ${time}`, html, from: reservationSender, replyTo: replyToContact })
      }
      // Also send a simple text with cancel link as fallback
      const cancelText = `Pour annuler votre réservation, cliquez: ${cancelUrl}`
      if(process.env.RESEND_API_KEY && resend){
        await resend.emails.send({ from: reservationSender, to: userEmailToUse, subject: `Lien d'annulation – Réservation ${createdBooking.id}`, text: cancelText, replyTo: replyToContact })
      } else {
        await sendMail({ to: userEmailToUse, subject: `Lien d'annulation – Réservation ${createdBooking.id}`, text: cancelText, from: reservationSender, replyTo: replyToContact })
      }
      await createLog('EMAIL_SENT', `Confirmation envoyée à ${userEmailToUse} pour réservation ${createdBooking.id}`)

      if (invoiceEmail && invoiceEmail !== userEmailToUse) {
        const invoiceSubject = `Facture – Réservation ${date} ${time}`
        if(process.env.RESEND_API_KEY && resend){
          await resend.emails.send({ from: billingSender, to: invoiceEmail, subject: invoiceSubject, html, replyTo: EMAIL_ROLES.billing })
          await resend.emails.send({ from: billingSender, to: invoiceEmail, subject: `Lien d'annulation – Réservation ${createdBooking.id}`, text: cancelText, replyTo: EMAIL_ROLES.billing })
        } else {
          await sendMail({ to: invoiceEmail, subject: invoiceSubject, html, from: billingSender, replyTo: EMAIL_ROLES.billing })
            await sendMail({ to: invoiceEmail, subject: `Lien d'annulation – Réservation ${createdBooking.id}`, text: cancelText, from: billingSender, replyTo: EMAIL_ROLES.billing })
        }
          await createLog('EMAIL_SENT', `Facture envoyée à ${invoiceEmail} pour réservation ${createdBooking.id}`)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('Email send failed:', msg)
      await createLog('EMAIL_ERROR', `Échec envoi confirmation ${userEmailToUse}: ${String(msg)}`)
    }

    // Group chaining: chain consecutive boat slots for large groups
    const chainCreated: Array<{ index: number, boatId: string, start: string, end: string, people: number }> = []
    const overlaps: Array<{ index: number, start: string, end: string, reason: string }> = []
    if (isStaffOverride && groupChain && groupChain > targetBoat.capacity) {
      const chunks = Math.ceil(groupChain / targetBoat.capacity)
      for (let i = 1; i < chunks; i++) {
        const startChain = addMinutes(myStart, i * INTERVAL)
        const endChain = addMinutes(startChain, TOUR_DURATION)
        let remainingForSlot = Math.min(targetBoat.capacity, groupChain - i * targetBoat.capacity)

        // Conflict check for each chained slot
        const conflicting = await prisma.booking.findFirst({
          where: {
            boatId: targetBoat.id,
            date: new Date(`${date}T00:00:00.000Z`),
            startTime: { lt: endChain },
            endTime: { gt: startChain },
            status: { in: ['PENDING', 'CONFIRMED'] }
          },
          select: { id: true, startTime: true, endTime: true }
        })

        if (conflicting) {
          // Try multi-boat distribution: iterate through all other boats by capacity
          const otherBoats = await prisma.boat.findMany({
            where: { id: { not: targetBoat.id }, capacity: { gt: 0 } },
            orderBy: { capacity: 'desc' }
          })
          // placedAny removed — not used
          for (const ob of otherBoats) {
            const otherConflict = await prisma.booking.findFirst({
              where: {
                boatId: ob.id,
                date: new Date(`${date}T00:00:00.000Z`),
                startTime: { lt: endChain },
                endTime: { gt: startChain },
                status: { in: ['PENDING', 'CONFIRMED'] }
              },
              select: { id: true }
            })
            if (otherConflict) continue
            const allocation = Math.min(ob.capacity, remainingForSlot)
            try {
              const chainedAlt = await prisma.booking.create({
                data: {
                  date: new Date(`${date}T00:00:00.000Z`),
                  startTime: startChain,
                  endTime: endChain,
                  numberOfPeople: allocation,
                  adults: allocation, children: 0, babies: 0,
                  language,
                  totalPrice: allocation * PRICE_ADULT,
                  status: 'CONFIRMED',
                  boat: { connect: { id: ob.id } },
                  user: {
                    connectOrCreate: {
                      where: { email: userEmailToUse },
                      create: { firstName: userDetails.firstName, lastName: userDetails.lastName, email: userEmailToUse }
                    }
                  },
                  isPaid: Boolean(inheritPaymentForChain && (paymentMethodValue || paymentMethodDetails))
                }
              })
              chainCreated.push({ index: i, boatId: String(ob.id), start: startChain.toISOString(), end: endChain.toISOString(), people: allocation })
              if (inheritPaymentForChain && (paymentMethodValue || paymentMethodDetails)) {
                await prisma.payment.create({
                  data: {
                    bookingId: chainedAlt.id,
                    provider: paymentMethodDetails?.provider || paymentMethodValue || 'manual',
                    methodType: paymentMethodDetails?.methodType || 'unknown',
                    amount: chainedAlt.totalPrice,
                    currency: 'EUR',
                    status: 'PENDING'
                  }
                })
              }
              remainingForSlot -= allocation
              // placement recorded, continue
              if (remainingForSlot <= 0) break
            } catch {
              continue
            }
          }
          if (remainingForSlot > 0) {
            overlaps.push({ index: i, start: startChain.toISOString(), end: endChain.toISOString(), reason: `Unplaced people ${remainingForSlot}` })
          }
          continue
        }

        try {
          // Primary boat free: allocate on primary first (up to capacity)
          const allocationPrimary = Math.min(targetBoat.capacity, remainingForSlot)
          const chained = await prisma.booking.create({
            data: {
              date: new Date(`${date}T00:00:00.000Z`),
              startTime: startChain,
              endTime: endChain,
              numberOfPeople: allocationPrimary,
              adults: allocationPrimary, children: 0, babies: 0,
              language,
              totalPrice: allocationPrimary * PRICE_ADULT,
              status: 'CONFIRMED',
              boat: { connect: { id: targetBoat.id } },
              user: {
                connectOrCreate: {
                  where: { email: userEmailToUse },
                  create: { firstName: userDetails.firstName, lastName: userDetails.lastName, email: userEmailToUse }
                }
              },
              isPaid: Boolean(inheritPaymentForChain && (paymentMethodValue || paymentMethodDetails))
            }
          })
          chainCreated.push({ index: i, boatId: String(targetBoat.id), start: startChain.toISOString(), end: endChain.toISOString(), people: allocationPrimary })
          // Optionally inherit payment metadata to chained bookings (record intent, not actual capture)
          if (inheritPaymentForChain && (paymentMethodValue || paymentMethodDetails)) {
            await prisma.payment.create({
              data: {
                bookingId: chained.id,
                provider: paymentMethodDetails?.provider || paymentMethodValue || 'manual',
                methodType: paymentMethodDetails?.methodType || 'unknown',
                amount: chained.totalPrice,
                currency: 'EUR',
                status: 'PENDING'
              }
            })
          }
          remainingForSlot -= allocationPrimary
          // If remaining people for this slot, iterate other boats to place them at same time
          if (remainingForSlot > 0) {
            const otherBoats = await prisma.boat.findMany({
              where: { id: { not: targetBoat.id }, capacity: { gt: 0 } },
              orderBy: { capacity: 'desc' }
            })
            for (const ob of otherBoats) {
              const otherConflict = await prisma.booking.findFirst({
                where: {
                  boatId: ob.id,
                  date: new Date(`${date}T00:00:00.000Z`),
                  startTime: { lt: endChain },
                  endTime: { gt: startChain },
                  status: { in: ['PENDING', 'CONFIRMED'] }
                },
                select: { id: true }
              })
              if (otherConflict) continue
              const allocation = Math.min(ob.capacity, remainingForSlot)
              if (allocation <= 0) break
              const chainedExtra = await prisma.booking.create({
                data: {
                  date: new Date(`${date}T00:00:00.000Z`),
                  startTime: startChain,
                  endTime: endChain,
                  numberOfPeople: allocation,
                  adults: allocation, children: 0, babies: 0,
                  language,
                  totalPrice: allocation * PRICE_ADULT,
                  status: 'CONFIRMED',
                  boat: { connect: { id: ob.id } },
                  user: {
                    connectOrCreate: {
                      where: { email: userEmailToUse },
                      create: { firstName: userDetails.firstName, lastName: userDetails.lastName, email: userEmailToUse }
                    }
                  },
                  isPaid: Boolean(inheritPaymentForChain && (paymentMethodValue || paymentMethodDetails))
                }
              })
              chainCreated.push({ index: i, boatId: String(ob.id), start: startChain.toISOString(), end: endChain.toISOString(), people: allocation })
              if (inheritPaymentForChain && (paymentMethodValue || paymentMethodDetails)) {
                await prisma.payment.create({
                  data: {
                    bookingId: chainedExtra.id,
                    provider: paymentMethodDetails?.provider || paymentMethodValue || 'manual',
                    methodType: paymentMethodDetails?.methodType || 'unknown',
                    amount: chainedExtra.totalPrice,
                    currency: 'EUR',
                    status: 'PENDING'
                  }
                })
              }
              remainingForSlot -= allocation
              if (remainingForSlot <= 0) break
            }
            if (remainingForSlot > 0) {
              overlaps.push({ index: i, start: startChain.toISOString(), end: endChain.toISOString(), reason: `Unplaced people ${remainingForSlot}` })
            }
          }
        } catch {
          overlaps.push({ index: i, start: startChain.toISOString(), end: endChain.toISOString(), reason: 'Creation error' })
        }
      }
      if (overlaps.length) {
        await createLog('GROUP_CHAIN_OVERLAPS', `Chain overlaps: ${overlaps.map(o => `#${o.index} ${o.start}-${o.end} ${o.reason}`).join(', ')}`)
      }
    }

    // 8. Enregistrer le paiement si guichet
    try {
      if (isStaffOverride && txResult.ok) {
        const amountMinor = Math.round((txResult as TxResultOk).finalPrice * 100)
        const method = paymentMethodValue
        if (method === 'cash') {
          await prisma.payment.create({ data: { provider: 'cash', bookingId: createdBooking.id, amount: amountMinor, currency: 'EUR', status: 'succeeded' } })
        } else if (method === 'card') {
          await prisma.payment.create({ data: { provider: 'card', bookingId: createdBooking.id, amount: amountMinor, currency: 'EUR', status: 'succeeded' } })
        } else if (method === 'paypal') {
          await prisma.payment.create({ data: { provider: 'paypal', bookingId: createdBooking.id, amount: amountMinor, currency: 'EUR', status: 'succeeded' } })
        } else if (method === 'applepay') {
          await prisma.payment.create({ data: { provider: 'applepay', bookingId: createdBooking.id, amount: amountMinor, currency: 'EUR', status: 'succeeded' } })
        } else if (method === 'googlepay') {
          await prisma.payment.create({ data: { provider: 'googlepay', bookingId: createdBooking.id, amount: amountMinor, currency: 'EUR', status: 'succeeded' } })
        } else if (method === 'ANCV' || method === 'CityPass') {
          await prisma.payment.create({ data: { provider: 'voucher', methodType: method, bookingId: createdBooking.id, amount: amountMinor, currency: 'EUR', status: 'succeeded' } })
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('Erreur enregistrement paiement guichet', msg)
      return NextResponse.json({ error: 'Erreur paiement', details: String(msg) }, { status: 500 })
    }

    // 9. EMAIL
    try {
      if (!pendingOnly && userEmailToUse && !userEmailToUse.endsWith('@local.com') && userEmailToUse.includes('@') && resend) {
          const qrCodeDataUrl = await generateBookingQrCodeDataUrl(String(createdBooking.id))
          await resend.emails.send({
            from: 'Sweet Narcisse <onboarding@resend.dev>',
            to: [userEmailToUse],
            subject: 'Confirmation de votre tour en barque 🛶',
            react: createElement(BookingTemplate, {
              firstName: userDetails.firstName,
              date,
              time,
              people,
              adults,
              childrenCount: children,
              babies,
              totalPrice: finalPrice,
              bookingId: createdBooking.id,
              qrCodeDataUrl
            })
          })
      }
    } catch (e: unknown) { console.error("Erreur email", e instanceof Error ? e.message : String(e)) }

    // Invalidate memo availability cache for this date
    memoInvalidateByDate(date)

    return NextResponse.json({ success: true, bookingId: createdBooking.id, status: createdBooking.status, booking: createdBooking, chainCreated, overlaps })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("ERREUR API:", msg)
    return NextResponse.json({ error: "Erreur technique" }, { status: 500 })
  }
}