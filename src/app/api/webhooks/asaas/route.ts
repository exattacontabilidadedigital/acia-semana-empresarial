import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAndUploadQRCode } from '@/lib/qrcode'

export async function POST(request: Request) {
  try {
    // Validate webhook token
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN
    const authHeader = request.headers.get('asaas-access-token')

    if (webhookToken && authHeader !== webhookToken) {
      console.error('Webhook token inválido')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const supabase = createAdminClient()

    // Log webhook event
    await supabase.from('webhook_events').insert({
      event_type: body.event,
      payment_id: body.payment?.id || null,
      raw_body: body,
    })

    console.log(`[WEBHOOK] Evento recebido: ${body.event} - Payment: ${body.payment?.id}`)

    // Process payment confirmation
    if (body.event === 'PAYMENT_CONFIRMED' || body.event === 'PAYMENT_RECEIVED') {
      const paymentId = body.payment?.id
      if (!paymentId) return NextResponse.json({ received: true })

      // Find all inscriptions with this payment_id (supports multi-event cart)
      const { data: inscriptions } = await supabase
        .from('inscriptions')
        .select('*')
        .eq('payment_id', paymentId)

      if (!inscriptions || inscriptions.length === 0) {
        console.error('Inscrição não encontrada para payment_id:', paymentId)
        return NextResponse.json({ received: true })
      }

      // Gerar 1 QR code por grupo
      const groupId = inscriptions[0].purchase_group
      const qrCodeDataUrl = groupId
        ? await generateAndUploadQRCode(groupId, 'group')
        : await generateAndUploadQRCode(inscriptions[0].order_number!)

      // Process each inscription
      for (const inscription of inscriptions) {

        // Update payment status + QR code
        await supabase
          .from('inscriptions')
          .update({ payment_status: 'confirmed', qr_code: qrCodeDataUrl })
          .eq('id', inscription.id)

        // Create tickets
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

        console.log(`[WEBHOOK] Inscrição ${inscription.order_number} confirmada - ${tickets.length} ticket(s) criado(s)`)

        // Send confirmation email
        try {
          await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email/confirmation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_number: inscription.order_number }),
          })
          console.log(`[WEBHOOK] Email de confirmação enviado para ${inscription.email}`)
        } catch (e) {
          console.error('Erro ao enviar email:', e)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Erro no webhook Asaas:', error)
    return NextResponse.json({ received: true })
  }
}
