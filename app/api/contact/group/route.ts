import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { GroupRequestTemplate } from '@/components/emails/GroupRequestTemplate'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, phone, message } = body

    // ENVOI DE L'EMAIL À L'ADMINISTRATEUR (TOI)
    const { data, error } = await resend.emails.send({
      from: 'Sweet Narcisse <onboarding@resend.dev>',
      
      // ⚠️ IMPORTANT EN TEST : Mets TON adresse email perso ici !
      // En production, tu mettras "contact@sweet-narcisse.fr"
      to: ['servaislucas68@gmail.com'], 
      
      subject: `Demande de Groupe - ${firstName} ${lastName}`,
      replyTo: email, // Pour répondre directement au client en cliquant sur "Répondre"
      react: GroupRequestTemplate({ firstName, lastName, email, phone, message })
    })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}