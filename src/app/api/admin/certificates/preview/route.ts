import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  generateCertificateHtml,
  type CertificateSignature,
} from '@/lib/certificate-html'
import { generatePdfFromHtml } from '@/lib/pdf'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

// POST /api/admin/certificates/preview
// Aceita FormData com os campos do template (mesmo sem ter sido salvo) e
// devolve um PDF de prévia com dados de exemplo. Não persiste nada.
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  }

  const form = await req.formData()
  const headerText =
    String(form.get('header_text') ?? '').trim() ||
    'Certificado de Participação'
  const bodyText =
    String(form.get('body_text') ?? '').trim() ||
    'Certificamos que {nome} participou do evento "{evento}", realizado em {data}, com carga horária de {duracao}h.'
  const footerText = String(form.get('footer_text') ?? '').trim() || null
  const logoUrl = String(form.get('logo_url') ?? '').trim() || null
  const backgroundUrl =
    String(form.get('background_url') ?? '').trim() || null
  const eventIdRaw = String(form.get('event_id') ?? '').trim()
  const eventId =
    eventIdRaw && eventIdRaw !== '0' ? Number(eventIdRaw) : null
  const durationFromForm = form.get('duration_hours')
    ? Number(form.get('duration_hours'))
    : null
  const signatureIds = form
    .getAll('signature_ids')
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n))

  // Dados de exemplo. Se houver evento associado, usa ele; senão, fictício.
  const admin = createAdminClient()
  let eventTitle = 'Evento Exemplo'
  let eventDate = new Date().toISOString().slice(0, 10)
  let durationHours: number | null = durationFromForm

  if (eventId) {
    const { data: ev } = await admin
      .from('events')
      .select('title, event_date, duration_hours')
      .eq('id', eventId)
      .maybeSingle()
    if (ev) {
      eventTitle = (ev as any).title
      eventDate = String((ev as any).event_date)
      if (durationHours == null) durationHours = (ev as any).duration_hours
    }
  }
  if (durationHours == null) durationHours = 8

  // Carrega assinaturas por ID
  let signatures: CertificateSignature[] = []
  if (signatureIds.length > 0) {
    const { data: sigs } = await admin
      .from('certificate_signatures')
      .select(
        'id, name, role, organization, signature_image_url, organization_logo_url, image_size, display_order'
      )
      .in('id', signatureIds)
      .eq('active', true)

    // Preserva a ordem que o admin selecionou (signatureIds)
    const byId = new Map((sigs ?? []).map((s: any) => [s.id, s]))
    signatures = signatureIds
      .map((id) => byId.get(id))
      .filter(Boolean) as CertificateSignature[]
  }

  const baseUrl = getBaseUrl(req)
  const previewCode = 'CERT-2026-PREVIEW'
  const verifyUrl = `${baseUrl}/verificar/${previewCode}`
  const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 300,
    color: { dark: '#2b2e8d', light: '#ffffff' },
  })

  const html = generateCertificateHtml({
    participantName: 'Nome do Participante',
    eventTitle,
    eventDate,
    durationHours,
    verificationCode: previewCode,
    qrCodeDataUrl,
    verificationUrl: verifyUrl.replace(/^https?:\/\//, ''),
    template: {
      header_text: headerText,
      body_text: bodyText,
      footer_text: footerText,
      logo_url: logoUrl,
      background_url: backgroundUrl,
    },
    signatures,
  })

  const pdfBuffer = await generatePdfFromHtml(html, {
    format: 'A4',
    landscape: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  })

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="preview-certificado.pdf"',
      'Cache-Control': 'private, no-store',
    },
  })
}
