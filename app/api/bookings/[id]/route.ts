import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addMinutes, format } from 'date-fns'
import { auth } from '@/auth' // 👈 Import de la fonction auth
import { createLog } from '@/lib/logger'

const TOUR_DURATION = 25
const BUFFER_TIME = 5

// 1. FIX: Interface pour dire à TypeScript que firstName existe
interface ExtendedUser {
  firstName?: string | null
  lastName?: string | null
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

    const dataToUpdate: any = {}
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

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        ...dataToUpdate,
        numberOfPeople: (dataToUpdate.adults ?? 0) + (dataToUpdate.children ?? 0) + (dataToUpdate.babies ?? 0)
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

        // Append ledger entry with VAT breakdown (example VAT 10%)
        const gross = Math.round((updatedBooking.totalPrice || 0) * 100)
        const vatRateEnv = process.env.VAT_RATE ? parseFloat(process.env.VAT_RATE) : 10.0
        const vatRate = isFinite(vatRateEnv) ? vatRateEnv : 10.0
        const net = Math.round(gross / (1 + vatRate/100))
        const vat = gross - net
        // Allocate sequential receipt number in a transaction
        const ledgerEntry = await prisma.$transaction(async (tx) => {
          const seq = await tx.sequence.upsert({
            where: { name: 'receipt' },
            create: { name: 'receipt', current: 1 },
            update: { current: { increment: 1 } }
          })
          const receiptNo = seq.current
          return tx.paymentLedger.create({ data: {
            eventType: 'PAID', bookingId: id, paymentId: pay.id,
            provider, methodType, amount: gross, currency: 'EUR', actorId: (session.user as any)?.id || null,
            vatRate, netAmount: net, vatAmount: vat, grossAmount: gross, receiptNo
          }})
        })
      }
    }

    await createLog('UPDATE_BOOKING_ADMIN', logMessage)

    return NextResponse.json({ success: true, booking: updatedBooking })
  } catch (error) {
    console.error('Erreur PATCH réservation:', error)
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 })
  }
}