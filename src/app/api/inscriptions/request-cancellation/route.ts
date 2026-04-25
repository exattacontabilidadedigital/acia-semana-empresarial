import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/email'
import { reportError } from '@/lib/observability'

const schema = z.object({
  order_number: z.string().min(1),
  cpf: z.string().min(11),
  reason: z.string().min(5).max(500),
})

export async function POST(request: Request) {
  try {
    const limited = enforceRateLimit(request, {
      key: 'cancellation-request',
      limit: 5,
      windowSeconds: 300,
    })
    if (limited) return limited

    const body = await request.json()
    const data = schema.parse(body)
    const cpfClean = data.cpf.replace(/\D/g, '')

    const supabase = createAdminClient()

    const { data: inscription } = await supabase
      .from('inscriptions')
      .select('id, nome, email, payment_status, total_amount, order_number, event_id')
      .eq('order_number', data.order_number)
      .eq('cpf', cpfClean)
      .single()

    if (!inscription) {
      return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 })
    }

    if (!['confirmed', 'free'].includes(inscription.payment_status)) {
      return NextResponse.json(
        {
          error:
            'Apenas inscrições confirmadas/gratuitas podem ser canceladas por aqui. Para pendentes, use o botão "Não preciso mais".',
        },
        { status: 400 },
      )
    }

    // Já existe pedido pendente?
    const { data: existing } = await supabase
      .from('cancellation_requests')
      .select('id, status')
      .eq('inscription_id', inscription.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um pedido de cancelamento em análise para esta inscrição.' },
        { status: 409 },
      )
    }

    const { data: created, error: insertError } = await supabase
      .from('cancellation_requests')
      .insert({
        inscription_id: inscription.id,
        reason: data.reason,
        status: 'pending',
      })
      .select('id')
      .single()

    if (insertError || !created) {
      throw insertError || new Error('Falha ao criar pedido')
    }

    // Notifica admin por e-mail (best-effort)
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL
    if (adminEmail) {
      sendEmail({
        to: adminEmail,
        subject: `[Cancelamento] ${inscription.order_number} — ${inscription.nome}`,
        html: `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;padding:20px;color:#2D2D2D;">
  <h2 style="color:#5B2D8E;">Novo pedido de cancelamento</h2>
  <p><strong>Pedido:</strong> ${inscription.order_number}</p>
  <p><strong>Participante:</strong> ${inscription.nome}</p>
  <p><strong>E-mail:</strong> ${inscription.email}</p>
  <p><strong>Valor:</strong> R$ ${Number(inscription.total_amount).toFixed(2)}</p>
  <p><strong>Motivo informado:</strong></p>
  <blockquote style="background:#f5f5fa;padding:12px;border-radius:8px;">${data.reason}</blockquote>
  <p>Acesse o painel admin para processar o pedido.</p>
</body></html>`,
        context: `cancellation:${inscription.order_number}`,
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      request_id: created.id,
      message: 'Pedido recebido. Você será contatado por e-mail em até 2 dias úteis.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 },
      )
    }
    reportError(error, { scope: 'inscriptions.request-cancellation' })
    return NextResponse.json(
      { error: 'Erro ao processar pedido' },
      { status: 500 },
    )
  }
}
