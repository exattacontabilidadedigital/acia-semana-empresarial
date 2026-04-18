import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPaymentStatus } from '@/lib/asaas'
import { generateAndUploadQRCode } from '@/lib/qrcode'

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

    // Gerar 1 QR code por grupo (ou por order se não tem grupo)
    const groupId = pendingInscriptions[0].purchase_group
    const qrCodeUrl = groupId
      ? await generateAndUploadQRCode(groupId, 'group')
      : await generateAndUploadQRCode(pendingInscriptions[0].order_number!)

    // Confirmar todas as inscrições pendentes
    let confirmed = 0
    for (const inscription of pendingInscriptions) {

      // Atualizar inscrição
      const { error: updateError } = await supabase
        .from('inscriptions')
        .update({ payment_status: 'confirmed', qr_code: qrCodeUrl })
        .eq('id', inscription.id)

      if (updateError) {
        console.error(`[SYNC] Erro ao atualizar inscrição ${inscription.id}:`, updateError)
        continue
      }

      // Criar tickets
      const tickets = []
      for (let i = 0; i < (inscription.quantity || 1); i++) {
        tickets.push({
          inscription_id: inscription.id,
          event_id: inscription.event_id,
          participant_name: inscription.nome,
          status: 'active',
        })
      }

      const { error: ticketError } = await supabase.from('tickets').insert(tickets)
      if (ticketError) {
        console.error(`[SYNC] Erro ao criar tickets para inscrição ${inscription.id}:`, ticketError)
      }

      // Enviar email de confirmação
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email/confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: inscription.order_number }),
      }).catch((e) => console.error('[SYNC] Erro ao enviar email:', e))

      confirmed++
      console.log(`[SYNC] Inscrição ${inscription.order_number} confirmada - ${tickets.length} ticket(s)`)
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
