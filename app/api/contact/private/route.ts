import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { GroupRequestTemplate } from '@/components/emails/GroupRequestTemplate'
import { CustomerAcknowledgement } from '@/components/emails/CustomerAcknowledgement'
import { createLog } from '@/lib/logger'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { normalizeIncoming } from '@/lib/phone'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const rl = rateLimit({ key: `contact:private:${ip}`, limit: 5, windowMs: 300_000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Trop de demandes', retryAfter: rl.retryAfter }, { status: 429 })

    const json = await request.json()
    const schema = z.object({
      firstName: z.string().min(1).max(60),
      lastName: z.string().min(1).max(60),
      email: z.string().email().max(120),
      phone: z.string().max(30).default(''),
      message: z.string().max(1500).default(''),
      people: z.number().int().min(1).max(500).optional(),
      date: z.string().max(120).optional(),
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

    // CAPTCHA
    if (!captchaToken) {
      return NextResponse.json({ error: 'Captcha manquant.' }, { status: 400 })
    }
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`
    const captchaRes = await fetch(verifyUrl, { method: 'POST' })
    const captchaData = await captchaRes.json()
    if (!captchaData.success) {
      return NextResponse.json({ error: 'Validation Captcha échouée.' }, { status: 400 })
    }

    // ADMIN EMAIL (reuse GroupRequestTemplate)
    const { error } = await resend.emails.send({
      from: 'Sweet Narcisse <onboarding@resend.dev>',
      to: [process.env.ADMIN_EMAIL || 'votre-email-admin@example.com'],
      subject: `Demande de Privatisation - ${firstName} ${lastName}`,
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
    await createLog('CONTACT_PRIVATE', `Demande de privatisation reçue de ${firstName} ${lastName}${people ? ` (${people} pers)` : ''}${date ? ` pour ${date}` : ''}`)

    // CUSTOMER ACK (non-blocking)
    try {
      await resend.emails.send({
        from: 'Sweet Narcisse <onboarding@resend.dev>',
        to: [email],
        subject: ({
          fr: 'Demande reçue – Sweet Narcisse',
          en: 'Request received – Sweet Narcisse',
          de: 'Anfrage eingegangen – Sweet Narcisse',
          es: 'Solicitud recibida – Sweet Narcisse',
          it: 'Richiesta ricevuta – Sweet Narcisse'
        } as const)[userLang],
        react: await CustomerAcknowledgement({ firstName, kind: 'private', people, date, lang: userLang })
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
