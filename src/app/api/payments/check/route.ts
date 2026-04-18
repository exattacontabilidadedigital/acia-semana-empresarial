import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPaymentStatus } from '@/lib/asaas'
import { generateAndUploadQRCode } from '@/lib/qrcode'

async function confirmInscriptions(supabase: ReturnType<typeof createAdminClient>, paymentId: string) {
  const { data: pendingInscriptions } = await supabase
    .from('inscriptions')
    .select('*')
    .eq('payment_id', paymentId)
    .eq('payment_status', 'pending')

  if (!pendingInscriptions || pendingInscriptions.length === 0) return

  for (const inscription of pendingInscriptions) {
    const qrCodeUrl = await generateAndUploadQRCode(inscription.order_number!)

    await supabase
      .from('inscriptions')
      .update({ payment_status: 'confirmed', qr_code: qrCodeUrl })
      .eq('id', inscription.id)

    const tickets = []
    for (let i = 0; i < (inscription.quantity || 1); i++) {
      tickets.push({
        inscription_id: inscription.id,
        event_id: inscription.event_id,
        participant_name: inscription.nome,
        status: 'active',
      })
    }
    await supabase.from('tickets').insert(tickets)

    // Email async
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email/confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_number: inscription.order_number }),
    }).catch(() => {})
  }

  console.log(`[CHECK] ${pendingInscriptions.length} inscrição(ões) confirmada(s) via polling para payment ${paymentId}`)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const orderNumber = searchParams.get('order')
  const group = searchParams.get('group')

  if (!orderNumber && !group) {
    return NextResponse.json({ error: 'Order number or group required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // ==================== GROUP CHECK ====================
  if (group) {
    const { data: inscriptions } = await supabase
      .from('inscriptions')
      .select('payment_status, order_number, purchase_group, payment_id')
      .eq('purchase_group', group)

    if (!inscriptions || inscriptions.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const allConfirmed = inscriptions.every(
      (i) => i.payment_status === 'confirmed' || i.payment_status === 'free'
    )

    // Se tem pendentes, consultar Asaas diretamente
    if (!allConfirmed) {
      const pendingWithPayment = inscriptions.find(
        (i) => i.payment_status === 'pending' && i.payment_id
      )

      if (pendingWithPayment?.payment_id) {
        try {
          const asaasStatus = await getPaymentStatus(pendingWithPayment.payment_id)
          console.log(`[CHECK] Asaas status para ${pendingWithPayment.payment_id}: ${asaasStatus.status}`)
          if (asaasStatus.status === 'CONFIRMED' || asaasStatus.status === 'RECEIVED' || asaasStatus.status === 'RECEIVED_IN_CASH') {
            await confirmInscriptions(supabase, pendingWithPayment.payment_id)

            return NextResponse.json({
              purchase_group: group,
              payment_status: 'confirmed',
              inscriptions: inscriptions.map((i) => ({
                order_number: i.order_number,
                payment_status: i.payment_status === 'pending' ? 'confirmed' : i.payment_status,
              })),
            })
          }
        } catch (e) {
          console.error('[CHECK] Erro ao consultar Asaas:', e)
        }
      }
    }

    return NextResponse.json({
      purchase_group: group,
      payment_status: allConfirmed ? 'confirmed' : 'pending',
      inscriptions: inscriptions.map((i) => ({
        order_number: i.order_number,
        payment_status: i.payment_status,
      })),
    })
  }

  // ==================== SINGLE ORDER CHECK ====================
  const { data: inscription } = await supabase
    .from('inscriptions')
    .select('payment_status, order_number, payment_id')
    .eq('order_number', orderNumber!)
    .single()

  if (!inscription) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Se pendente, consultar Asaas diretamente
  if (inscription.payment_status === 'pending' && inscription.payment_id) {
    try {
      const asaasStatus = await getPaymentStatus(inscription.payment_id)
      console.log(`[CHECK] Asaas status para ${inscription.payment_id}: ${asaasStatus.status}`)
      if (asaasStatus.status === 'CONFIRMED' || asaasStatus.status === 'RECEIVED' || asaasStatus.status === 'RECEIVED_IN_CASH') {
        await confirmInscriptions(supabase, inscription.payment_id)

        return NextResponse.json({
          order_number: inscription.order_number,
          payment_status: 'confirmed',
        })
      }
    } catch (e) {
      console.error('[CHECK] Erro ao consultar Asaas:', e)
    }
  }

  return NextResponse.json({
    order_number: inscription.order_number,
    payment_status: inscription.payment_status,
  })
}
