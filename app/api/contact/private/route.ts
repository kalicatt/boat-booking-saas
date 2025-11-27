import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { GroupRequestTemplate } from '@/components/emails/GroupRequestTemplate'
import { createLog } from '@/lib/logger'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { normalizeIncoming } from '@/lib/phone'
import { prisma } from '@/lib/prisma'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const rl = rateLimit({ key: `contact:private:${ip}`, limit: 5, windowMs: 300_000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Trop de demandes', retryAfter: rl.retryAfter }, { status: 429 })

    const json = await request.json()
    const schema = z.object({
      firstName: z.string().trim().min(1).max(60),
      lastName: z.string().trim().min(1).max(60),
      email: z.string().trim().email().max(120),
      phone: z.string().trim().max(30).default(''),
      message: z.string().trim().max(1500).default(''),
      people: z.number().int().min(1).max(500).optional(),
      date: z.string().trim().max(120).optional(),
      captchaToken: z.string().min(10),
      lang: z.enum(['fr','en','de','es','it']).optional()
    })
    const parsed = schema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides', issues: parsed.error.flatten() }, { status: 422 })
    let { firstName, lastName, email, phone, message, people, date, captchaToken, lang } = parsed.data
    const supported = ['fr','en','de','es','it'] as const
    type Lang = typeof supported[number]
    const referer = request.headers.get('referer') || ''
    const accept = request.headers.get('accept-language') || ''
    const urlLang: Lang | undefined = (()=>{
      const m = referer.match(/\/([a-z]{2})(?:\/|$)/i);
      const c = m?.[1]?.toLowerCase() as Lang | undefined
      return supported.includes(c as Lang) ? (c as Lang) : undefined
    })()
    const headerLang: Lang | undefined = (()=>{
      const first = accept.split(',')[0]?.trim().slice(0,2).toLowerCase() as Lang | undefined
      return supported.includes(first as Lang) ? (first as Lang) : undefined
    })()
    const userLang: Lang = (lang as Lang) || urlLang || headerLang || 'fr'
    if (phone) phone = normalizeIncoming(phone)
    if (message) message = message.replace(/\r?\n/g, '\n')

    // CAPTCHA
    if (!captchaToken) {
      return NextResponse.json({ error: 'Captcha manquant.' }, { status: 400 })
    }
    const verifyBody = new URLSearchParams({
      secret: process.env.RECAPTCHA_SECRET_KEY || '',
      response: captchaToken,
      remoteip: ip || ''
    })
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const captchaRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: verifyBody.toString(),
      signal: controller.signal
    }).catch((e) => {
      console.warn('Captcha verify failed', e)
      return undefined as any
    })
    clearTimeout(timeout)
    const captchaData = captchaRes ? await captchaRes.json() : { success: false }
    if (!captchaData.success) {
      return NextResponse.json({ error: 'Validation Captcha échouée.' }, { status: 400 })
    }

    // Additional per-email rate limit (after validation & captcha)
    const rlEmail = rateLimit({ key: `contact:private:email:${email.toLowerCase()}`, limit: 3, windowMs: 300_000 })
    if (!rlEmail.allowed) return NextResponse.json({ error: 'Trop de demandes pour cet email', retryAfter: rlEmail.retryAfter }, { status: 429 })

    // Email addresses
    const EMAIL_FROM = process.env.EMAIL_FROM || 'Sweet Narcisse <onboarding@resend.dev>'
    const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim()
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY is not set')
    }
    if (!ADMIN_EMAIL) {
      console.warn('ADMIN_EMAIL is not configured; using placeholder address')
    }

    // Persist contact request (non-blocking for email send)
    try {
      await prisma.contactRequest.create({
        data: {
          kind: 'private',
          firstName,
          lastName,
          email,
          phone: phone || null,
          message: message || null,
          people: typeof people === 'number' ? people : null,
          date: date || null,
          lang: userLang,
          ip: ip || null,
          referer: referer || null,
        }
      })
    } catch (e) {
      console.warn('ContactRequest persist failed', e)
    }

    // ADMIN EMAIL (reuse GroupRequestTemplate)
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [ADMIN_EMAIL || 'votre-email-admin@example.com'],
      subject: `Demande de Privatisation - ${firstName} ${lastName}${typeof people === 'number' ? ` - ${people}p` : ''}${date ? ` - ${date}` : ''}`,
      replyTo: email,
      react: await GroupRequestTemplate({
        firstName,
        lastName,
        email,
        phone,
        message,
        people: typeof people === 'number' ? people : 0
      })
    })
    if (error) {
      console.error('Erreur Resend (private admin):', error)
      return NextResponse.json({ error: "Erreur lors de l'envoi de l'email." }, { status: 500 })
    }

    // LOG
    await createLog(
      'CONTACT_PRIVATE',
      `Demande privatisation de ${firstName} ${lastName}${people ? ` (${people} pers)` : ''}${date ? ` pour ${date}` : ''} – ip:${ip} lang:${userLang} ref:${referer ? new URL(referer).pathname : ''}`
    )

    // CUSTOMER ACK (non-blocking) – send as plain text to avoid missing template
    try {
      const subjects = {
        fr: 'Demande reçue – Sweet Narcisse',
        en: 'Request received – Sweet Narcisse',
        de: 'Anfrage eingegangen – Sweet Narcisse',
        es: 'Solicitud recibida – Sweet Narcisse',
        it: 'Richiesta ricevuta – Sweet Narcisse'
      } as const
      const greetings = {
        fr: `Bonjour ${firstName},\n\nNous avons bien reçu votre demande de privatisation${date ? ` pour la date ${date}` : ''}${typeof people === 'number' ? ` pour ${people} personnes` : ''}. Nous revenons vers vous rapidement.\n\n— Équipe Sweet Narcisse`,
        en: `Hello ${firstName},\n\nWe received your private booking request${date ? ` for ${date}` : ''}${typeof people === 'number' ? ` for ${people} people` : ''}. We will get back to you shortly.\n\n— Sweet Narcisse Team`,
        de: `Hallo ${firstName},\n\nWir haben Ihre Privatisierungsanfrage erhalten${date ? ` für ${date}` : ''}${typeof people === 'number' ? ` für ${people} Personen` : ''}. Wir melden uns in Kürze.\n\n— Team Sweet Narcisse`,
        es: `Hola ${firstName},\n\nHemos recibido su solicitud de privatización${date ? ` para ${date}` : ''}${typeof people === 'number' ? ` para ${people} personas` : ''}. Nos pondremos en contacto pronto.\n\n— Equipo Sweet Narcisse`,
        it: `Ciao ${firstName},\n\nAbbiamo ricevuto la tua richiesta di privatizzazione${date ? ` per ${date}` : ''}${typeof people === 'number' ? ` per ${people} persone` : ''}. Ti ricontatteremo a breve.\n\n— Team Sweet Narcisse`
      } as const

      await resend.emails.send({
        from: EMAIL_FROM,
        to: [email],
        subject: subjects[userLang],
        text: greetings[userLang]
      })
    } catch (e) {
      console.warn('Ack email (private) failed for', email, e)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur technique' }, { status: 500 })
  }
}
