import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { PrivateRequestTemplate } from '@/components/emails/PrivateRequestTemplate'
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
      phone: z.string().max(40).default(''),
      message: z.string().max(2000).default(''),
      people: z.number().int().min(1).max(200),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      captchaToken: z.string().min(10)
    })
    const parsed = schema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides', issues: parsed.error.flatten() }, { status: 422 })
    let { firstName, lastName, email, phone, message, people, date, captchaToken } = parsed.data

    if (!captchaToken) return NextResponse.json({ error: 'Captcha manquant.' }, { status: 400 })
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`
    const captchaRes = await fetch(verifyUrl, { method: 'POST' })
    const captchaData = await captchaRes.json()
    if (!captchaData.success) return NextResponse.json({ error: 'Validation Captcha échouée.' }, { status: 400 })

    if (phone && phone.startsWith('+')) phone = normalizeIncoming(phone)

    const { error } = await resend.emails.send({
      from: 'Sweet Narcisse <onboarding@resend.dev>',
      to: ['votre-email-admin@example.com'], // Remplacer par destination réelle
      subject: `Privatisation - ${firstName} ${lastName} (${date})`,
      replyTo: email,
      react: await PrivateRequestTemplate({ firstName, lastName, email, phone, message, people, date })
    })

    if (error) {
      console.error('Erreur Resend:', error)
      return NextResponse.json({ error: "Erreur d'envoi email." }, { status: 500 })
    }

    await createLog('CONTACT_PRIVATE', `Demande privatisation ${date} ${people}p par ${firstName} ${lastName}`)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erreur technique' }, { status: 500 })
  }
}
