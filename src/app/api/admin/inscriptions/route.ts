import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPaymentStatus } from '@/lib/asaas'
import { generateAndUploadQRCode } from '@/lib/qrcode'
import { requireAdminApi } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    // Esta rota só é usada pelo painel admin. Confirma manualmente pagamentos,
    // sincroniza com Asaas, reenvia link. Parceiros usam /api/parceiro/* quando
    // disponível. Service-role do supabase só é instanciada APÓS o guard.
    const auth = await requireAdminApi()
    if ('error' in auth) return auth.error

    const { action, inscription_id } = await request.json()

    if (!action || !inscription_id) {
      return NextResponse.json({ error: 'action e inscription_id obrigatórios' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: inscription } = await supabase
      .from('inscriptions')
      .select('*')
      .eq('id', inscription_id)
      .single()

    if (!inscription) {
      return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 })
    }

    // ==================== BAIXA MANUAL ====================
    if (action === 'confirm_manual') {
      if (inscription.payment_status === 'confirmed' || inscription.payment_status === 'free') {
        return NextResponse.json({ error: 'Inscrição já está confirmada' }, { status: 400 })
      }

      // Gerar QR code
      const qrIdentifier = inscription.purchase_group || inscription.order_number!
      const qrType = inscription.purchase_group ? 'group' : 'order'
      const qrCodeUrl = await generateAndUploadQRCode(qrIdentifier, qrType as 'group' | 'order')

      // Atualizar inscrição
      await supabase
        .from('inscriptions')
        .update({ payment_status: 'confirmed', qr_code: qrCodeUrl })
        .eq('id', inscription.id)

      // Se tem purchase_group, confirmar todas do grupo
      if (inscription.purchase_group && inscription.payment_id) {
        await supabase
          .from('inscriptions')
          .update({ payment_status: 'confirmed', qr_code: qrCodeUrl })
          .eq('payment_id', inscription.payment_id)
          .eq('payment_status', 'pending')
      }

      // Criar tickets
      const { count: existingTickets } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('inscription_id', inscription.id)

      if ((existingTickets ?? 0) === 0) {
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
      }

      // Enviar email
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email/confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: inscription.order_number }),
      }).catch(() => {})

      return NextResponse.json({
        success: true,
        message: 'Pagamento confirmado manualmente',
      })
    }

    // ==================== SINCRONIZAR COM ASAAS ====================
    if (action === 'sync_asaas') {
      if (!inscription.payment_id) {
        return NextResponse.json({ error: 'Inscrição sem payment_id (pode ser gratuita)' }, { status: 400 })
      }

      const asaasPayment = await getPaymentStatus(inscription.payment_id)

      const confirmedStatuses = ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH']

      if (confirmedStatuses.includes(asaasPayment.status)) {
        // Confirmar se ainda está pendente
        if (inscription.payment_status === 'pending') {
          const qrIdentifier = inscription.purchase_group || inscription.order_number!
          const qrType = inscription.purchase_group ? 'group' : 'order'
          const qrCodeUrl = await generateAndUploadQRCode(qrIdentifier, qrType as 'group' | 'order')

          // Atualizar todas inscrições com mesmo payment_id
          const { data: allInscriptions } = await supabase
            .from('inscriptions')
            .select('*')
            .eq('payment_id', inscription.payment_id)
            .eq('payment_status', 'pending')

          for (const ins of allInscriptions ?? []) {
            await supabase
              .from('inscriptions')
              .update({ payment_status: 'confirmed', qr_code: qrCodeUrl })
              .eq('id', ins.id)

            const { count: existingTickets } = await supabase
              .from('tickets')
              .select('*', { count: 'exact', head: true })
              .eq('inscription_id', ins.id)

            if ((existingTickets ?? 0) === 0) {
              const tickets = []
              for (let i = 0; i < (ins.quantity || 1); i++) {
                tickets.push({
                  inscription_id: ins.id,
                  event_id: ins.event_id,
                  participant_name: ins.nome,
                  status: 'active',
                })
              }
              await supabase.from('tickets').insert(tickets)
            }

            fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email/confirmation`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ order_number: ins.order_number }),
            }).catch(() => {})
          }

          return NextResponse.json({
            success: true,
            message: `Pagamento confirmado via Asaas (${asaasPayment.status})`,
            asaas_status: asaasPayment.status,
          })
        }
      }

      return NextResponse.json({
        success: true,
        message: `Status no Asaas: ${asaasPayment.status}`,
        asaas_status: asaasPayment.status,
        updated: false,
      })
    }

    // ==================== REENVIAR LINK ====================
    if (action === 'resend_link') {
      if (!inscription.payment_url) {
        return NextResponse.json({ error: 'Inscrição sem link de pagamento' }, { status: 400 })
      }

      // Enviar email com link de pagamento
      const { data: event } = await supabase
        .from('events')
        .select('title')
        .eq('id', inscription.event_id)
        .single()

      const eventTitle = event?.title || 'Evento'
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

      const { sendEmail } = await import('@/lib/email')

      await sendEmail({
        to: inscription.email,
        subject: `Link de Pagamento - ${eventTitle} | Semana Empresarial 2026`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5fa;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#5B2D8E,#3D1A6E);padding:30px;border-radius:16px 16px 0 0;text-align:center;">
      <h1 style="color:white;font-size:14px;letter-spacing:2px;margin:0 0 8px;">SEMANA EMPRESARIAL 2026</h1>
      <h2 style="color:white;font-size:20px;margin:0;">Link de Pagamento</h2>
    </div>
    <div style="background:white;padding:30px;border-radius:0 0 16px 16px;border:1px solid #e0e0e0;border-top:none;">
      <p style="font-size:16px;color:#2D2D2D;">Olá, <strong>${inscription.nome}</strong>!</p>
      <p style="color:#666;font-size:14px;">Segue o link para pagamento da sua inscrição no evento <strong>${eventTitle}</strong>.</p>
      <p style="color:#666;font-size:14px;">Valor: <strong>R$ ${inscription.total_amount.toFixed(2)}</strong></p>
      <p style="color:#666;font-size:14px;">Pedido: <strong>${inscription.order_number}</strong></p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${inscription.payment_url}" style="display:inline-block;background:#E8892F;color:white;text-decoration:none;padding:14px 36px;border-radius:50px;font-weight:bold;font-size:14px;">
          Pagar Agora
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="font-size:11px;color:#aaa;text-align:center;">
        Semana Empresarial de Açailândia 2026<br>
        acia.aca@gmail.com | +55 99 98833-4432
      </p>
    </div>
  </div>
</body>
</html>`,
      })

      return NextResponse.json({
        success: true,
        message: `Link de pagamento enviado para ${inscription.email}`,
      })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[ADMIN] Erro:', message, error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
