import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const SIGNING_SECRET =
  process.env.CERTIFICATE_SIGNING_SECRET || 'dev-secret-change-in-production'

const TOKEN_TTL_SECONDS = 60 * 10 // 10 minutos

const STORAGE_BUCKET = 'certificates'

export type EligibleRow = {
  ticket_id: string
  inscription_id: number
  event_id: number
  event_title: string
  event_date: string
  event_status: string
  participant_name: string
  participant_cpf: string
  participant_email: string
  checked_in_at: string
  certificate_id: number | null
  verification_code: string | null
  issued_at: string | null
  email_sent_at: string | null
  revoked_at: string | null
}

export type CertificateRow = {
  id: number
  ticket_id: string
  inscription_id: number
  event_id: number
  participant_name: string
  participant_cpf: string
  participant_email: string
  event_title: string
  event_date: string
  duration_hours: number | null
  verification_code: string
  pdf_path: string | null
  issued_at: string
  download_count: number
  last_downloaded_at: string | null
  email_sent_at: string | null
  email_sent_to: string | null
  email_send_count: number
  email_last_error: string | null
  template_id: number | null
  revoked_at: string | null
  revoked_reason: string | null
  created_at: string
  updated_at: string
}

// ============================================
// Tokens HMAC pra acesso público ao PDF
// ============================================

export function signCertificateToken(code: string, expSeconds = TOKEN_TTL_SECONDS): string {
  const exp = Math.floor(Date.now() / 1000) + expSeconds
  const payload = `${code}.${exp}`
  const sig = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(payload)
    .digest('base64url')
  return `${exp}.${sig}`
}

export function verifyCertificateToken(code: string, token: string): boolean {
  if (!code || !token) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [expStr, sig] = parts
  const exp = Number(expStr)
  if (!Number.isFinite(exp)) return false
  if (Date.now() / 1000 > exp) return false

  const expected = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(`${code}.${exp}`)
    .digest('base64url')
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  } catch {
    return false
  }
}

// ============================================
// Elegibilidade
// ============================================

function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

export async function getEligibleByCpf(cpf: string): Promise<EligibleRow[]> {
  const admin = createAdminClient()
  const cleaned = normalizeCpf(cpf)
  if (cleaned.length !== 11) return []

  // Busca por CPF normalizado (algumas inscrições podem ter formatação diferente)
  const { data, error } = await admin
    .from('eligible_certificates')
    .select('*')
    .order('event_date', { ascending: false })

  if (error || !data) return []
  return data.filter(
    (r: any) => normalizeCpf(r.participant_cpf) === cleaned
  ) as EligibleRow[]
}

export async function getEligibleByEvent(eventId: number): Promise<EligibleRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('eligible_certificates')
    .select('*')
    .eq('event_id', eventId)
    .order('participant_name', { ascending: true })
  if (error || !data) return []
  return data as EligibleRow[]
}

export async function getEligibleByTicket(
  ticketId: string
): Promise<EligibleRow | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('eligible_certificates')
    .select('*')
    .eq('ticket_id', ticketId)
    .maybeSingle()
  return (data as EligibleRow) ?? null
}

// ============================================
// Persistência: get-or-create + Storage
// ============================================

export async function getOrCreateCertificate(
  ticketId: string
): Promise<{ certificate: CertificateRow | null; error?: string }> {
  const admin = createAdminClient()

  // Já existe?
  const { data: existing } = await admin
    .from('certificates')
    .select('*')
    .eq('ticket_id', ticketId)
    .maybeSingle()
  if (existing) return { certificate: existing as CertificateRow }

  // Verifica elegibilidade
  const eligible = await getEligibleByTicket(ticketId)
  if (!eligible) {
    return { certificate: null, error: 'Ticket não elegível pra certificado.' }
  }

  // Resolve template (1º o do evento, senão o padrão NULL)
  const { data: tplEvent } = await admin
    .from('certificate_templates')
    .select('id, duration_hours')
    .eq('event_id', eligible.event_id)
    .maybeSingle()
  const { data: tplDefault } = !tplEvent
    ? await admin
        .from('certificate_templates')
        .select('id, duration_hours')
        .is('event_id', null)
        .maybeSingle()
    : { data: null }
  const template = tplEvent ?? tplDefault

  // Carga horária: prioridade template > evento
  const { data: ev } = await admin
    .from('events')
    .select('duration_hours')
    .eq('id', eligible.event_id)
    .maybeSingle()
  const durationHours =
    (template as any)?.duration_hours ?? ev?.duration_hours ?? null

  const { data: created, error } = await admin
    .from('certificates')
    .insert({
      ticket_id: eligible.ticket_id,
      inscription_id: eligible.inscription_id,
      event_id: eligible.event_id,
      participant_name: eligible.participant_name,
      participant_cpf: eligible.participant_cpf,
      participant_email: eligible.participant_email,
      event_title: eligible.event_title,
      event_date: eligible.event_date,
      duration_hours: durationHours,
      template_id: (template as any)?.id ?? null,
    })
    .select('*')
    .single()

  if (error) {
    // Possível race: outro request criou no meio. Reler.
    const { data: reread } = await admin
      .from('certificates')
      .select('*')
      .eq('ticket_id', ticketId)
      .maybeSingle()
    if (reread) return { certificate: reread as CertificateRow }
    return { certificate: null, error: error.message }
  }

  return { certificate: created as CertificateRow }
}

export async function getCertificateByCode(
  code: string
): Promise<CertificateRow | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('certificates')
    .select('*')
    .eq('verification_code', code)
    .maybeSingle()
  return (data as CertificateRow) ?? null
}

export async function uploadCertificatePdf(
  certificate: CertificateRow,
  buffer: Buffer
): Promise<string | null> {
  const admin = createAdminClient()
  const path = `${certificate.event_id}/${certificate.verification_code}.pdf`
  const { error } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    })
  if (error) return null
  await admin
    .from('certificates')
    .update({ pdf_path: path })
    .eq('id', certificate.id)
  return path
}

export async function downloadCertificatePdf(
  pdfPath: string
): Promise<Buffer | null> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .download(pdfPath)
  if (error || !data) return null
  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function deleteCertificatePdf(pdfPath: string): Promise<void> {
  const admin = createAdminClient()
  await admin.storage.from(STORAGE_BUCKET).remove([pdfPath])
}

// ============================================
// Auditoria
// ============================================

export async function recordCertificateDownload(
  certificateId: number
): Promise<void> {
  const admin = createAdminClient()
  // increment via SQL para evitar race (Supabase não tem .increment, usar RPC ou raw)
  const { data: current } = await admin
    .from('certificates')
    .select('download_count')
    .eq('id', certificateId)
    .maybeSingle()
  const next = ((current as any)?.download_count ?? 0) + 1
  await admin
    .from('certificates')
    .update({
      download_count: next,
      last_downloaded_at: new Date().toISOString(),
    })
    .eq('id', certificateId)
}

export async function recordCertificateEmailSent(
  certificateId: number,
  to: string
): Promise<void> {
  const admin = createAdminClient()
  const { data: current } = await admin
    .from('certificates')
    .select('email_send_count')
    .eq('id', certificateId)
    .maybeSingle()
  const next = ((current as any)?.email_send_count ?? 0) + 1
  await admin
    .from('certificates')
    .update({
      email_sent_at: new Date().toISOString(),
      email_sent_to: to,
      email_send_count: next,
      email_last_error: null,
    })
    .eq('id', certificateId)
}

export async function recordCertificateEmailError(
  certificateId: number,
  error: string
): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('certificates')
    .update({ email_last_error: error })
    .eq('id', certificateId)
}
