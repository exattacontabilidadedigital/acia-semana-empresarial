import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { generateTicketHtml } from '@/lib/ticket-html'
import { generatePdfFromHtml } from '@/lib/pdf'

export async function POST(request: Request) {
  try {
    const { order_number } = await request.json()

    if (!order_number) {
      return NextResponse.json({ error: 'Order number required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: inscription } = await supabase
      .from('inscriptions')
      .select('*')
      .eq('order_number', order_number)
      .single()

    if (!inscription) {
      return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 })
    }

    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('id', inscription.event_id)
      .single()

    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, participant_name')
      .eq('inscription_id', inscription.id)

    const eventTitle = event?.title || 'Evento'
    const eventDate = event?.event_date
      ? new Date(event.event_date).toLocaleDateString('pt-BR')
      : ''
    const eventTime = event?.start_time?.slice(0, 5) || ''
    const eventEndTime = event?.end_time?.slice(0, 5) || ''
    const eventLocation = event?.location || ''
    const siteUrl = process.env.EMAIL_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const confirmationUrl = `${siteUrl}/confirmacao/${order_number}`
    const pdfUrl = `${siteUrl}/api/tickets/pdf?order=${order_number}`

    // Generate ticket HTML for attachment
    const ticketHtml = generateTicketHtml({
      eventTitle,
      eventDate,
      eventTime,
      eventEndTime,
      eventLocation,
      participantName: inscription.nome,
      participantEmail: inscription.email,
      participantCpf: inscription.cpf || '',
      orderNumber: order_number,
      qrCode: inscription.qr_code || '',
      tickets: tickets || [],
    })

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5fa;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#5B2D8E,#3D1A6E);padding:30px;border-radius:16px 16px 0 0;text-align:center;">
      <h1 style="color:white;font-size:14px;letter-spacing:2px;margin:0 0 8px;">SEMANA EMPRESARIAL DE AÇAILÂNDIA 2026</h1>
      <h2 style="color:white;font-size:20px;margin:0;">Inscrição Confirmada!</h2>
    </div>
    <div style="background:white;padding:30px;border-radius:0 0 16px 16px;border:1px solid #e0e0e0;border-top:none;">
      <p style="font-size:16px;color:#2D2D2D;">Olá, <strong>${inscription.nome}</strong>!</p>
      <p style="color:#666;font-size:14px;line-height:1.6;">
        Sua inscrição foi confirmada com sucesso. Confira os detalhes abaixo:
      </p>

      <div style="background:#f5f5fa;border-radius:12px;padding:20px;margin:20px 0;">
        <h3 style="color:#5B2D8E;font-size:16px;margin:0 0 12px;">${eventTitle}</h3>
        <p style="margin:4px 0;font-size:13px;color:#555;">📅 Data: ${eventDate}</p>
        <p style="margin:4px 0;font-size:13px;color:#555;">🕐 Horário: ${eventTime}${eventEndTime ? ' - ' + eventEndTime : ''}</p>
        ${eventLocation ? `<p style="margin:4px 0;font-size:13px;color:#555;">📍 Local: ${eventLocation}</p>` : ''}
        <p style="margin:8px 0 0;font-size:13px;color:#555;">🎫 Pedido: <strong>${order_number}</strong></p>
        <p style="margin:4px 0;font-size:13px;color:#555;">👤 Participante: ${inscription.nome}</p>
        <p style="margin:4px 0;font-size:13px;color:#555;">📧 Email: ${inscription.email}</p>
      </div>

      ${inscription.qr_code ? `
      <div style="text-align:center;margin:24px 0;">
        <p style="font-size:13px;color:#888;margin-bottom:12px;">Apresente este QR Code na entrada do evento:</p>
        <img src="${inscription.qr_code}" alt="QR Code" style="width:200px;height:200px;border-radius:8px;" />
      </div>
      ` : ''}

      <div style="text-align:center;margin:24px 0;">
        <a href="${confirmationUrl}" style="display:inline-block;background:#E8892F;color:white;text-decoration:none;padding:14px 36px;border-radius:50px;font-weight:bold;font-size:14px;">
          Ver Confirmação Online
        </a>
      </div>

      <div style="text-align:center;margin:16px 0;">
        <a href="${pdfUrl}" style="display:inline-block;background:#5B2D8E;color:white;text-decoration:none;padding:12px 30px;border-radius:50px;font-weight:bold;font-size:13px;">
          📄 Baixar Ingresso
        </a>
      </div>

      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />

      <p style="font-size:12px;color:#888;line-height:1.6;">
        <strong>Importante:</strong> Guarde este email ou salve seu ingresso.
        Você precisará apresentar o QR Code na entrada do evento para confirmar sua presença.
      </p>

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

    // Gera PDF do ingresso
    const pdfBuffer = await generatePdfFromHtml(ticketHtml)

    const result = await sendEmail({
      to: inscription.email,
      subject: `✅ Inscrição Confirmada - ${eventTitle} | Semana Empresarial 2026`,
      html: emailHtml,
      attachments: [
        {
          filename: `ingresso-${order_number}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Erro ao enviar email:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
