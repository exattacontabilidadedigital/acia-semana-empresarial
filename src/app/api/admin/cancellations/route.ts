import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { reportError } from '@/lib/observability'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('cancellation_requests')
      .select(
        `
        id, status, reason, admin_notes, created_at, resolved_at,
        inscription_id,
        inscription:inscriptions (
          order_number, nome, email, telefone, cpf, payment_status,
          payment_id, total_amount, event_id,
          event:events ( title, event_date, start_time )
        )
      `,
      )
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ requests: data ?? [] })
  } catch (error) {
    reportError(error, { scope: 'admin.cancellations.list' })
    return NextResponse.json({ error: 'Erro ao carregar pedidos' }, { status: 500 })
  }
}

const updateSchema = z.object({
  id: z.number(),
  status: z.enum(['approved', 'rejected', 'refunded']),
  admin_notes: z.string().optional(),
  cancel_inscription: z.boolean().optional(),
})

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const data = updateSchema.parse(body)

    const supabase = createAdminClient()

    const updates: Record<string, unknown> = {
      status: data.status,
      admin_notes: data.admin_notes ?? null,
      resolved_at: new Date().toISOString(),
    }

    const { data: updated, error } = await supabase
      .from('cancellation_requests')
      .update(updates)
      .eq('id', data.id)
      .select('id, inscription_id')
      .single()

    if (error || !updated) throw error || new Error('Pedido não encontrado')

    // Se aprovado/reembolsado e o admin pediu, marca a inscription como cancelled
    if ((data.status === 'approved' || data.status === 'refunded') && data.cancel_inscription) {
      await supabase
        .from('inscriptions')
        .update({ payment_status: 'cancelled' })
        .eq('id', updated.inscription_id)

      // Invalida tickets ativos da inscription
      await supabase
        .from('tickets')
        .update({ status: 'cancelled' })
        .eq('inscription_id', updated.inscription_id)
        .eq('status', 'active')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    reportError(error, { scope: 'admin.cancellations.update' })
    return NextResponse.json({ error: 'Erro ao atualizar pedido' }, { status: 500 })
  }
}
