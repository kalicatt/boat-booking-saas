import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cancelBookingWithToken, BookingCancellationError } from '@/lib/bookingCancellation'
import { sendMail } from '@/lib/mailer'
import { EMAIL_FROM, EMAIL_ROLES } from '@/lib/emailAddresses'
import { parseParisWallDate } from '@/lib/time'

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
    const result = await cancelBookingWithToken(id, token)
    return NextResponse.json({ success: true, status: result.booking.status, alreadyCancelled: result.alreadyCancelled })
  } catch (e: unknown) {
    if (e instanceof BookingCancellationError) {
      if (e.code === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      if (e.code === 'INVALID_TOKEN') {
        return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
      }
      if (e.code === 'TOO_LATE') {
        return NextResponse.json({ error: 'Too late to cancel' }, { status: 400 })
      }
    }
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'Cancel failed', details: String(msg) }, { status: 500 })
  }
}
import { addMinutes } from 'date-fns'
import { auth } from '@/auth' // 👈 Import de la fonction auth
import { createLog } from '@/lib/logger'

const TOUR_DURATION = 25

const PARIS_TIME_ZONE = 'Europe/Paris'
const parisDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: PARIS_TIME_ZONE
})
const parisTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: PARIS_TIME_ZONE
})

const languageLabels: Record<string, string> = {
  FR: 'Français',
  EN: 'Anglais',
  DE: 'Allemand',
  ES: 'Espagnol'
}

const checkinLabels: Record<string, string> = {
  CONFIRMED: 'Confirmée',
  EMBARQUED: 'Embarquée',
  NO_SHOW: 'Absents'
}

const formatParisDateTime = (instant: Date) => `${parisDateFormatter.format(instant)} à ${parisTimeFormatter.format(instant)}`

const escapeHtml = (raw: string) =>
  String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const describeHeadcount = (adults: number, children: number, babies: number) => {
  const parts: string[] = []
  if (adults > 0) parts.push(`${adults} adulte${adults > 1 ? 's' : ''}`)
  if (children > 0) parts.push(`${children} enfant${children > 1 ? 's' : ''}`)
  if (babies > 0) parts.push(`${babies} bébé${babies > 1 ? 's' : ''}`)
  return parts.length ? parts.join(' · ') : '0 participant'
}

const formatLanguage = (code: string | null | undefined) => {
  if (!code) return 'Non précisé'
  const key = code.toUpperCase()
  return languageLabels[key] ?? code
}

const formatPaymentStatus = (isPaid: boolean | null | undefined) => (isPaid ? 'Payée' : 'À régler')

const formatCheckinStatus = (status: string | null | undefined) => {
  if (!status) return 'Confirmée'
  return checkinLabels[status] ?? status
}

const shouldNotifyRecipient = (email: string | null | undefined) => {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  if (!normalized) return false
  if (normalized.endsWith('@local.com') || normalized.endsWith('@sweetnarcisse.local')) return false
  if (normalized.startsWith('override@')) return false
  if (normalized.includes('guichet.')) return false
  return true
}

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
    const booking = await prisma.booking.findUnique({ where: { id }, include: { user: true } })
    if (!booking) {
      return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 })
    }

    // Delete dependent payments first to avoid FK constraint errors
    await prisma.payment.deleteMany({ where: { bookingId: id } })
    await prisma.booking.delete({ where: { id } })

    const userName = user.firstName || 'Admin'
    await createLog('DELETE_BOOKING', `Réservation ${id} supprimée par ${userName}`)

    const recipientEmail = booking.user?.email?.trim() || ''
    if (shouldNotifyRecipient(recipientEmail)) {
      const recipient = recipientEmail
      const firstName = booking.user?.firstName || 'Client'
      const bookingLabel = booking.publicReference || booking.id
      const whenLabel = formatParisDateTime(booking.startTime)
      const textLines = [
        `Bonjour ${firstName},`,
        '',
        `Nous vous confirmons l'annulation de votre réservation ${bookingLabel} initialement prévue le ${whenLabel}.`,
        '',
        'Cette suppression a été réalisée par notre équipe administrative.',
        '',
        `Pour toute question ou pour programmer une nouvelle sortie, écrivez-nous à ${EMAIL_ROLES.contact}.`,
        '',
        "À très bientôt sur l'eau !"
      ]
      const text = textLines.join('\n')
      const html = `
        <div style="background-color:#f8fafc;padding:32px 16px;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,0.12);">
            <tr>
              <td style="padding:28px 32px;background:linear-gradient(135deg,#0f172a,#1e293b);color:#ffffff;">
                <div style="font-size:18px;font-weight:600;margin-bottom:4px;">Sweet Narcisse</div>
                <div style="font-size:24px;font-weight:700;">Réservation annulée</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px 0;font-size:16px;">Bonjour ${escapeHtml(firstName)},</p>
                <p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;">
                  Nous vous confirmons l'annulation de votre réservation <strong>${escapeHtml(bookingLabel)}</strong> initialement prévue le ${escapeHtml(whenLabel)}.
                </p>
                <div style="margin:24px 0;border:1px solid #e2e8f0;border-radius:12px;padding:20px;background-color:#f8fafc;">
                  <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:8px;">Sortie initiale</div>
                  <div style="font-size:18px;font-weight:600;color:#0f172a;">${escapeHtml(whenLabel)}</div>
                </div>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">
                  Cette suppression a été réalisée par notre équipe administrative.
                </p>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;">
                  Pour toute question ou pour programmer une nouvelle sortie, écrivez-nous à <a href="mailto:${escapeHtml(EMAIL_ROLES.contact)}" style="color:#2563eb;text-decoration:none;font-weight:600;">${escapeHtml(EMAIL_ROLES.contact)}</a>.
                </p>
                <a href="mailto:${escapeHtml(EMAIL_ROLES.contact)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background-color:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;">Nous contacter</a>
                <p style="margin:24px 0 0 0;font-size:15px;line-height:1.6;">À très bientôt sur l'eau !</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background-color:#f1f5f9;font-size:12px;color:#64748b;text-align:center;">
                Sweet Narcisse · Quai de la Tournelle · Paris 5e
              </td>
            </tr>
          </table>
        </div>
      `
      try {
        await sendMail({
          to: recipient,
          subject: `Réservation ${bookingLabel} annulée`,
          text,
          html,
          from: EMAIL_FROM.reservations,
          replyTo: EMAIL_ROLES.contact
        })
      } catch (mailError) {
        console.error('Erreur envoi email suppression réservation:', mailError)
      }
    }

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
        const { instant } = parseParisWallDate(date, time)
        startTime = instant
      }
      const endTime = addMinutes(startTime, TOUR_DURATION)
      dataToUpdate.startTime = startTime
      dataToUpdate.endTime = endTime
      logMessage += `Nouvelle heure → ${parisTimeFormatter.format(startTime)}.`
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

    const existingBooking = await prisma.booking.findUnique({ where: { id }, include: { user: true } })
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
      },
      include: { user: true }
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

    const recipientEmail = updatedBooking.user?.email?.trim() || ''
    if (shouldNotifyRecipient(recipientEmail)) {
      const bookingLabel = updatedBooking.publicReference || updatedBooking.id
      const oldStart = existingBooking.startTime
      const newStart = updatedBooking.startTime
      const changeLines: string[] = []

      if (oldStart.getTime() !== newStart.getTime()) {
        changeLines.push(`Horaire : ${formatParisDateTime(oldStart)} ➜ ${formatParisDateTime(newStart)}`)
      }

      const oldAdults = existingBooking.adults ?? 0
      const oldChildren = existingBooking.children ?? 0
      const oldBabies = existingBooking.babies ?? 0
      const newAdults = updatedBooking.adults ?? 0
      const newChildren = updatedBooking.children ?? 0
      const newBabies = updatedBooking.babies ?? 0
      const oldHeadcount = `${describeHeadcount(oldAdults, oldChildren, oldBabies)} (${existingBooking.numberOfPeople} au total)`
      const newHeadcount = `${describeHeadcount(newAdults, newChildren, newBabies)} (${updatedBooking.numberOfPeople} au total)`
      if (oldHeadcount !== newHeadcount) {
        changeLines.push(`Participants : ${oldHeadcount} ➜ ${newHeadcount}`)
      }

      if (existingBooking.isPaid !== updatedBooking.isPaid) {
        changeLines.push(`Statut de paiement : ${formatPaymentStatus(existingBooking.isPaid)} ➜ ${formatPaymentStatus(updatedBooking.isPaid)}`)
      }

      if ((existingBooking.language || '').toUpperCase() !== (updatedBooking.language || '').toUpperCase()) {
        changeLines.push(`Langue : ${formatLanguage(existingBooking.language)} ➜ ${formatLanguage(updatedBooking.language)}`)
      }

      if (existingBooking.checkinStatus !== updatedBooking.checkinStatus) {
        changeLines.push(`Statut d'embarquement : ${formatCheckinStatus(existingBooking.checkinStatus)} ➜ ${formatCheckinStatus(updatedBooking.checkinStatus)}`)
      }

      const summaryLines = [
        `Date et heure : ${formatParisDateTime(newStart)}`,
        `Participants : ${describeHeadcount(newAdults, newChildren, newBabies)} (${updatedBooking.numberOfPeople} au total)`,
        `Langue : ${formatLanguage(updatedBooking.language)}`,
        `Statut de paiement : ${formatPaymentStatus(updatedBooking.isPaid)}`,
        `Statut d'embarquement : ${formatCheckinStatus(updatedBooking.checkinStatus)}`
      ]

      const firstName = updatedBooking.user?.firstName || 'Client'
      const textParts: string[] = [
        `Bonjour ${firstName},`,
        '',
        `Nous venons de mettre à jour votre réservation ${bookingLabel}.`
      ]

      if (changeLines.length) {
        textParts.push('', 'Modifications :')
        changeLines.forEach((line) => textParts.push(`- ${line}`))
      }

      textParts.push('', 'Récapitulatif actuel :')
      summaryLines.forEach((line) => textParts.push(`- ${line}`))
      textParts.push(
        '',
        `Pour toute question, vous pouvez répondre à ce message ou contacter ${EMAIL_ROLES.contact}.`,
        '',
        "À très bientôt sur l'eau !"
      )

      const text = textParts.join('\n')
      const changesHtml = changeLines
        .map((line) => `<li style="margin-bottom:8px;font-size:15px;line-height:1.6;">${escapeHtml(line)}</li>`)
        .join('')

      const summaryHtml = summaryLines
        .map((line) => `<li style="margin-bottom:8px;font-size:15px;line-height:1.6;">${escapeHtml(line)}</li>`)
        .join('')

      const html = `
        <div style="background-color:#f8fafc;padding:32px 16px;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:650px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,0.12);">
            <tr>
              <td style="padding:28px 32px;background:linear-gradient(135deg,#0f172a,#1e293b);color:#ffffff;">
                <div style="font-size:18px;font-weight:600;margin-bottom:4px;">Sweet Narcisse</div>
                <div style="font-size:24px;font-weight:700;">Réservation mise à jour</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px 0;font-size:16px;">Bonjour ${escapeHtml(firstName)},</p>
                <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;">
                  Nous venons de mettre à jour votre réservation <strong>${escapeHtml(bookingLabel)}</strong>.
                </p>
                ${changeLines.length ? `
                  <div style="margin:24px 0;padding:20px;border-radius:12px;background-color:#eef2ff;border:1px solid #c7d2fe;">
                    <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#4f46e5;margin-bottom:8px;">Modifications</div>
                    <ul style="margin:12px 0 0 0;padding:0 0 0 18px;color:#0f172a;">${changesHtml}</ul>
                  </div>
                ` : ''}
                <div style="margin:24px 0;padding:20px;border-radius:12px;background-color:#f8fafc;border:1px solid #e2e8f0;">
                  <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:8px;">Récapitulatif actuel</div>
                  <ul style="margin:12px 0 0 0;padding:0 0 0 18px;color:#0f172a;">${summaryHtml}</ul>
                </div>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;">
                  Pour toute question, vous pouvez répondre à ce message ou écrire à <a href="mailto:${escapeHtml(EMAIL_ROLES.contact)}" style="color:#2563eb;text-decoration:none;font-weight:600;">${escapeHtml(EMAIL_ROLES.contact)}</a>.
                </p>
                <a href="mailto:${escapeHtml(EMAIL_ROLES.contact)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background-color:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;">Nous contacter</a>
                <p style="margin:24px 0 0 0;font-size:15px;line-height:1.6;">À très bientôt sur l'eau !</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background-color:#f1f5f9;font-size:12px;color:#64748b;text-align:center;">
                Sweet Narcisse · Quai de la Tournelle · Paris 5e
              </td>
            </tr>
          </table>
        </div>
      `

      try {
        await sendMail({
          to: recipientEmail,
          subject: `Votre réservation ${bookingLabel} a été mise à jour`,
          text,
          html,
          from: EMAIL_FROM.reservations,
          replyTo: EMAIL_ROLES.contact
        })
      } catch (mailError) {
        console.error('Erreur envoi email mise à jour réservation:', mailError)
      }
    }

    return NextResponse.json({ success: true, booking: updatedBooking })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Erreur PATCH réservation:', msg)
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 })
  }
}