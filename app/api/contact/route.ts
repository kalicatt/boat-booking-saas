import { NextResponse } from 'next/server'
import { sendMail } from '@/lib/mailer'

export async function POST(req: Request){
  try {
    const body = await req.json()
    const { name, email, message } = body || {}
    if(!message || typeof message !== 'string'){
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }
    const sender = process.env.EMAIL_SENDER || 'no-reply@sweet-narcisse.fr'
    const admin = process.env.EMAIL_SENDER || 'contact@sweet-narcisse.fr'
    await sendMail({ to: admin, subject: `Nouveau message de contact`, text: `Nom: ${name||'—'}\nEmail: ${email||'—'}\n\n${message}`, from: sender })
    return NextResponse.json({ success: true })
  } catch (e:any){
    return NextResponse.json({ error: 'Contact failed', details: String(e?.message||e) }, { status: 500 })
  }
}
