import path from 'path'
import { readFile } from 'fs/promises'
import { createElement } from 'react'
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import { BookingTemplate } from '@/components/emails/BookingTemplate'
import { renderBookingHtml } from '@/lib/emailRender'
import { sendMail } from '@/lib/mailer'
import { EMAIL_FROM, EMAIL_ROLES } from '@/lib/emailAddresses'
import { createLog } from '@/lib/logger'
import { computeBookingToken } from '@/lib/bookingToken'
import { generateBookingQrCodeDataUrl, generateBookingQrCodeBuffer } from '@/lib/qr'
import { generateBookingInvoicePdf } from '@/lib/invoicePdf'
import { PRICES } from '@/lib/config'

const resendClient: Resend | null = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const LOCAL_BASE_REGEX = /^https?:\/\/(localhost|127(?:\.\d+){0,3}|0\.0\.0\.0|10\.[0-9.]+|192\.168\.[0-9.]+)/i
const MAP_LINK = 'https://maps.app.goo.gl/v2S3t2Wq83B7k6996'
const EUR_FORMATTER = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const PARIS_DATE = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
const PARIS_TIME = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false })

type SendBookingConfirmationOptions = {
  invoiceEmail?: string | null
  force?: boolean
}

export const isGenericCounterEmail = (value: string | null | undefined) => {
  if (!value) return true
  const normalized = value.trim().toLowerCase()
  if (!normalized) return true
  return normalized.endsWith('@local.com') || normalized.endsWith('@sweetnarcisse.local') || normalized.startsWith('override@')
}

const formatParisDate = (value: Date) => {
  try {
    return PARIS_DATE.format(value)
  } catch {
    return value.toISOString().slice(0, 10)
  }
}

const formatParisTime = (value: Date) => {
  try {
    return PARIS_TIME.format(value)
  } catch {
    return value.toISOString().slice(11, 16)
  }
}

export async function sendBookingConfirmationEmail(
  bookingId: string,
  options?: SendBookingConfirmationOptions
): Promise<{ ok: boolean; reason?: string }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true }
  })

  if (!booking || !booking.user) {
    return { ok: false, reason: 'BOOKING_NOT_FOUND' }
  }

  if (booking.confirmationEmailSentAt && !options?.force) {
    return { ok: false, reason: 'ALREADY_SENT' }
  }

  const userEmail = booking.user.email?.trim() || ''
  if (!userEmail || !userEmail.includes('@') || isGenericCounterEmail(userEmail)) {
    return { ok: false, reason: 'INVALID_RECIPIENT' }
  }

  const baseUrlRaw = process.env.NEXT_PUBLIC_BASE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
    || 'http://localhost:3000'
  const baseUrl = baseUrlRaw.replace(/\/$/, '')
  const useHostedAssets = !LOCAL_BASE_REGEX.test(baseUrl)
  const token = computeBookingToken(booking.id)
  const cancelUrl = `${baseUrl}/cancel/${booking.id}/${token}`

  const qrAsset = useHostedAssets
    ? { type: 'url' as const, url: `${baseUrl}/api/booking-qr/${booking.id}/${token}` }
    : {
        type: 'inline' as const,
        cid: `booking-${booking.id}-qr`,
        dataUrl: await generateBookingQrCodeDataUrl(booking.id, booking.publicReference),
        buffer: await generateBookingQrCodeBuffer(booking.id, booking.publicReference)
      }

  let logoBuffer: Buffer | null = null
  if (!useHostedAssets) {
    try {
      const logoPath = path.join(process.cwd(), 'public', 'images', 'logo.jpg')
      logoBuffer = await readFile(logoPath)
    } catch (error) {
      console.warn('Logo asset unavailable for inline usage:', error)
    }
  }

  const logoAsset = !useHostedAssets && logoBuffer
    ? { type: 'inline' as const, cid: 'sweet-narcisse-logo', buffer: logoBuffer }
    : baseUrl
      ? { type: 'url' as const, url: `${baseUrl}/images/logo.jpg` }
      : { type: 'none' as const }

  const attachments: Array<{ filename: string; content: Buffer; contentType: string; cid?: string }> = []
  const resendAttachments: Array<{ filename: string; content: string; contentType: string }> = []

  if (qrAsset.type === 'inline') {
    attachments.push({
      filename: `qr-${booking.publicReference || booking.id}.png`,
      content: qrAsset.buffer,
      contentType: 'image/png',
      cid: qrAsset.cid
    })
  }

  if (logoAsset.type === 'inline') {
    attachments.push({
      filename: 'logo.jpg',
      content: logoAsset.buffer,
      contentType: 'image/jpeg',
      cid: logoAsset.cid
    })
  }

  const firstName = booking.user.firstName || 'Client'
  const people = booking.numberOfPeople
  const adults = booking.adults ?? 0
  const children = booking.children ?? 0
  const babies = booking.babies ?? 0
  const totalPrice = booking.totalPrice || 0
  const dateLabel = formatParisDate(booking.date)
  const timeLabel = formatParisTime(booking.startTime)

  let invoiceAttachment: { filename: string; buffer: Buffer } | null = null
  try {
    const invoiceBuffer = await generateBookingInvoicePdf({
      invoiceNumber: booking.publicReference || booking.id,
      issueDate: new Date(),
      serviceDate: dateLabel,
      serviceTime: timeLabel,
      totalPrice,
      adults,
      children,
      babies,
      unitPrices: { adult: PRICES.ADULT, child: PRICES.CHILD, baby: PRICES.BABY },
      customer: {
        firstName,
        lastName: booking.user.lastName || 'Client',
        email: userEmail,
        phone: booking.user.phone || null
      },
      logoBuffer
    })
    const sanitizedLabel = (booking.publicReference || booking.id)
      .replace(/[^a-z0-9-_]+/gi, '-')
      .replace(/^-+|-+$/g, '') || booking.id
    invoiceAttachment = { filename: `Facture-${sanitizedLabel}.pdf`, buffer: invoiceBuffer }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Invoice generation failed:', message)
    await createLog('INVOICE_ERROR', `Échec génération facture ${booking.id}: ${message}`)
  }

  if (invoiceAttachment) {
    attachments.push({ filename: invoiceAttachment.filename, content: invoiceAttachment.buffer, contentType: 'application/pdf' })
    resendAttachments.push({ filename: invoiceAttachment.filename, content: invoiceAttachment.buffer.toString('base64'), contentType: 'application/pdf' })
  }

  const mailAttachmentList = attachments.length ? attachments : undefined
  const resendAttachmentList = resendAttachments.length ? resendAttachments : undefined

  const emailProps = {
    firstName,
    date: dateLabel,
    time: timeLabel,
    people,
    adults,
    childrenCount: children,
    babies,
    bookingId: booking.id,
    publicReference: booking.publicReference,
    totalPrice,
    qrCodeUrl: qrAsset.type === 'url' ? qrAsset.url : null,
    qrCodeDataUrl: qrAsset.type === 'inline' ? qrAsset.dataUrl : null,
    qrCodeCid: qrAsset.type === 'inline' ? qrAsset.cid : null,
    cancelUrl,
    logoUrl: logoAsset.type === 'url' ? logoAsset.url : null,
    logoCid: logoAsset.type === 'inline' ? logoAsset.cid : null
  }

  const textBody = [
    `Bonjour ${firstName},`,
    `Votre réservation est confirmée pour le ${dateLabel} à ${timeLabel}. Référence : ${booking.publicReference || booking.id}.`,
    `Montant total : ${EUR_FORMATTER.format(totalPrice)} (facture PDF en pièce jointe).`,
    `Merci d'arriver 10 minutes avant le départ au Pont Saint-Pierre, 10 Rue de la Herse, 68000 Colmar.`,
    `Itinéraire Google Maps : ${MAP_LINK}`,
    `Pour gérer ou annuler votre réservation, utilisez ce lien : ${cancelUrl}`,
    `À très vite sur l'eau !`
  ].join('\n\n')

  const reservationSender = EMAIL_FROM.reservations
  const billingSender = EMAIL_FROM.billing
  const replyToContact = EMAIL_ROLES.contact
  const requiresResendReRender = qrAsset.type === 'inline' || logoAsset.type === 'inline'

  try {
    if (resendClient) {
      const resendProps = requiresResendReRender ? { ...emailProps, qrCodeCid: null, logoCid: null } : emailProps
      const resendHtml = requiresResendReRender ? await renderBookingHtml(resendProps) : await renderBookingHtml(emailProps)
      await resendClient.emails.send({
        from: reservationSender,
        to: userEmail,
        subject: `Confirmation de réservation – ${dateLabel} ${timeLabel}`,
        html: resendHtml,
        text: textBody,
        replyTo: replyToContact,
        react: createElement(BookingTemplate, resendProps),
        attachments: resendAttachmentList
      })
    } else {
      const html = await renderBookingHtml(emailProps)
      await sendMail({
        to: userEmail,
        subject: `Confirmation de réservation – ${dateLabel} ${timeLabel}`,
        html,
        text: textBody,
        from: reservationSender,
        replyTo: replyToContact,
        attachments: mailAttachmentList
      })
    }
    await createLog('EMAIL_SENT', `Confirmation envoyée à ${userEmail} pour réservation ${booking.id}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Email send failed:', message)
    await createLog('EMAIL_ERROR', `Échec envoi confirmation ${userEmail}: ${message}`)
    return { ok: false, reason: 'SEND_FAILED' }
  }

  const invoiceRecipient = options?.invoiceEmail || booking.invoiceEmail || null
  if (invoiceRecipient && invoiceRecipient !== userEmail) {
    try {
      if (resendClient) {
        const resendProps = requiresResendReRender ? { ...emailProps, qrCodeCid: null, logoCid: null } : emailProps
        const resendHtml = requiresResendReRender ? await renderBookingHtml(resendProps) : await renderBookingHtml(emailProps)
        await resendClient.emails.send({
          from: billingSender,
          to: invoiceRecipient,
          subject: `Facture – Réservation ${dateLabel} ${timeLabel}`,
          html: resendHtml,
          text: textBody,
          replyTo: EMAIL_ROLES.billing,
          react: createElement(BookingTemplate, resendProps),
          attachments: resendAttachmentList
        })
      } else {
        const html = await renderBookingHtml(emailProps)
        await sendMail({
          to: invoiceRecipient,
          subject: `Facture – Réservation ${dateLabel} ${timeLabel}`,
          html,
          text: textBody,
          from: billingSender,
          replyTo: EMAIL_ROLES.billing,
          attachments: mailAttachmentList
        })
      }
      await createLog('EMAIL_SENT', `Facture envoyée à ${invoiceRecipient} pour réservation ${booking.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('Invoice email failed:', message)
      await createLog('EMAIL_ERROR', `Échec envoi facture ${invoiceRecipient}: ${message}`)
    }
  }

  const updateData: { confirmationEmailSentAt: Date; invoiceEmail?: string | null } = {
    confirmationEmailSentAt: new Date()
  }
  if (invoiceRecipient && invoiceRecipient !== booking.invoiceEmail) {
    updateData.invoiceEmail = invoiceRecipient
  }

  await prisma.booking.update({ where: { id: booking.id }, data: updateData })
  return { ok: true }
}
