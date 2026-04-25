import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getOrCreateCertificate,
  recordCertificateEmailSent,
  recordCertificateEmailError,
  uploadCertificatePdf,
  downloadCertificatePdf,
  getCertificateByCode,
} from '@/lib/certificates'
import { sendEmail } from '@/lib/email'
import { generateCertificateHtml } from '@/lib/certificate-html'
import { generatePdfFromHtmlBatch } from '@/lib/pdf'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function requireAdmin() {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data } = await admin.rpc('is_admin', { user_id: user.id })
  if (!data) return null
  return user
}

function getBaseUrl(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`
  )
}

async function loadTemplateAndSignatures(
  eventId: number,
  templateId: number | null
) {
  const admin = createAdminClient()
  let template: any = null
  if (templateId) {
    const { data } = await admin
      .from('certificate_templates')
      .select('*')
      .eq('id', templateId)
      .maybeSingle()
    template = data
  }
  if (!template) {
    const { data } = await admin
      .from('certificate_templates')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle()
    template = data
  }
  if (!template) {
    const { data } = await admin
      .from('certificate_templates')
      .select('*')
      .is('event_id', null)
      .maybeSingle()
    template = data
  }

  let signatures: any[] = []
  if (template?.id) {
    const { data: pivot } = await admin
      .from('certificate_template_signatures')
      .select('signature_id, display_order')
      .eq('template_id', template.id)
      .order('display_order', { ascending: true })

    const ids = (pivot ?? []).map((p: any) => p.signature_id)
    if (ids.length > 0) {
      const { data: sigs } = await admin
        .from('certificate_signatures')
        .select(
          'id, name, role, organization, signature_image_url, organization_logo_url, image_size'
        )
        .in('id', ids)
        .eq('active', true)
      const byId = new Map((sigs ?? []).map((s: any) => [s.id, s]))
      signatures = (pivot ?? [])
        .map((p: any) => byId.get(p.signature_id))
        .filter(Boolean)
    }
  }

  return { template, signatures }
}

function buildEmailHtml(args: {
  participantName: string
  eventTitle: string
  verificationCode: string
  verifyUrl: string
}) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#333;background:#f5f5fa;padding:30px;margin:0">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#5B2D8E,#3D1A6E);color:#fff;padding:28px;text-align:center">
      <div style="font-size:11px;letter-spacing:2px;font-weight:600;opacity:0.9">CERTIFICADO DE PARTICIPAÇÃO</div>
      <div style="font-size:20px;font-weight:800;margin-top:6px">${escapeHtml(args.eventTitle)}</div>
    </div>
    <div style="padding:30px">
      <p style="font-size:15px;margin-bottom:18px">Olá <strong>${escapeHtml(args.participantName)}</strong>,</p>
      <p style="font-size:14px;color:#555;line-height:1.6;margin-bottom:18px">
        Em anexo está o seu certificado de participação. Você também pode validar
        a autenticidade no link abaixo:
      </p>
      <p style="margin-bottom:24px">
        <a href="${escapeHtml(args.verifyUrl)}"
           style="background:#5B2D8E;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px">
          Verificar certificado
        </a>
      </p>
      <p style="font-size:11px;color:#999;border-top:1px solid #eee;padding-top:16px">
        Código: <strong>${escapeHtml(args.verificationCode)}</strong>
      </p>
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

// POST /api/admin/certificates/send-email
// body:
//   { ticket_id?: string, certificate_id?: number, to?: string }    (single)
//   { ticket_ids: string[] }                                        (selection)
//   { event_id: number }                                            (bulk all)
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const baseUrl = getBaseUrl(req)
  const admin = createAdminClient()

  // Resolve lista de ticket_ids
  let ticketIds: string[] = []
  let overrideTo: string | null = null

  if (Array.isArray(body.ticket_ids) && body.ticket_ids.length > 0) {
    ticketIds = body.ticket_ids.map((x: unknown) => String(x))
  } else if (body.ticket_id) {
    ticketIds = [String(body.ticket_id)]
    overrideTo = body.to ?? null
  } else if (body.certificate_id) {
    const { data } = await admin
      .from('certificates')
      .select('ticket_id')
      .eq('id', Number(body.certificate_id))
      .maybeSingle()
    if (data) ticketIds = [(data as any).ticket_id]
    overrideTo = body.to ?? null
  } else if (body.event_id) {
    const { data: rows } = await admin
      .from('eligible_certificates')
      .select('ticket_id')
      .eq('event_id', Number(body.event_id))
    ticketIds = (rows ?? []).map((r: any) => r.ticket_id)
  }

  if (ticketIds.length === 0) {
    return NextResponse.json(
      { error: 'Nenhum ticket pra enviar.' },
      { status: 400 }
    )
  }

  // Garante que todos têm certificate row + carrega dados
  const certificates = []
  for (const ticketId of ticketIds) {
    const { certificate } = await getOrCreateCertificate(ticketId)
    if (certificate) certificates.push(certificate)
  }

  // Pré-renderiza HTML pra todos os que não têm PDF salvo
  const needGenerate: { cert: any; html: string }[] = []
  for (const cert of certificates) {
    if (cert.pdf_path) continue
    const verifyUrl = `${baseUrl}/verificar/${cert.verification_code}`
    const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 300,
      color: { dark: '#2b2e8d', light: '#ffffff' },
    })
    const { template, signatures } = await loadTemplateAndSignatures(
      cert.event_id,
      cert.template_id
    )
    const html = generateCertificateHtml({
      participantName: cert.participant_name,
      eventTitle: cert.event_title,
      eventDate: String(cert.event_date),
      durationHours: cert.duration_hours,
      verificationCode: cert.verification_code,
      qrCodeDataUrl,
      verificationUrl: verifyUrl.replace(/^https?:\/\//, ''),
      template: {
        header_text: template?.header_text ?? 'Certificado de Participação',
        body_text:
          template?.body_text ??
          'Certificamos que {nome} participou do evento "{evento}", realizado em {data}, com carga horária de {duracao}h.',
        footer_text: template?.footer_text ?? null,
        logo_url: template?.logo_url ?? null,
        background_url: template?.background_url ?? null,
      },
      signatures,
    })
    needGenerate.push({ cert, html })
  }

  // Gera todos em batch (1 browser pra todos)
  if (needGenerate.length > 0) {
    const buffers = await generatePdfFromHtmlBatch(
      needGenerate.map((x) => x.html),
      { format: 'A4', landscape: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } }
    )
    for (let i = 0; i < buffers.length; i++) {
      const item = needGenerate[i]
      await uploadCertificatePdf(item.cert, buffers[i])
      item.cert.pdf_path = `${item.cert.event_id}/${item.cert.verification_code}.pdf`
    }
  }

  // Envia emails serial com pause de 200ms
  const results = []
  for (const cert of certificates) {
    const to = overrideTo || cert.participant_email
    try {
      const pdfBuffer = await downloadCertificatePdf(cert.pdf_path!)
      if (!pdfBuffer) throw new Error('Falha ao ler PDF do storage.')

      const verifyUrl = `${baseUrl}/verificar/${cert.verification_code}`
      const html = buildEmailHtml({
        participantName: cert.participant_name,
        eventTitle: cert.event_title,
        verificationCode: cert.verification_code,
        verifyUrl,
      })

      const send = await sendEmail({
        to,
        subject: `Seu certificado — ${cert.event_title}`,
        html,
        attachments: [
          {
            filename: `certificado-${cert.verification_code}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      })

      if (send.success) {
        await recordCertificateEmailSent(cert.id, to)
        results.push({ certificate_id: cert.id, ok: true, to })
      } else {
        await recordCertificateEmailError(cert.id, send.reason ?? 'unknown')
        results.push({
          certificate_id: cert.id,
          ok: false,
          error: send.reason ?? 'unknown',
        })
      }
    } catch (e: any) {
      await recordCertificateEmailError(cert.id, e?.message ?? 'unknown')
      results.push({
        certificate_id: cert.id,
        ok: false,
        error: e?.message ?? 'unknown',
      })
    }
    await sleep(200)
  }

  return NextResponse.json({ results })
}
