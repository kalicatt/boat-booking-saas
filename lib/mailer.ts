import nodemailer from 'nodemailer'
import type { Attachment } from 'nodemailer/lib/mailer'
import { getEmailSender } from './emailAddresses'

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

type SendMailOptions = {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string | string[]
  attachments?: Attachment[]
}

export async function sendMail({ to, subject, html, text, from, replyTo, attachments }: SendMailOptions){
  const transport = getSmtpTransport()
  const sender = from || getEmailSender('notifications')
  await transport.sendMail({ from: sender, to, subject, html, text, replyTo, attachments })
}
