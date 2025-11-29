import { NextResponse } from 'next/server'
import { sendMail } from '@/lib/mailer'
import { EMAIL_FROM, EMAIL_ROLES } from '@/lib/emailAddresses'

export async function POST(req: Request){
  try {
    const body = await req.json()
    const { name, email, message } = body || {}
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
  } catch (e:any){
    return NextResponse.json({ error: 'Contact failed', details: String(e?.message||e) }, { status: 500 })
  }
}
