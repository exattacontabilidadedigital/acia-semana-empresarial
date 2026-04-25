import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getEligibleByEvent,
  getOrCreateCertificate,
  getCertificateByCode,
  signCertificateToken,
  recordCertificateEmailSent,
  recordCertificateEmailError,
  uploadCertificatePdf,
  deleteCertificatePdf,
} from '@/lib/certificates'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5min pra mass-send

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

// ============================================
// GET — lista elegíveis por evento
// ============================================
export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })

  const eventId = Number(req.nextUrl.searchParams.get('event_id'))
  if (!eventId) {
    return NextResponse.json({ error: 'event_id obrigatório.' }, { status: 400 })
  }

  const rows = await getEligibleByEvent(eventId)
  return NextResponse.json({ items: rows })
}

// ============================================
// POST — emitir certificados (idempotente)
// body: { ticket_ids: string[] } | { event_id: number }
// ============================================
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const ticketIds: string[] = Array.isArray(body.ticket_ids)
    ? body.ticket_ids
    : []

  // Se passou event_id, expande pra todos os elegíveis daquele evento
  if (body.event_id && ticketIds.length === 0) {
    const rows = await getEligibleByEvent(Number(body.event_id))
    ticketIds.push(...rows.map((r) => r.ticket_id))
  }

  if (ticketIds.length === 0) {
    return NextResponse.json(
      { error: 'Nenhum ticket pra emitir.' },
      { status: 400 }
    )
  }

  const results = []
  for (const ticketId of ticketIds) {
    const { certificate, error } = await getOrCreateCertificate(ticketId)
    results.push({
      ticket_id: ticketId,
      ok: !!certificate,
      certificate_id: certificate?.id ?? null,
      verification_code: certificate?.verification_code ?? null,
      error: error ?? null,
    })
  }

  return NextResponse.json({ results })
}
