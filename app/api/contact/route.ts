import { NextResponse } from 'next/server'
import { sendMail } from '@/lib/mailer'
import { EMAIL_FROM, EMAIL_ROLES } from '@/lib/emailAddresses'

export async function POST(req: Request){
  try {
    type ContactPayload = { name?: string; email?: string; message?: string }
    const body = (await req.json().catch(() => null)) as unknown
    const payload: ContactPayload = body && typeof body === 'object' ? body as ContactPayload : {}
    const { name, email, message } = payload
    if(!message || typeof message !== 'string'){
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }
    const admin = EMAIL_ROLES.contact
    await sendMail({
      to: admin,
      subject: `Nouveau message de contact`,
      text: `Nom: ${name||'—'}\nEmail: ${email||'—'}\n\n${message}`,
      from: EMAIL_FROM.contact,
      replyTo: email && typeof email === 'string' ? email : undefined
    })
    return NextResponse.json({ success: true })
  } catch (error){
    const err = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Contact failed', details: err }, { status: 500 })
  }
}
