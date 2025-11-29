import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { GroupRequestTemplate } from '@/components/emails/GroupRequestTemplate'
import { CustomerAcknowledgement } from '@/components/emails/CustomerAcknowledgement'
import { createLog } from '@/lib/logger'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { normalizeIncoming } from '@/lib/phone'
import { EMAIL_FROM, EMAIL_ROLES } from '@/lib/emailAddresses'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null as unknown as Resend

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const rl = await rateLimit({ key: `contact:group:${ip}`, limit: 5, windowMs: 300_000 })
    if (!rl.allowed) return NextResponse.json({ error: 'Trop de demandes', retryAfter: rl.retryAfter }, { status: 429 })

    const json = await request.json()
    const schema = z.object({
      firstName: z.string().min(1).max(60),
      lastName: z.string().min(1).max(60),
      email: z.string().email().max(120),
      // Provide defaults so template props are always strings
      phone: z.string().max(30).default(''),
      message: z.string().max(1500).default(''),
      people: z.number().int().min(1).max(500),
      company: z.string().max(120).default(''),
      reason: z.string().max(200).default(''),
      eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('').default('')),
      eventTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal('').default('')),
      budget: z.string().max(40).default(''),
      captchaToken: z.string().min(10),
      lang: z.enum(['fr','en','de','es','it']).optional()
    }).superRefine((val, ctx) => {
      if (val.people >= 12 && !val.company) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Entreprise requise pour les groupes de 12+', path: ['company'] })
      }
    })
    const parsed = schema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides', issues: parsed.error.flatten() }, { status: 422 })
    let { firstName, lastName, email, phone, message, people, company, reason, eventDate, eventTime, budget, captchaToken, lang } = parsed.data
    const supported = ['fr','en','de','es','it'] as const
    type Lang = typeof supported[number]
    const referer = request.headers.get('referer') || ''
    const accept = request.headers.get('accept-language') || ''
    const urlLang: Lang | undefined = (()=>{
      const m = referer.match(/\/([a-z]{2})(?:\/|$)/i)
      const c = m?.[1]?.toLowerCase() as Lang | undefined
      return supported.includes(c as Lang) ? (c as Lang) : undefined
    })()
    const headerLang: Lang | undefined = (()=>{
      const first = accept.split(',')[0]?.trim().slice(0,2).toLowerCase() as Lang | undefined
      return supported.includes(first as Lang) ? (first as Lang) : undefined
    })()
    const userLang: Lang = (lang as Lang) || urlLang || headerLang || 'fr'
    // Normalize phone if provided with leading +country format (booking widget already sends E.164)
    if (phone) phone = normalizeIncoming(phone)

    // 1. VÉRIFICATION CAPTCHA
    if (!captchaToken) {
        return NextResponse.json({ error: "Captcha manquant." }, { status: 400 })
    }

    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`
    const captchaRes = await fetch(verifyUrl, { method: 'POST' })
    const captchaData = await captchaRes.json()

    if (!captchaData.success) {
        return NextResponse.json({ error: "Validation Captcha échouée." }, { status: 400 })
    }

    // 2. ENVOI DE L'EMAIL
    // On envoie cet email À L'ADMINISTRATEUR (vous)
    if (!resend) {
      return NextResponse.json({ error: 'Email service non configuré' }, { status: 500 })
    }
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM.notifications,
      to: [process.env.ADMIN_EMAIL || EMAIL_ROLES.notifications],
      subject: `Demande de Groupe - ${firstName} ${lastName}`,
      replyTo: email, // Pour répondre directement au client en cliquant sur "Répondre"
      // 👇 FIX : Ajout de 'await' ici aussi
        react: await GroupRequestTemplate({ 
          firstName, 
          lastName, 
          email, 
          phone, 
          message, 
          people,
          company,
          reason,
          eventDate,
          eventTime,
          budget
        })
    })

    if (error) {
      console.error("Erreur Resend:", error)
      return NextResponse.json({ error: "Erreur lors de l'envoi de l'email." }, { status: 500 })
    }

    // 3. LOG
    await createLog('CONTACT_GROUP', `Demande de groupe reçue de ${firstName} ${lastName} (${people} pers)`)

    // 4. Envoi d'un accusé de réception au client (non bloquant)
    try {
      if (resend) await resend.emails.send({
        from: EMAIL_FROM.contact,
        to: [email],
        subject: ({
          fr: 'Demande reçue – Sweet Narcisse',
          en: 'Request received – Sweet Narcisse',
          de: 'Anfrage eingegangen – Sweet Narcisse',
          es: 'Solicitud recibida – Sweet Narcisse',
          it: 'Richiesta ricevuta – Sweet Narcisse'
        } as const)[userLang],
        react: await CustomerAcknowledgement({ firstName, kind: 'group', people, lang: userLang })
      })
    } catch (e) {
      console.warn('Ack email (group) failed for', email, e)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erreur technique" }, { status: 500 })
  }
}