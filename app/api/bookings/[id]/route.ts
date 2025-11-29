import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendMail } from '@/lib/mailer'
import { EMAIL_FROM, EMAIL_ROLES } from '@/lib/emailAddresses'

function makeCancelToken(id: string){
  const secret = process.env.NEXTAUTH_SECRET || 'changeme'
  return crypto.createHmac('sha256', secret).update(id).digest('hex').slice(0,16)
}

import type { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }){
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const token = searchParams.get('token') || ''

  if(action !== 'cancel'){
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  }

  const { id } = await params
  try {
    const booking = await prisma.booking.findUnique({ where: { id } , include: { user: true } })
    if(!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const expected = makeCancelToken(id)
    if(token !== expected){
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
    }

    if(booking.status === 'CANCELLED'){
      return NextResponse.json({ success: true, status: 'CANCELLED' })
    }

    const now = new Date()
    if(booking.startTime <= now){
      return NextResponse.json({ error: 'Too late to cancel' }, { status: 400 })
    }

    const updated = await prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } })

    // Notify customer + admin
    const admin = EMAIL_ROLES.notifications
    const toCustomer = booking.user?.email || admin
    await sendMail({
      to: toCustomer,
      subject: `Annulation confirmée – Réservation ${booking.id}`,
      text: `Votre réservation a bien été annulée. ID: ${booking.id}. Si ce n'était pas prévu, contactez-nous: ${EMAIL_ROLES.contact}.`,
      from: EMAIL_FROM.reservations,
      replyTo: EMAIL_ROLES.contact
    })
    await sendMail({
      to: admin,
      subject: `Annulation effectuée – ${booking.id}`,
      text: `La réservation ${booking.id} a été annulée par lien. Client: ${booking.user?.email || 'inconnu'}.`,
      from: EMAIL_FROM.notifications
    })

    return NextResponse.json({ success: true, status: updated.status })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'Cancel failed', details: String(msg) }, { status: 500 })
  }
}
import { addMinutes, format } from 'date-fns'
import { auth } from '@/auth' // 👈 Import de la fonction auth
import { createLog } from '@/lib/logger'

const TOUR_DURATION = 25

// 1. FIX: Interface pour dire à TypeScript que firstName existe
interface ExtendedUser {
  firstName?: string | null
  lastName?: string | null
}

interface AdminSessionUser {
  id?: string | null
}

// --- DELETE : Supprimer une réservation ---
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Le middleware NextAuth est censé protéger cette route.
  // On utilise 'auth' pour vérifier la session.
  const session = await auth()
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  // Casting de l'utilisateur
  const user = session.user as ExtendedUser
  const { id } = await params 

  try {
    // Delete dependent payments first to avoid FK constraint errors
    await prisma.payment.deleteMany({ where: { bookingId: id } })
    await prisma.booking.delete({ where: { id } })

    const userName = user.firstName || 'Admin'
    await createLog('DELETE_BOOKING', `Réservation ${id} supprimée par ${userName}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE réservation:', error)
    return NextResponse.json({ error: "Erreur serveur lors de la suppression." }, { status: 500 })
  }
}

// --- PATCH : Mettre à jour une réservation ---
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }
  
  const { id } = await params
  const user = session.user as ExtendedUser

  try {
    const body = await request.json()
    const { start, date, time, newCheckinStatus, newIsPaid, adults, children, babies, language, paymentMethod } = body

    const dataToUpdate: Prisma.BookingUpdateInput = {}
    const userName = user.firstName || 'Admin'
    let logMessage = `Admin ${userName} met à jour réservation ${id}: `

    // Time update: either explicit 'start' ISO or 'date' + 'time'
    if (start || (date && time)) {
      let startTime: Date
      if (start) {
        startTime = new Date(start)
      } else {
        startTime = new Date(`${date}T${time}:00.000Z`)
      }
      const endTime = addMinutes(startTime, TOUR_DURATION)
      dataToUpdate.startTime = startTime
      dataToUpdate.endTime = endTime
      logMessage += `Nouvelle heure → ${format(startTime, 'HH:mm')}. `
    }

    if (newCheckinStatus !== undefined) {
      dataToUpdate.checkinStatus = newCheckinStatus
      logMessage += `Check-in = ${newCheckinStatus}. `
    }

    if (newIsPaid !== undefined) {
      dataToUpdate.isPaid = newIsPaid
      logMessage += `Paiement = ${newIsPaid}. `
    }

    if (adults !== undefined) { dataToUpdate.adults = adults; logMessage += `Adultes=${adults}. ` }
    if (children !== undefined) { dataToUpdate.children = children; logMessage += `Enfants=${children}. ` }
    if (babies !== undefined) { dataToUpdate.babies = babies; logMessage += `Bebes=${babies}. ` }
    if (language !== undefined) { dataToUpdate.language = language; logMessage += `Langue=${language}. ` }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: "Aucune donnée à mettre à jour." }, { status: 400 })
    }

    const existingBooking = await prisma.booking.findUnique({ where: { id } })
    if (!existingBooking) {
      return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
    }

    const nextAdults = typeof adults === 'number' ? adults : existingBooking.adults ?? 0
    const nextChildren = typeof children === 'number' ? children : existingBooking.children ?? 0
    const nextBabies = typeof babies === 'number' ? babies : existingBooking.babies ?? 0
    const nextNumberOfPeople = nextAdults + nextChildren + nextBabies

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        ...dataToUpdate,
        numberOfPeople: nextNumberOfPeople
      }
    })

    // If period is locked (daily closure exists for booking day), block time/payment edits
    const dayStart = new Date(updatedBooking.startTime); dayStart.setUTCHours(0,0,0,0)
    const closedDay = await prisma.dailyClosure.findFirst({ where: { day: dayStart, locked: true } })
    if (closedDay) {
      if (start || (date && time) || newIsPaid !== undefined) {
        return NextResponse.json({ error: 'Période clôturée: modifications interdites' }, { status: 403 })
      }
    }

    // Ensure payment record and ledger if marking paid and method provided
    if (newIsPaid === true && paymentMethod && typeof paymentMethod === 'object') {
      const existing = await prisma.payment.findFirst({ where: { bookingId: id } })
      if (!existing) {
        const provider = paymentMethod.provider
        const methodType = paymentMethod.methodType
        const isVoucher = provider === 'voucher' || methodType === 'ANCV' || methodType === 'CityPass'
        const pay = await prisma.payment.create({
          data: {
            bookingId: id,
            provider: provider || 'manual',
            methodType: methodType || (isVoucher ? methodType : undefined),
            amount: Math.round((updatedBooking.totalPrice || 0) * 100),
            currency: 'EUR',
            status: 'succeeded'
          }
        })
        logMessage += `PaymentRecord=${provider}${methodType?`:${methodType}`:''}. `

        // Append ledger entry with VAT breakdown (VAT from env, default 20%)
        const gross = Math.round((updatedBooking.totalPrice || 0) * 100)
        const vatRateEnv = process.env.VAT_RATE ? parseFloat(process.env.VAT_RATE) : 20.0
        const vatRate = isFinite(vatRateEnv) ? vatRateEnv : 20.0
        const net = Math.round(gross / (1 + vatRate/100))
        const vat = gross - net
        // Allocate year-scoped sequential receipt number in a transaction
        const sessionUser = session.user as AdminSessionUser | null
        await prisma.$transaction(async (tx) => {
          const year = new Date().getUTCFullYear()
          const seqName = `receipt_${year}`
          const seq = await tx.sequence.upsert({
            where: { name: seqName },
            create: { name: seqName, current: 1 },
            update: { current: { increment: 1 } }
          })
          const receiptNo = seq.current
            return tx.paymentLedger.create({ data: {
            eventType: 'PAID', bookingId: id, paymentId: pay.id,
            provider, methodType, amount: gross, currency: 'EUR', actorId: sessionUser?.id ?? null,
            vatRate, netAmount: net, vatAmount: vat, grossAmount: gross, receiptNo
          }})
        })
      }
    }

    await createLog('UPDATE_BOOKING_ADMIN', logMessage)

    return NextResponse.json({ success: true, booking: updatedBooking })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Erreur PATCH réservation:', msg)
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 })
  }
}