import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { order_number } = await request.json()

    if (!order_number) {
      return NextResponse.json({ error: 'Order number obrigatório' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: inscription } = await supabase
      .from('inscriptions')
      .select('*')
      .eq('order_number', order_number)
      .eq('payment_status', 'pending')
      .single()

    if (!inscription) {
      return NextResponse.json({ error: 'Inscrição pendente não encontrada' }, { status: 404 })
    }

    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('id', inscription.event_id)
      .single()

    const eventTitle = event?.title || 'Evento'
    const eventDate = event?.event_date
      ? new Date(event.event_date).toLocaleDateString('pt-BR')
      : ''
    const eventTime = event?.start_time?.slice(0, 5) || ''
    const eventLocation = event?.location || ''
    const siteUrl = process.env.EMAIL_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const inscricoesUrl = `${siteUrl}/inscricoes`
    const cancelUrl = `${siteUrl}/inscricoes/cancelar?order=${order_number}&cpf=${inscription.cpf}`

    const totalFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(inscription.total_amount)

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5fa;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#5B2D8E,#3D1A6E);padding:30px;border-radius:16px 16px 0 0;text-align:center;">
      <h1 style="color:white;font-size:14px;letter-spacing:2px;margin:0 0 8px;">SEMANA EMPRESARIAL DE AÇAILÂNDIA 2026</h1>
      <h2 style="color:#E8892F;font-size:20px;margin:0;">Pagamento Pendente</h2>
    </div>
    <div style="background:white;padding:30px;border-radius:0 0 16px 16px;border:1px solid #e0e0e0;border-top:none;">
      <p style="font-size:16px;color:#2D2D2D;">Olá, <strong>${inscription.nome}</strong>!</p>
      <p style="color:#666;font-size:14px;line-height:1.6;">
        Notamos que sua inscrição ainda está com o pagamento pendente. Não perca sua vaga!
      </p>

      <div style="background:#FFF8E1;border:1px solid #FFE082;border-radius:12px;padding:20px;margin:20px 0;">
        <h3 style="color:#F57F17;font-size:14px;margin:0 0 12px;">⏳ Inscrição aguardando pagamento</h3>
        <p style="margin:4px 0;font-size:13px;color:#555;"><strong>Evento:</strong> ${eventTitle}</p>
        <p style="margin:4px 0;font-size:13px;color:#555;">📅 Data: ${eventDate}</p>
        ${eventTime ? `<p style="margin:4px 0;font-size:13px;color:#555;">🕐 Horário: ${eventTime}</p>` : ''}
        ${eventLocation ? `<p style="margin:4px 0;font-size:13px;color:#555;">📍 Local: ${eventLocation}</p>` : ''}
        <p style="margin:8px 0 0;font-size:13px;color:#555;">💰 Valor: <strong>${totalFormatted}</strong></p>
        <p style="margin:4px 0;font-size:13px;color:#555;">🎫 Pedido: <strong>${order_number}</strong></p>
      </div>

      ${inscription.payment_url ? `
      <div style="text-align:center;margin:24px 0;">
        <a href="${inscription.payment_url}" style="display:inline-block;background:#E8892F;color:white;text-decoration:none;padding:14px 36px;border-radius:50px;font-weight:bold;font-size:14px;">
          Pagar agora
        </a>
      </div>
      ` : ''}

      <div style="text-align:center;margin:16px 0;">
        <a href="${inscricoesUrl}" style="display:inline-block;background:#5B2D8E;color:white;text-decoration:none;padding:12px 30px;border-radius:50px;font-weight:bold;font-size:13px;">
          Ver minhas inscrições
        </a>
      </div>

      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />

      <div style="background:#f5f5fa;border-radius:12px;padding:16px;margin:16px 0;text-align:center;">
        <p style="font-size:13px;color:#666;margin:0 0 12px;">
          Já realizou o pagamento ou não precisa mais desta inscrição?
        </p>
        <a href="${cancelUrl}" style="display:inline-block;color:#999;text-decoration:underline;font-size:12px;">
          Cancelar esta inscrição
        </a>
      </div>

      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="font-size:11px;color:#aaa;text-align:center;">
        Semana Empresarial de Açailândia 2026<br>
        acia.aca@gmail.com | +55 99 98833-4432<br>
        Açailândia - MA
      </p>
    </div>
  </div>
</body>
</html>`

    const result = await sendEmail({
      to: inscription.email,
      subject: `⏳ Pagamento pendente - ${eventTitle} | Semana Empresarial 2026`,
      html: emailHtml,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Erro ao enviar lembrete:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
