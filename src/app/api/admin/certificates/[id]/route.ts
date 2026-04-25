import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  signCertificateToken,
  deleteCertificatePdf,
} from '@/lib/certificates'

export const dynamic = 'force-dynamic'

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

// PATCH — revogar / regenerar
// body: { action: 'revoke', reason: string } | { action: 'regenerate' }
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })

  const id = Number(params.id)
  const body = await req.json().catch(() => ({}))
  const admin = createAdminClient()

  if (body.action === 'revoke') {
    await admin
      .from('certificates')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_reason: body.reason ?? null,
      })
      .eq('id', id)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'unrevoke') {
    await admin
      .from('certificates')
      .update({
        revoked_at: null,
        revoked_reason: null,
      })
      .eq('id', id)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'regenerate') {
    // Apaga PDF do storage; próximo download regenera
    const { data: cert } = await admin
      .from('certificates')
      .select('pdf_path')
      .eq('id', id)
      .maybeSingle()
    if (cert?.pdf_path) {
      await deleteCertificatePdf(cert.pdf_path)
    }
    await admin
      .from('certificates')
      .update({ pdf_path: null })
      .eq('id', id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
}

// GET — gera URL assinada pro download admin (sem expiração via service role)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })

  const id = Number(params.id)
  const admin = createAdminClient()
  const { data: cert } = await admin
    .from('certificates')
    .select('verification_code')
    .eq('id', id)
    .maybeSingle()
  if (!cert) {
    return NextResponse.json(
      { error: 'Certificado não encontrado.' },
      { status: 404 }
    )
  }
  const token = signCertificateToken((cert as any).verification_code)
  return NextResponse.json({
    url: `/api/certificates/${(cert as any).verification_code}?t=${token}`,
  })
}
