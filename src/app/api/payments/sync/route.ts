import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPaymentStatus } from '@/lib/asaas'
import { confirmInscriptionAtomic } from '@/lib/inscriptions'

export async function POST(request: Request) {
  try {
    const { group, order_number } = await request.json()

    if (!group && !order_number) {
      return NextResponse.json({ error: 'group ou order_number obrigatório' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Buscar inscrições pendentes
    let query = supabase
      .from('inscriptions')
      .select('*')
      .eq('payment_status', 'pending')
      .not('payment_id', 'is', null)

    if (group) {
      query = query.eq('purchase_group', group)
    } else {
      query = query.eq('order_number', order_number)
    }

    const { data: pendingInscriptions } = await query

    if (!pendingInscriptions || pendingInscriptions.length === 0) {
      return NextResponse.json({ message: 'Nenhuma inscrição pendente encontrada', updated: 0 })
    }

    // Pegar payment_id (todas do grupo compartilham o mesmo)
    const paymentId = pendingInscriptions[0].payment_id!

    // Consultar Asaas
    const asaasPayment = await getPaymentStatus(paymentId)
    console.log(`[SYNC] Asaas payment ${paymentId} status: ${asaasPayment.status}`)

    const confirmedStatuses = ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH']

    if (!confirmedStatuses.includes(asaasPayment.status)) {
      return NextResponse.json({
        message: `Pagamento ainda não confirmado no Asaas. Status atual: ${asaasPayment.status}`,
        asaas_status: asaasPayment.status,
        updated: 0,
      })
    }

    // Confirmação atômica: se webhook + sync rodam simultaneamente, só um confirma cada
    // inscription. O helper já cria tickets e dispara e-mail apenas quando muda o status.
    let confirmed = 0
    for (const inscription of pendingInscriptions) {
      const ok = await confirmInscriptionAtomic(supabase, inscription)
      if (ok) confirmed++
    }

    return NextResponse.json({
      message: `${confirmed} inscrição(ões) confirmada(s)`,
      asaas_status: asaasPayment.status,
      updated: confirmed,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[SYNC] Erro:', message, error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
