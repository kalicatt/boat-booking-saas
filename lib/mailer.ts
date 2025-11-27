import nodemailer from 'nodemailer'

export function getSmtpTransport(){
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT||587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if(!host || !user || !pass){
    throw new Error('SMTP configuration missing (SMTP_HOST, SMTP_USER, SMTP_PASS)')
  }
  const secure = port === 465
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } })
}

export async function sendMail({ to, subject, html, text, from }: { to: string|string[]; subject: string; html?: string; text?: string; from?: string }){
  const transport = getSmtpTransport()
  const sender = from || process.env.EMAIL_SENDER || process.env.SMTP_USER || 'no-reply@sweet-narcisse.fr'
  await transport.sendMail({ from: sender, to, subject, html, text })
}
