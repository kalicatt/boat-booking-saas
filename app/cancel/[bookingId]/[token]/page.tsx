import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { getBookingForToken, cancelBookingWithToken, BookingCancellationError, type CancelErrorCode } from '@/lib/bookingCancellation'

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Paris'
})

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris'
})

type DisplayStatus = 'success' | 'already' | 'too-late' | 'invalid-token' | 'not-found' | 'error'

const statusMessages: Record<DisplayStatus, { tone: 'success' | 'info' | 'warning' | 'error'; title: string; body: string }> = {
  success: {
    tone: 'success',
    title: 'Réservation annulée',
    body: 'Nous avons bien enregistré votre annulation. Un email de confirmation vient d\'être envoyé.'
  },
  already: {
    tone: 'info',
    title: 'Réservation déjà annulée',
    body: 'Cette réservation est déjà marquée comme annulée. Aucun frais supplémentaire ne vous sera facturé.'
  },
  'too-late': {
    tone: 'warning',
    title: 'Délai dépassé',
    body: 'La fenêtre d\'annulation en ligne est dépassée. Contactez-nous si vous avez besoin d\'assistance.'
  },
  'invalid-token': {
    tone: 'error',
    title: 'Lien invalide',
    body: 'Ce lien d\'annulation n\'est plus valide. Vérifiez que vous utilisez l\'email le plus récent ou contactez-nous.'
  },
  'not-found': {
    tone: 'error',
    title: 'Réservation introuvable',
    body: 'Impossible de retrouver cette réservation. Merci de vérifier la référence ou de contacter notre équipe.'
  },
  error: {
    tone: 'error',
    title: 'Erreur inattendue',
    body: 'Une erreur est survenue lors de l\'annulation. Merci de réessayer ou de nous contacter.'
  }
}

const toneStyles: Record<'success' | 'info' | 'warning' | 'error', string> = {
  success: 'border-green-200 bg-green-50 text-green-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  error: 'border-rose-200 bg-rose-50 text-rose-800'
}

async function cancelReservationAction(formData: FormData) {
  'use server'

  const bookingId = formData.get('bookingId')
  const token = formData.get('token')
  if (typeof bookingId !== 'string' || typeof token !== 'string' || !bookingId || !token) {
    redirect('/')
  }

  const basePath = `/cancel/${bookingId}/${token}`
  try {
    const result = await cancelBookingWithToken(bookingId, token)
    if (result.alreadyCancelled) {
      redirect(`${basePath}?status=already`)
    }
    redirect(`${basePath}?status=success`)
  } catch (error: unknown) {
    if (error instanceof BookingCancellationError) {
      const mapping: Record<CancelErrorCode, DisplayStatus> = {
        NOT_FOUND: 'not-found',
        INVALID_TOKEN: 'invalid-token',
        TOO_LATE: 'too-late'
      }
      redirect(`${basePath}?status=${mapping[error.code]}`)
    }
    redirect(`${basePath}?status=error`)
  }
}

function parseStatus(searchParams: Record<string, string | string[] | undefined> | undefined): DisplayStatus | null {
  if (!searchParams) return null
  const raw = searchParams.status
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) return null
  if (value === 'success' || value === 'already' || value === 'too-late' || value === 'invalid-token' || value === 'not-found' || value === 'error') {
    return value
  }
  return null
}

interface CancelPageProps {
  params: Record<string, string | string[]> | Promise<Record<string, string | string[]>>
  searchParams?: Record<string, string | string[] | undefined>
}

export default async function CancelPage({ params, searchParams }: CancelPageProps) {
  const resolvedParams = await Promise.resolve(params)
  const bookingIdParam = resolvedParams?.bookingId
  const tokenParam = resolvedParams?.token
  const bookingId = Array.isArray(bookingIdParam) ? bookingIdParam[0] : bookingIdParam
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam
  if (!bookingId || !token) {
    notFound()
  }
  const statusFromQuery = parseStatus(searchParams)

  type LoadedBooking = Awaited<ReturnType<typeof getBookingForToken>>
  let booking: LoadedBooking | null = null
  let precheckError: CancelErrorCode | null = null
  try {
    booking = await getBookingForToken(bookingId, token)
  } catch (error: unknown) {
    if (error instanceof BookingCancellationError) {
      precheckError = error.code
    } else {
      throw error
    }
  }

  const now = new Date()
  const tooLateToCancel = booking ? booking.startTime <= now : false
  const alreadyCancelled = booking ? booking.status === 'CANCELLED' : false

  let derivedStatus: DisplayStatus | null = statusFromQuery
  if (!derivedStatus) {
    if (precheckError === 'INVALID_TOKEN') derivedStatus = 'invalid-token'
    else if (precheckError === 'NOT_FOUND') derivedStatus = 'not-found'
    else if (alreadyCancelled) derivedStatus = 'already'
    else if (tooLateToCancel) derivedStatus = 'too-late'
  }

  const canSubmit = Boolean(booking) && !derivedStatus && !tooLateToCancel && precheckError === null

  const referenceLabel = booking?.publicReference || booking?.id || 'Réservation'
  const startDate = booking ? new Date(booking.startTime) : null
  const formattedDate = startDate ? dateFormatter.format(startDate) : null
  const formattedTime = startDate ? timeFormatter.format(startDate) : null

  return (
    <div className="min-h-screen bg-sand-gradient py-20 px-6">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl bg-white px-8 py-10 shadow-2xl">
          <div className="mb-6 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-sky-500">Sweet Narcisse</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Gérer ma réservation</h1>
            <p className="mt-3 text-slate-600">{referenceLabel}</p>
          </div>

          {derivedStatus && (
            <div className={`mb-8 rounded-2xl border px-5 py-4 text-sm leading-relaxed ${toneStyles[statusMessages[derivedStatus].tone]}`}>
              <p className="font-semibold">{statusMessages[derivedStatus].title}</p>
              <p className="mt-1">{statusMessages[derivedStatus].body}</p>
            </div>
          )}

          {booking && (
            <section className="mb-8 rounded-2xl bg-slate-50 px-6 py-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Détails de la sortie</h2>
              <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Date</dt>
                  <dd className="font-semibold text-slate-900">{formattedDate}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Heure</dt>
                  <dd className="font-semibold text-slate-900">{formattedTime}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Participants</dt>
                  <dd className="font-semibold text-slate-900">{booking.numberOfPeople} personne{booking.numberOfPeople > 1 ? 's' : ''}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Référence</dt>
                  <dd className="font-semibold text-slate-900">{referenceLabel}</dd>
                </div>
              </dl>
            </section>
          )}

          {canSubmit && (
            <form action={cancelReservationAction} className="space-y-6">
              <input type="hidden" name="bookingId" value={bookingId} />
              <input type="hidden" name="token" value={token} />
              <p className="text-sm text-slate-600">
                {"Vous êtes sur le point d'annuler cette réservation. Cette action libérera votre créneau."}
              </p>
              <button
                type="submit"
                className="w-full rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-300"
              >
                {"Confirmer l'annulation"}
              </button>
            </form>
          )}

          {!canSubmit && (
            <div className="mt-8 text-center text-sm text-slate-600">
              <p>{"Besoin d'aide ?"}</p>
              <p className="mt-1">
                <Link href="mailto:contact@sweet-narcisse.fr" className="font-semibold text-sky-600 hover:text-sky-700">
                  contact@sweet-narcisse.fr
                </Link>
                <span className="mx-2 text-slate-400">•</span>
                <Link href="tel:+33389206892" className="font-semibold text-sky-600 hover:text-sky-700">
                  +33 3 89 20 68 92
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
