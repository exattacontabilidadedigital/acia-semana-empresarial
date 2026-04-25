import { NextRequest, NextResponse } from 'next/server'
import {
  getEligibleByCpf,
  getOrCreateCertificate,
  signCertificateToken,
} from '@/lib/certificates'

export const dynamic = 'force-dynamic'

// GET /api/certificates/eligible?cpf=12345678900
// Lista todos os certificados que essa pessoa pode emitir, já criando o row
// (com verification_code) quando ainda não existe, e retorna URL assinada.
export async function GET(req: NextRequest) {
  const cpf = req.nextUrl.searchParams.get('cpf')?.trim()
  if (!cpf) {
    return NextResponse.json({ error: 'CPF obrigatório.' }, { status: 400 })
  }

  const eligible = await getEligibleByCpf(cpf)

  // Pra cada elegível, garante que existe um certificate row e gera token
  const items = await Promise.all(
    eligible.map(async (row) => {
      const { certificate } = await getOrCreateCertificate(row.ticket_id)
      if (!certificate) {
        return null
      }
      const token = signCertificateToken(certificate.verification_code)
      return {
        certificate_id: certificate.id,
        verification_code: certificate.verification_code,
        ticket_id: row.ticket_id,
        event_id: row.event_id,
        event_title: row.event_title,
        event_date: row.event_date,
        participant_name: row.participant_name,
        revoked: !!certificate.revoked_at,
        url: `/api/certificates/${certificate.verification_code}?t=${token}`,
      }
    })
  )

  return NextResponse.json({
    items: items.filter((x) => x && !x.revoked),
  })
}
