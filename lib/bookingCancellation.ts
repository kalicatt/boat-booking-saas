import { prisma } from '@/lib/prisma'
import { computeBookingToken } from '@/lib/bookingToken'
import { sendMail } from '@/lib/mailer'
import { EMAIL_FROM, EMAIL_ROLES } from '@/lib/emailAddresses'
import { memoInvalidateByDate } from '@/lib/memoCache'

import type { Booking, User } from '@prisma/client'

export type CancelErrorCode = 'NOT_FOUND' | 'INVALID_TOKEN' | 'TOO_LATE'

export class BookingCancellationError extends Error {
  constructor(public code: CancelErrorCode, message: string) {
    super(message)
    this.name = 'BookingCancellationError'
  }
}

type BookingWithUser = Booking & { user: User | null }

export async function getBookingForToken(bookingId: string, token: string): Promise<BookingWithUser> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { user: true } })
  if (!booking) {
    throw new BookingCancellationError('NOT_FOUND', 'Réservation introuvable')
  }

  const expected = computeBookingToken(bookingId)
  if (token !== expected) {
    throw new BookingCancellationError('INVALID_TOKEN', 'Jeton invalide')
  }

  return booking
}

interface CancelBookingResult {
  alreadyCancelled: boolean
  booking: BookingWithUser
}

export async function cancelBookingWithToken(bookingId: string, token: string): Promise<CancelBookingResult> {
  const booking = await getBookingForToken(bookingId, token)

  if (booking.status === 'CANCELLED') {
    return { alreadyCancelled: true, booking }
  }

  const now = new Date()
  if (booking.startTime <= now) {
    throw new BookingCancellationError('TOO_LATE', 'La fenêtre d\'annulation est dépassée')
  }

  await prisma.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } })
  booking.status = 'CANCELLED'

  const dateKey = booking.date.toISOString().slice(0, 10)
  memoInvalidateByDate(dateKey)

  const adminAddress = EMAIL_ROLES.notifications
  const recipient = booking.user?.email || adminAddress
  const bookingLabel = booking.publicReference || booking.id

  try {
    await Promise.all([
      sendMail({
        to: recipient,
        subject: `Annulation confirmée – Réservation ${bookingLabel}`,
        text: `Votre réservation a bien été annulée. Référence: ${bookingLabel}. Pour toute assistance, contactez-nous: ${EMAIL_ROLES.contact}.`,
        from: EMAIL_FROM.reservations,
        replyTo: EMAIL_ROLES.contact
      }),
      sendMail({
        to: adminAddress,
        subject: `Annulation effectuée – ${bookingLabel}`,
        text: `La réservation ${bookingLabel} a été annulée via le lien client. Email: ${booking.user?.email || 'inconnu'}.`,
        from: EMAIL_FROM.notifications
      })
    ])
  } catch (error) {
    console.error('Erreur envoi emails annulation:', error)
  }

  return { alreadyCancelled: false, booking }
}
