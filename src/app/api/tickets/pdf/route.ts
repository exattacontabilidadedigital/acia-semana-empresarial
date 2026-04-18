import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generatePdfFromHtml } from '@/lib/pdf'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const orderNumber = searchParams.get('order')

  if (!orderNumber) {
    return NextResponse.json({ error: 'Order number required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: inscription } = await supabase
    .from('inscriptions')
    .select('*')
    .eq('order_number', orderNumber)
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
    .select('*')
    .eq('inscription_id', inscription.id)

  const eventTitle = event?.title || 'Evento'
  const eventDate = event?.event_date ? new Date(event.event_date).toLocaleDateString('pt-BR') : ''
  const eventTime = event?.start_time?.slice(0, 5) || ''
  const eventEndTime = event?.end_time?.slice(0, 5) || ''
  const eventLocation = event?.location || ''
  const qrCode = inscription.qr_code || ''

  // Generate HTML-based PDF using a printable HTML page
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Montserrat', sans-serif; color: #2D2D2D; padding: 40px; max-width: 600px; margin: 0 auto; }
  .header { background: linear-gradient(135deg, #5B2D8E, #3D1A6E); color: white; padding: 30px; border-radius: 16px 16px 0 0; text-align: center; }
  .header h1 { font-size: 14px; letter-spacing: 2px; font-weight: 600; opacity: 0.9; margin-bottom: 8px; }
  .header h2 { font-size: 22px; font-weight: 800; }
  .body { background: #fff; border: 2px solid #e0e0e0; border-top: none; padding: 30px; border-radius: 0 0 16px 16px; }
  .badge { display: inline-block; background: #E8892F; color: white; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-bottom: 16px; }
  .info-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 13px; color: #555; }
  .info-row strong { color: #2D2D2D; }
  .divider { border: none; border-top: 1px dashed #ccc; margin: 20px 0; }
  .participant { font-size: 14px; margin-bottom: 4px; }
  .participant strong { color: #5B2D8E; }
  .qr-section { text-align: center; margin: 20px 0; }
  .qr-section img { width: 180px; height: 180px; border-radius: 8px; }
  .qr-section p { font-size: 11px; color: #888; margin-top: 8px; }
  .order { text-align: center; font-size: 12px; color: #888; margin-top: 16px; }
  .order strong { color: #5B2D8E; font-size: 14px; }
  .tickets { margin-top: 16px; }
  .ticket-item { background: #f5f5fa; padding: 10px 14px; border-radius: 8px; margin-bottom: 6px; font-size: 12px; display: flex; justify-content: space-between; }
  .ticket-item .id { color: #888; font-family: monospace; font-size: 10px; }
  .footer { text-align: center; margin-top: 24px; font-size: 10px; color: #aaa; }
</style>
</head>
<body>
  <div class="header">
    <h1>SEMANA EMPRESARIAL DE AÇAILÂNDIA 2026</h1>
    <h2>${eventTitle}</h2>
  </div>
  <div class="body">
    <span class="badge">INGRESSO CONFIRMADO</span>

    <div class="info-row"><strong>Data:</strong> ${eventDate}</div>
    <div class="info-row"><strong>Horário:</strong> ${eventTime}${eventEndTime ? ' - ' + eventEndTime : ''}</div>
    ${eventLocation ? `<div class="info-row"><strong>Local:</strong> ${eventLocation}</div>` : ''}

    <hr class="divider">

    <div class="participant">
      <strong>Participante:</strong> ${inscription.nome}
    </div>
    <div class="participant" style="font-size:12px; color:#666;">
      ${inscription.email} | CPF: ${inscription.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || ''}
    </div>

    ${qrCode ? `
    <div class="qr-section">
      <img src="${qrCode}" alt="QR Code" />
      <p>Apresente este QR Code na entrada do evento</p>
    </div>
    ` : ''}

    <div class="order">
      Pedido: <strong>${inscription.order_number}</strong>
    </div>

    ${tickets && tickets.length > 0 ? `
    <div class="tickets">
      <p style="font-size:12px; font-weight:700; margin-bottom:8px;">Ingressos (${tickets.length})</p>
      ${tickets.map((t: any) => `
        <div class="ticket-item">
          <span>${t.participant_name}</span>
          <span class="id">${t.id.slice(0, 8)}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="footer">
      Semana Empresarial de Açailândia 2026 &bull; acia.aca@gmail.com &bull; +55 99 98833-4432
    </div>
  </div>
</body>
</html>`

  const pdfBuffer = await generatePdfFromHtml(html)

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="ingresso-${orderNumber}.pdf"`,
    },
  })
}
