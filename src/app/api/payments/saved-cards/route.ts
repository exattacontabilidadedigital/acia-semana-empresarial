import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { reportError } from '@/lib/observability'

export const dynamic = 'force-dynamic'

/**
 * GET ?cpf=...  — lista cartões salvos do CPF (sem dados sensíveis).
 * DELETE         — remove um cartão salvo.
 *
 * Não exibimos o token bruto pro frontend; apenas marca, últimos 4 e validade.
 */
export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, {
    key: 'saved-cards-list',
    limit: 30,
    windowSeconds: 60,
  })
  if (limited) return limited

  const cpf = request.nextUrl.searchParams.get('cpf')?.replace(/\D/g, '')
  if (!cpf || cpf.length !== 11) {
    return NextResponse.json({ cards: [] })
  }

  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('saved_cards')
      .select('id, brand, last4, holder_name, expiry_month, expiry_year, last_used_at, created_at')
      .eq('cpf', cpf)
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    // Filtra cartões expirados
    const now = new Date()
    const cards = (data ?? []).filter((c) => {
      if (!c.expiry_month || !c.expiry_year) return true
      const month = parseInt(c.expiry_month, 10)
      const year = parseInt(c.expiry_year, 10)
      const lastDay = new Date(year, month, 0)
      return lastDay >= now
    })

    return NextResponse.json({ cards })
  } catch (error) {
    reportError(error, { scope: 'saved-cards.list' })
    return NextResponse.json({ cards: [] })
  }
}

const deleteSchema = z.object({
  id: z.number().int(),
  cpf: z.string().min(11),
})

export async function DELETE(request: Request) {
  try {
    const limited = enforceRateLimit(request, {
      key: 'saved-cards-delete',
      limit: 10,
      windowSeconds: 60,
    })
    if (limited) return limited

    const body = await request.json()
    const data = deleteSchema.parse(body)
    const cpf = data.cpf.replace(/\D/g, '')

    const supabase = createAdminClient()
    await supabase.from('saved_cards').delete().eq('id', data.id).eq('cpf', cpf)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    reportError(error, { scope: 'saved-cards.delete' })
    return NextResponse.json({ error: 'Erro ao remover cartão' }, { status: 500 })
  }
}
