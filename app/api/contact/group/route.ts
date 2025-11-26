import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { GroupRequestTemplate } from '@/components/emails/GroupRequestTemplate'
import { createLog } from '@/lib/logger'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const rl = rateLimit({ key: `contact:group:${ip}`, limit: 5, windowMs: 300_000 })
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
      captchaToken: z.string().min(10)
    })
    const parsed = schema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides', issues: parsed.error.flatten() }, { status: 422 })
    const { firstName, lastName, email, phone, message, people, captchaToken } = parsed.data

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
    const { data, error } = await resend.emails.send({
      from: 'Sweet Narcisse <onboarding@resend.dev>',
      to: ['votre-email-admin@example.com'], // ⚠️ REMPLACEZ PAR VOTRE EMAIL DE RÉCEPTION
      subject: `Demande de Groupe - ${firstName} ${lastName}`,
      replyTo: email, // Pour répondre directement au client en cliquant sur "Répondre"
      // 👇 FIX : Ajout de 'await' ici aussi
      react: await GroupRequestTemplate({ 
          firstName, 
          lastName, 
          email, 
          phone, 
          message, 
          people 
      })
    })

    if (error) {
      console.error("Erreur Resend:", error)
      return NextResponse.json({ error: "Erreur lors de l'envoi de l'email." }, { status: 500 })
    }

    // 3. LOG
    await createLog('CONTACT_GROUP', `Demande de groupe reçue de ${firstName} ${lastName} (${people} pers)`)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erreur technique" }, { status: 500 })
  }
}