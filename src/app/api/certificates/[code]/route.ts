import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  verifyCertificateToken,
  getCertificateByCode,
  getEligibleByTicket,
  uploadCertificatePdf,
  downloadCertificatePdf,
  recordCertificateDownload,
} from '@/lib/certificates'
import {
  generateCertificateHtml,
  type CertificateSignature,
  type CertificateTemplateData,
} from '@/lib/certificate-html'
import { generatePdfFromHtml } from '@/lib/pdf'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function loadTemplateWithSignatures(
  eventId: number,
  templateId: number | null
) {
  const admin = createAdminClient()

  // Tenta o template registrado no certificado primeiro; senão template do
  // evento; senão template padrão (event_id NULL).
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

  // Carrega assinaturas vinculadas ao template (multi via pivot)
  let signatures: CertificateSignature[] = []
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

      // Preserva ordem do pivot
      const byId = new Map((sigs ?? []).map((s: any) => [s.id, s]))
      signatures = (pivot ?? [])
        .map((p: any) => byId.get(p.signature_id))
        .filter(Boolean) as CertificateSignature[]
    }
  }

  return {
    template: template as
      | (CertificateTemplateData & { id: number; duration_hours: number | null })
      | null,
    signatures,
  }
}

function getBaseUrl(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`
  )
}

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const code = params.code
  const token = req.nextUrl.searchParams.get('t')
  const download = req.nextUrl.searchParams.get('download') === '1'

  if (!token || !verifyCertificateToken(code, token)) {
    return NextResponse.json(
      { error: 'Link inválido ou expirado.' },
      { status: 401 }
    )
  }

  const certificate = await getCertificateByCode(code)
  if (!certificate) {
    return NextResponse.json(
      { error: 'Certificado não encontrado.' },
      { status: 404 }
    )
  }

  if (certificate.revoked_at) {
    return NextResponse.json(
      { error: 'Este certificado foi revogado.' },
      { status: 410 }
    )
  }

  // Se já tem PDF salvo, serve do Storage
  if (certificate.pdf_path) {
    const cached = await downloadCertificatePdf(certificate.pdf_path)
    if (cached) {
      await recordCertificateDownload(certificate.id)
      return new NextResponse(new Uint8Array(cached), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="certificado-${code}.pdf"`,
          'Cache-Control': 'private, no-store',
        },
      })
    }
  }

  // Re-valida elegibilidade (defesa em profundidade — caso ticket tenha sido
  // estornado depois da emissão)
  const eligible = await getEligibleByTicket(certificate.ticket_id)
  if (!eligible) {
    return NextResponse.json(
      { error: 'Ticket não elegível.' },
      { status: 403 }
    )
  }

  // Gera o PDF agora
  const baseUrl = getBaseUrl(req)
  const verifyUrl = `${baseUrl}/verificar/${code}`
  const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 300,
    color: { dark: '#2b2e8d', light: '#ffffff' },
  })

  const { template, signatures } = await loadTemplateWithSignatures(
    certificate.event_id,
    certificate.template_id
  )

  const html = generateCertificateHtml({
    participantName: certificate.participant_name,
    eventTitle: certificate.event_title,
    eventDate: String(certificate.event_date),
    durationHours: certificate.duration_hours,
    verificationCode: certificate.verification_code,
    qrCodeDataUrl,
    verificationUrl: verifyUrl.replace(/^https?:\/\//, ''),
    template: {
      header_text: template?.header_text ?? 'Certificado de Participação',
      body_text:
        template?.body_text ??
        'Certificamos que {nome} participou do evento "{evento}", realizado em {data}, com carga horária de {duracao}h.',
      footer_text: template?.footer_text ?? null,
      logo_url: template?.logo_url ?? null,
      background_url: (template as any)?.background_url ?? null,
    },
    signatures,
  })

  const pdfBuffer = await generatePdfFromHtml(html, {
    format: 'A4',
    landscape: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  })

  // Salva no Storage pra próximas requisições
  await uploadCertificatePdf(certificate, pdfBuffer)
  await recordCertificateDownload(certificate.id)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="certificado-${code}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
