interface TicketData {
  eventTitle: string
  eventDate: string
  eventTime: string
  eventEndTime: string
  eventLocation: string
  participantName: string
  participantEmail: string
  participantCpf: string
  orderNumber: string
  qrCode: string
  tickets: { id: string; participant_name: string }[]
}

export function generateTicketHtml(data: TicketData): string {
  const cpfFormatted = data.participantCpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #2D2D2D; padding: 40px; max-width: 600px; margin: 0 auto; }
  .header { background: linear-gradient(135deg, #5B2D8E, #3D1A6E); color: white; padding: 30px; border-radius: 16px 16px 0 0; text-align: center; }
  .header h1 { font-size: 12px; letter-spacing: 2px; font-weight: 600; opacity: 0.9; margin-bottom: 8px; }
  .header h2 { font-size: 20px; font-weight: 800; }
  .body { background: #fff; border: 2px solid #e0e0e0; border-top: none; padding: 30px; border-radius: 0 0 16px 16px; }
  .badge { display: inline-block; background: #E8892F; color: white; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-bottom: 16px; }
  .info-row { margin-bottom: 8px; font-size: 13px; color: #555; }
  .info-row strong { color: #2D2D2D; }
  .divider { border: none; border-top: 1px dashed #ccc; margin: 20px 0; }
  .qr-section { text-align: center; margin: 20px 0; }
  .qr-section img { width: 200px; height: 200px; border-radius: 8px; }
  .qr-section p { font-size: 11px; color: #888; margin-top: 8px; }
  .order { text-align: center; font-size: 12px; color: #888; margin-top: 16px; }
  .order strong { color: #5B2D8E; font-size: 14px; }
  .ticket-item { background: #f5f5fa; padding: 8px 14px; border-radius: 8px; margin-bottom: 4px; font-size: 12px; }
  .footer { text-align: center; margin-top: 24px; font-size: 10px; color: #aaa; }
</style>
</head>
<body>
  <div class="header">
    <h1>SEMANA EMPRESARIAL DE AÇAILÂNDIA 2026</h1>
    <h2>${data.eventTitle}</h2>
  </div>
  <div class="body">
    <span class="badge">INGRESSO CONFIRMADO</span>

    <div class="info-row"><strong>Data:</strong> ${data.eventDate}</div>
    <div class="info-row"><strong>Horário:</strong> ${data.eventTime}${data.eventEndTime ? ' - ' + data.eventEndTime : ''}</div>
    ${data.eventLocation ? `<div class="info-row"><strong>Local:</strong> ${data.eventLocation}</div>` : ''}

    <hr class="divider">

    <div class="info-row"><strong>Participante:</strong> ${data.participantName}</div>
    <div class="info-row" style="font-size:12px;color:#666;">${data.participantEmail} | CPF: ${cpfFormatted}</div>

    ${data.qrCode ? `
    <div class="qr-section">
      <img src="${data.qrCode}" alt="QR Code" />
      <p>Apresente este QR Code na entrada do evento</p>
    </div>
    ` : ''}

    <div class="order">Pedido: <strong>${data.orderNumber}</strong></div>

    ${data.tickets.length > 0 ? `
    <div style="margin-top:16px;">
      <p style="font-size:12px;font-weight:700;margin-bottom:8px;">Ingressos (${data.tickets.length})</p>
      ${data.tickets.map(t => `<div class="ticket-item">${t.participant_name} — <span style="color:#888;font-family:monospace;font-size:10px;">${t.id.slice(0, 8)}</span></div>`).join('')}
    </div>
    ` : ''}

    <div class="footer">
      Semana Empresarial de Açailândia 2026 &bull; acia.aca@gmail.com &bull; +55 99 98833-4432
    </div>
  </div>
</body>
</html>`
}
