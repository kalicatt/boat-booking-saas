import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addMinutes, areIntervalsOverlapping, isSameMinute } from 'date-fns'
import { createLog } from '@/lib/logger'
import { BookingRequestSchema } from '@/lib/validation'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { nanoid } from 'nanoid'
import { memoInvalidateByDate } from '@/lib/memoCache'
import { getParisTodayISO, getParisNowParts, parseParisWallDate } from '@/lib/time'
import { MIN_BOOKING_DELAY_MINUTES } from '@/lib/config'
import { auth } from '@/auth'
import type { Booking, Prisma } from '@prisma/client'
import { generateSeasonalBookingReference } from '@/lib/bookingReference'
import { sendBookingConfirmationEmail } from '@/lib/bookingConfirmationEmail'

// --- CONFIGURATION ---
const TOUR_DURATION = 25
const BUFFER_TIME = 5
const OPEN_TIME = "10:00" // <--- 10h00
const INTERVAL = 10
const PRICE_ADULT = 9
const PRICE_CHILD = 4
const PRICE_BABY = 0

type ManualPaymentMetadata = {
  voucher?: {
    partnerId?: string
    partnerLabel?: string
    reference?: string
    quantity?: number
    totalAmount?: string
    autoTotal?: boolean
  }
  check?: {
    number?: string
    bank?: string
    quantity?: number
    amount?: string
  }
}

type ManualPaymentPayload = {
  provider?: string
  methodType?: string
  metadata?: ManualPaymentMetadata
}

type AdminSessionUser = {
  id?: string | null
}

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

    const adminSession = isStaffOverride ? await auth() : null
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
    const { instant: myStart, wallHour, wallMinute } = parseParisWallDate(date, time)
    const myEnd = addMinutes(myStart, TOUR_DURATION)
    const myTotalEnd = addMinutes(myEnd, BUFFER_TIME)

    const people = adults + children + babies
    const paymentMethodObject: ManualPaymentPayload | null =
      typeof paymentMethod === 'object' && paymentMethod !== null
        ? (paymentMethod as ManualPaymentPayload)
        : null
    const paymentMethodDetails = paymentMethodObject
      ? { provider: paymentMethodObject.provider, methodType: paymentMethodObject.methodType }
      : undefined
    const paymentMethodValue = typeof paymentMethod === 'string'
      ? paymentMethod
      : paymentMethodDetails?.provider
    const instantCaptureMethods = new Set(['cash', 'paypal', 'applepay', 'googlepay', 'voucher', 'check', 'ANCV', 'CityPass'])
    const shouldMarkPaid = Boolean(markAsPaid && paymentMethodValue && instantCaptureMethods.has(paymentMethodValue))

    // --- VALIDATION HORAIRES ---
    // On utilise getUTCHours() car on a forcé le Z (UTC)
    const minutesTotal = wallHour * 60 + wallMinute

    // Plages : 10h00 (600) -> 11h45 (705) ET 13h30 (810) -> 17h45 (1065)
    const isMorning = (minutesTotal >= 600 && minutesTotal <= 705)
    const isAfternoon = (minutesTotal >= 810 && minutesTotal <= 1065)

    if (!isMorning && !isAfternoon) {
        return NextResponse.json({ error: `Horaire ${time} impossible. (10h-11h45 / 13h30-17h45)` }, { status: 400 })
    }

    // 2.b VERROU: Interdiction de réserver trop près du départ
    // On compare dans la même "échelle murale" que le front (dates locales traitées comme UTC)
    const pad = (n: number) => String(n).padStart(2, '0')
    const todayLocalISO = getParisTodayISO()
    const { hh: hhNow, mm: mmNow } = getParisNowParts()
    if (date === todayLocalISO) {
      const hh = pad(hhNow)
      const mm = pad(mmNow)
      const { instant: wallNow } = parseParisWallDate(todayLocalISO, `${hh}:${mm}`)
      const diffMs = myStart.getTime() - wallNow.getTime()
      if (diffMs < MIN_BOOKING_DELAY_MINUTES * 60 * 1000 && !isStaffOverride) {
        return NextResponse.json({ error: `Réservation trop tardive: moins de ${MIN_BOOKING_DELAY_MINUTES} minutes avant le départ.` }, { status: 400 })
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
    const initialEmail = (userDetails.email || '').trim()
    const isPlaceholderEmail = !initialEmail || initialEmail.toLowerCase() === 'override@sweetnarcisse.local'
    let userEmailToUse = initialEmail
    if (isStaffOverride && isPlaceholderEmail) {
      const uniqueId = nanoid(6)
      const safeLastName = (userDetails.lastName || 'Inconnu').replace(/\s+/g, '').toLowerCase()
      const safeFirstName = (userDetails.firstName || 'Client').replace(/\s+/g, '').toLowerCase()
      userEmailToUse = `guichet.${safeLastName}.${safeFirstName}.${uniqueId}@local.com`
    }

    if (!userEmailToUse) {
      return NextResponse.json({ error: 'Adresse email manquante pour la réservation.' }, { status: 400 })
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
      const publicReference = await generateSeasonalBookingReference(tx, myStart)

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
          invoiceEmail: invoiceEmail || null,
          isPaid: pendingOnly ? false : shouldMarkPaid,
          publicReference
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

    // 7. EMAIL CONFIRMATION (uniquement si la réservation est déjà confirmée)
    if (!pendingOnly) {
      try {
        await sendBookingConfirmationEmail(createdBooking.id, { invoiceEmail })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('Email send failed:', message)
        await createLog('EMAIL_ERROR', `Échec envoi confirmation ${userEmailToUse}: ${message}`)
      }
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
              const chainedAltReference = await generateSeasonalBookingReference(prisma, startChain)
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
                  isPaid: Boolean(inheritPaymentForChain && (paymentMethodValue || paymentMethodDetails)),
                  publicReference: chainedAltReference
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
          const chainedReference = await generateSeasonalBookingReference(prisma, startChain)
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
              isPaid: Boolean(inheritPaymentForChain && (paymentMethodValue || paymentMethodDetails)),
              publicReference: chainedReference
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
              const chainedExtraReference = await generateSeasonalBookingReference(prisma, startChain)
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
                  isPaid: Boolean(inheritPaymentForChain && (paymentMethodValue || paymentMethodDetails)),
                  publicReference: chainedExtraReference
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
      if (isStaffOverride && txResult.ok && shouldMarkPaid && paymentMethodValue) {
        const amountMinor = Math.round((txResult as TxResultOk).finalPrice * 100)
        const isLegacyVoucher = paymentMethodValue === 'ANCV' || paymentMethodValue === 'CityPass'
        const resolvedProvider = paymentMethodObject?.provider || (isLegacyVoucher ? 'voucher' : paymentMethodValue)
        const resolvedMethodType = paymentMethodObject?.methodType || (isLegacyVoucher ? paymentMethodValue : undefined)

        const paymentRecord = await prisma.payment.create({
          data: {
            provider: resolvedProvider || 'manual',
            methodType: resolvedMethodType,
            bookingId: createdBooking.id,
            amount: amountMinor,
            currency: 'EUR',
            status: 'succeeded',
            rawPayload: paymentMethodObject as Prisma.InputJsonValue | undefined
          }
        })

        if (resolvedProvider === 'voucher' || resolvedProvider === 'check') {
          const vatRateEnv = process.env.VAT_RATE ? parseFloat(process.env.VAT_RATE) : 20.0
          const vatRate = Number.isFinite(vatRateEnv) ? vatRateEnv : 20.0
          const gross = amountMinor
          const net = Math.round(gross / (1 + vatRate / 100))
          const vat = gross - net
          const manualMetadata = paymentMethodObject?.metadata
          let ledgerNote: string | undefined
          if (manualMetadata?.voucher) {
            const voucherParts = [
              manualMetadata.voucher.partnerLabel,
              manualMetadata.voucher.reference ? `Ref ${manualMetadata.voucher.reference}` : null,
              manualMetadata.voucher.quantity ? `x${manualMetadata.voucher.quantity}` : null,
              manualMetadata.voucher.totalAmount ? `${manualMetadata.voucher.totalAmount}€` : null
            ].filter(Boolean) as string[]
            ledgerNote = voucherParts.length ? voucherParts.join(' • ') : undefined
          } else if (manualMetadata?.check) {
            const checkParts = [
              manualMetadata.check.number ? `Chèque ${manualMetadata.check.number}` : null,
              manualMetadata.check.bank,
              manualMetadata.check.quantity ? `x${manualMetadata.check.quantity}` : null,
              manualMetadata.check.amount ? `${manualMetadata.check.amount}€` : null
            ].filter(Boolean) as string[]
            ledgerNote = checkParts.length ? checkParts.join(' • ') : undefined
          }

          const sessionUser = (adminSession?.user as AdminSessionUser | null) ?? null

          await prisma.$transaction(async (tx) => {
            const year = new Date().getUTCFullYear()
            const seqName = `receipt_${year}`
            const seq = await tx.sequence.upsert({
              where: { name: seqName },
              create: { name: seqName, current: 1 },
              update: { current: { increment: 1 } }
            })
            const receiptNo = seq.current
            await tx.paymentLedger.create({
              data: {
                eventType: 'PAID',
                bookingId: createdBooking.id,
                paymentId: paymentRecord.id,
                provider: resolvedProvider,
                methodType: resolvedMethodType,
                amount: gross,
                currency: 'EUR',
                actorId: sessionUser?.id ?? null,
                vatRate,
                netAmount: net,
                vatAmount: vat,
                grossAmount: gross,
                receiptNo,
                note: ledgerNote
              }
            })
          })
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('Erreur enregistrement paiement guichet', msg)
      return NextResponse.json({ error: 'Erreur paiement', details: String(msg) }, { status: 500 })
    }

    // Invalidate memo availability cache for this date
    memoInvalidateByDate(date)

    return NextResponse.json({ success: true, bookingId: createdBooking.id, status: createdBooking.status, booking: createdBooking, chainCreated, overlaps })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("ERREUR API:", msg)
    return NextResponse.json({ error: "Erreur technique" }, { status: 500 })
  }
}