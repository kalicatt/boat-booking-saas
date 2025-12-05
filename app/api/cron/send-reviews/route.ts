import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/mailer'
import { EMAIL_FROM } from '@/lib/emailAddresses'
import { renderReviewRequestHtml } from '@/lib/emailRender'
import { getParisTodayISO } from '@/lib/time'
import { createLog } from '@/lib/logger'
import { isGenericCounterEmail } from '@/lib/bookingConfirmationEmail'

export const runtime = 'nodejs'

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' })
const GOOGLE_REVIEW_FALLBACK = 'https://g.page/r/SweetNarcisse/review'
const TRIPADVISOR_FALLBACK = 'https://www.tripadvisor.fr/UserReview'
const SUBJECT = "Votre balade en barque : qu'en avez-vous pensé ? 🛶"

function resolveYesterdayUtcMidnight() {
  const todayIso = getParisTodayISO()
  const todayUtc = new Date(`${todayIso}T00:00:00.000Z`)
  const targetUtc = new Date(todayUtc)
  targetUtc.setUTCDate(targetUtc.getUTCDate() - 1)
  return targetUtc
}

function buildTextBody(firstName: string, dateLabel: string, googleUrl: string, tripUrl?: string | null) {
  const lines: string[] = []
  lines.push(`Bonjour ${firstName},`)
  lines.push(`Merci d'avoir navigué avec nous le ${dateLabel}. Votre expérience compte beaucoup pour l'équipage !`)
  lines.push('Partagez votre avis en un clic :')
  lines.push(`Google : ${googleUrl}`)
  if (tripUrl) {
    lines.push(`TripAdvisor : ${tripUrl}`)
  }
  lines.push('Chaque témoignage aide nos bateliers et rassure les voyageurs qui découvrent Colmar.')
  lines.push('Merci pour votre temps et à très bientôt sur la Lauch !')
  lines.push("-- L'équipe Sweet Narcisse")
  return lines.join('\n\n')
}

export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET?.trim()
    if (cronSecret) {
      const headerSecret = request.headers.get('x-cron-key')?.trim()
      if (headerSecret !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const targetDate = resolveYesterdayUtcMidnight()
    const targetIso = targetDate.toISOString().slice(0, 10)
    const googleReviewUrl = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL?.trim() || GOOGLE_REVIEW_FALLBACK
    const tripadvisorReviewUrl = process.env.NEXT_PUBLIC_TRIPADVISOR_REVIEW_URL?.trim() || TRIPADVISOR_FALLBACK

    const bookings = await prisma.booking.findMany({
      where: {
        date: targetDate,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
        checkinStatus: 'EMBARQUED',
        reviewMailSent: false
      },
      include: { user: true }
    })

    const processed: string[] = []
    const skipped: Array<{ id: string; reason: string }> = []
    const failures: Array<{ id: string; error: string }> = []

    for (const booking of bookings) {
      const userEmail = booking.user?.email?.trim()
      if (!userEmail) {
        skipped.push({ id: booking.id, reason: 'MISSING_EMAIL' })
        continue
      }
      if (isGenericCounterEmail(userEmail)) {
        skipped.push({ id: booking.id, reason: 'GENERIC_EMAIL' })
        continue
      }

      const firstName = booking.user?.firstName || 'Client'
      const experienceDate = DATE_FORMATTER.format(booking.date)

      try {
        const html = await renderReviewRequestHtml({
          firstName,
          experienceDate,
          googleReviewUrl,
          tripadvisorReviewUrl
        })

        const text = buildTextBody(firstName, experienceDate, googleReviewUrl, tripadvisorReviewUrl)

        await sendMail({
          to: userEmail,
          subject: SUBJECT,
          html,
          text,
          from: EMAIL_FROM.experience
        })

        await prisma.booking.update({ where: { id: booking.id }, data: { reviewMailSent: true } })
        await createLog('REVIEW_EMAIL_SENT', `Demande d'avis envoyée à ${userEmail} pour la réservation ${booking.id}`)
        processed.push(booking.id)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        failures.push({ id: booking.id, error: message })
      }
    }

    return NextResponse.json({
      targetDate: targetIso,
      total: bookings.length,
      processed: processed.length,
      skipped,
      failures
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message || 'Server error' }, { status: 500 })
  }
}
