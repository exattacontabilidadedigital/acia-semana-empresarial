import nodemailer from 'nodemailer'
import type Mail from 'nodemailer/lib/mailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  attachments?: Mail.Attachment[]
}

export async function sendEmail({ to, subject, html, attachments }: SendEmailOptions) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[EMAIL] SMTP não configurado. Email para ${to} não enviado.`)
    return { success: false, reason: 'smtp_not_configured' }
  }

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    attachments,
  })

  console.log(`[EMAIL] Enviado para ${to} - Message ID: ${info.messageId}`)
  return { success: true, messageId: info.messageId }
}
