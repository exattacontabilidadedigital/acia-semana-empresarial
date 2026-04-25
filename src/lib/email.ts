import nodemailer from 'nodemailer'
import type Mail from 'nodemailer/lib/mailer'
import { createAdminClient } from '@/lib/supabase/admin'

export type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  username: string
  password: string
  from_email: string | null
  from_name: string | null
  enabled: boolean
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  attachments?: Mail.Attachment[]
  /** Identificador opcional pra debug ('confirmation:SE-12345') — vai pra fila se enfileirar */
  context?: string
  /** Se true, ao falhar enfileira pra retry async em vez de retornar erro */
  enqueueOnFailure?: boolean
}

// Cache em memória pra evitar query a cada email enviado.
// TTL curto pra refletir mudanças do admin sem reiniciar app.
let cache: { config: SmtpConfig | null; expiresAt: number } | null = null
const CACHE_TTL_MS = 30_000 // 30s

export function invalidateSmtpCache(): void {
  cache = null
}

async function loadSmtpFromDb(): Promise<SmtpConfig | null> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('smtp_config')
      .select('host, port, secure, username, password, from_email, from_name, enabled')
      .eq('id', 1)
      .maybeSingle()
    return (data as SmtpConfig) ?? null
  } catch {
    return null
  }
}

function loadSmtpFromEnv(): SmtpConfig | null {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null
  const port = Number(process.env.SMTP_PORT) || 587
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    username: process.env.SMTP_USER,
    password: process.env.SMTP_PASS,
    from_email: process.env.SMTP_FROM || process.env.SMTP_USER,
    from_name: null,
    enabled: true,
  }
}

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  if (cache && cache.expiresAt > Date.now()) return cache.config

  const fromDb = await loadSmtpFromDb()
  const config = fromDb && fromDb.enabled ? fromDb : loadSmtpFromEnv()

  cache = { config, expiresAt: Date.now() + CACHE_TTL_MS }
  return config
}

function buildTransporter(cfg: SmtpConfig) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.username,
      pass: cfg.password,
    },
  })
}

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
  context,
  enqueueOnFailure = true,
}: SendEmailOptions) {
  const cfg = await getSmtpConfig()

  if (!cfg) {
    console.log(`[EMAIL] SMTP não configurado. Email para ${to} não enviado.`)
    if (enqueueOnFailure) {
      await enqueueEmail({ to, subject, html, context, error: 'smtp_not_configured' })
    }
    return { success: false, reason: 'smtp_not_configured' as const }
  }

  const fromName = cfg.from_name?.trim()
  const fromAddr = cfg.from_email?.trim() || cfg.username
  const from = fromName ? `"${fromName}" <${fromAddr}>` : fromAddr

  try {
    const transporter = buildTransporter(cfg)
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      attachments,
    })

    console.log(`[EMAIL] Enviado para ${to} - Message ID: ${info.messageId}`)
    return { success: true as const, messageId: info.messageId }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e)
    console.error(`[EMAIL] Falha ao enviar para ${to}: ${errMsg}`)
    if (enqueueOnFailure) {
      await enqueueEmail({ to, subject, html, context, error: errMsg })
    }
    return { success: false as const, reason: 'send_failed' as const, error: errMsg }
  }
}

/**
 * Enfileira um e-mail pra ser enviado mais tarde por um worker. Útil quando SMTP está
 * temporariamente indisponível (throttling, downtime). O worker (`/api/cron/email-queue`)
 * roda periodicamente e processa pendentes com backoff exponencial.
 *
 * Não tem `attachments` pra evitar persistir blobs grandes — pra e-mails com anexos,
 * a falha hoje é só logada (sem retry).
 */
async function enqueueEmail(params: {
  to: string
  subject: string
  html: string
  context?: string
  error?: string
}) {
  try {
    const admin = createAdminClient()
    await admin.from('email_queue').insert({
      to_address: params.to,
      subject: params.subject,
      html: params.html,
      context: params.context ?? null,
      last_error: params.error ?? null,
      status: 'pending',
      next_attempt_at: new Date(Date.now() + 60_000).toISOString(), // próxima tentativa em 1min
    })
    console.log(`[EMAIL] Enfileirado pra retry: ${params.to} (${params.context ?? 'sem contexto'})`)
  } catch (e) {
    console.error('[EMAIL] Erro ao enfileirar:', e)
  }
}

/**
 * Processa e-mails pendentes da fila. Usado pelo endpoint cron.
 * Backoff exponencial: tentativa N agenda próxima em 2^N minutos.
 */
export async function processEmailQueue(maxItems = 20) {
  const admin = createAdminClient()
  const { data: pending } = await admin
    .from('email_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('next_attempt_at', new Date().toISOString())
    .order('next_attempt_at', { ascending: true })
    .limit(maxItems)

  if (!pending || pending.length === 0) {
    return { processed: 0, sent: 0, failed: 0 }
  }

  const cfg = await getSmtpConfig()
  if (!cfg) {
    console.log('[EMAIL_QUEUE] SMTP ainda não configurado — pulando ciclo')
    return { processed: 0, sent: 0, failed: 0, reason: 'smtp_not_configured' as const }
  }

  const transporter = buildTransporter(cfg)
  const fromName = cfg.from_name?.trim()
  const fromAddr = cfg.from_email?.trim() || cfg.username
  const from = fromName ? `"${fromName}" <${fromAddr}>` : fromAddr

  let sent = 0
  let failed = 0

  for (const item of pending) {
    try {
      const info = await transporter.sendMail({
        from,
        to: item.to_address,
        subject: item.subject,
        html: item.html,
      })
      await admin
        .from('email_queue')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', item.id)
      sent++
      console.log(`[EMAIL_QUEUE] Enviado #${item.id} para ${item.to_address} (msg ${info.messageId})`)
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e)
      const attempts = (item.attempts ?? 0) + 1
      const maxReached = attempts >= (item.max_attempts ?? 5)
      const backoffMs = Math.min(60 * 60_000, Math.pow(2, attempts) * 60_000) // até 1h

      await admin
        .from('email_queue')
        .update({
          status: maxReached ? 'failed' : 'pending',
          attempts,
          last_error: errMsg,
          next_attempt_at: new Date(Date.now() + backoffMs).toISOString(),
        })
        .eq('id', item.id)

      failed++
      console.error(
        `[EMAIL_QUEUE] Falha #${item.id} (tentativa ${attempts}${maxReached ? ' — desistindo' : ''}): ${errMsg}`,
      )
    }
  }

  return { processed: pending.length, sent, failed }
}

// Verifica conexão sem enviar mensagem real. Usado pelo botão "Testar conexão".
export async function verifySmtpConnection(
  cfg?: SmtpConfig
): Promise<{ ok: boolean; error?: string }> {
  const config = cfg ?? (await getSmtpConfig())
  if (!config) return { ok: false, error: 'SMTP não configurado.' }
  try {
    const transporter = buildTransporter(config)
    await transporter.verify()
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Erro desconhecido' }
  }
}
