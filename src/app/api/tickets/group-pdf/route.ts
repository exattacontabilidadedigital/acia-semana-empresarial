import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generatePdfFromHtml } from '@/lib/pdf'

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

function formatTime(time: string | null | undefined): string {
  if (!time) return ''
  return time.slice(0, 5)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const group = searchParams.get('group')

  if (!group) {
    return NextResponse.json({ error: 'Group required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: inscriptions } = await supabase
    .from('inscriptions')
    .select('*')
    .eq('purchase_group', group)
    .order('created_at', { ascending: true })

  if (!inscriptions || inscriptions.length === 0) {
    return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })
  }

  // Apenas inscrições pagas/gratuitas podem gerar comprovante
  const validInscriptions = inscriptions.filter(
    (i) => i.payment_status === 'confirmed' || i.payment_status === 'free',
  )

  if (validInscriptions.length === 0) {
    return NextResponse.json(
      { error: 'Nenhuma inscrição confirmada neste grupo.' },
      { status: 400 },
    )
  }

  // Eventos + tickets
  const eventIds = Array.from(new Set(validInscriptions.map((i) => i.event_id)))
  const { data: events } = await supabase
    .from('events')
    .select('id, title, event_date, start_time, end_time, location')
    .in('id', eventIds)
  const eventMap = new Map((events ?? []).map((e) => [e.id, e]))

  const inscriptionIds = validInscriptions.map((i) => i.id)
  const { data: allTickets } = await supabase
    .from('tickets')
    .select('id, inscription_id, participant_name')
    .in('inscription_id', inscriptionIds)

  const ticketsByInscription = new Map<number, Array<{ id: string; participant_name: string }>>()
  for (const ticket of allTickets ?? []) {
    const existing = ticketsByInscription.get(ticket.inscription_id) ?? []
    existing.push({ id: ticket.id, participant_name: ticket.participant_name })
    ticketsByInscription.set(ticket.inscription_id, existing)
  }

  // QR code do grupo (primeiro disponível — todos devem ser iguais no grupo)
  const qrCode = validInscriptions.find((i) => !!i.qr_code)?.qr_code || ''

  // Totais
  const totalEvents = validInscriptions.length
  const totalTickets = (allTickets ?? []).length
  const totalPaid = validInscriptions.reduce(
    (sum, i) => sum + Number(i.total_amount || 0),
    0,
  )

  // Participante principal (todos no grupo tendem a ter o mesmo comprador)
  const first = validInscriptions[0]
  const cpfFormatted =
    first.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || ''

  const eventsHtml = validInscriptions
    .map((insc) => {
      const event = eventMap.get(insc.event_id)
      const tickets = ticketsByInscription.get(insc.id) ?? []
      return `
      <div class="event-card">
        <div class="event-title">${event?.title || 'Evento'}</div>
        <div class="event-meta">
          <span><b>Data:</b> ${event?.event_date ? formatDate(event.event_date) : '—'}</span>
          <span><b>Horário:</b> ${formatTime(event?.start_time)}${event?.end_time ? ' — ' + formatTime(event.end_time) : ''}</span>
          ${event?.location ? `<span><b>Local:</b> ${event.location}</span>` : ''}
        </div>
        <div class="event-tickets">
          ${tickets.length} ingresso${tickets.length === 1 ? '' : 's'}
          ${insc.is_half_price ? '· meia-entrada' : ''}
        </div>
        ${tickets.length > 0
          ? `<ul class="ticket-list">${tickets
              .map(
                (t) =>
                  `<li><span class="tn">${t.participant_name}</span> <span class="tid">${t.id.slice(0, 8)}</span></li>`,
              )
              .join('')}</ul>`
          : ''}
        <div class="event-order">Pedido: <b>${insc.order_number}</b></div>
      </div>
    `
    })
    .join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #2D2D2D;
    padding: 24px;
    max-width: 720px;
    margin: 0 auto;
    font-size: 12px;
    line-height: 1.4;
  }
  .header {
    background: linear-gradient(135deg, #5B2D8E, #3D1A6E);
    color: white;
    padding: 28px;
    border-radius: 14px 14px 0 0;
    text-align: center;
  }
  .header h1 {
    font-size: 11px;
    letter-spacing: 2px;
    font-weight: 600;
    opacity: 0.85;
    margin-bottom: 6px;
  }
  .header h2 { font-size: 22px; font-weight: 800; }
  .header .sub { font-size: 11px; opacity: 0.75; margin-top: 6px; }

  .body {
    background: #fff;
    border: 2px solid #e0e0e0;
    border-top: none;
    padding: 26px;
    border-radius: 0 0 14px 14px;
  }

  .badge {
    display: inline-block;
    background: #22c55e;
    color: white;
    padding: 4px 14px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
  }

  h3 {
    font-size: 15px;
    font-weight: 800;
    margin-bottom: 10px;
    color: #2D2D2D;
  }

  .buyer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 20px;
    font-size: 12px;
    color: #555;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px dashed #ccc;
  }
  .buyer .l { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; }
  .buyer .v { color: #2D2D2D; font-weight: 600; }

  .qr-wrap {
    background: #fafafa;
    border: 1px solid #e5e5e5;
    border-radius: 12px;
    padding: 18px;
    text-align: center;
    margin-bottom: 16px;
  }
  .qr-wrap img { width: 180px; height: 180px; display: block; margin: 0 auto 10px; }
  .qr-wrap .qr-label {
    font-size: 11px;
    color: #666;
    font-weight: 600;
  }
  .qr-wrap .qr-hint {
    font-size: 10px;
    color: #999;
    margin-top: 4px;
  }

  .summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 16px;
  }
  .summary-tile {
    background: #f5f5fa;
    border-radius: 8px;
    padding: 10px;
    text-align: center;
  }
  .summary-tile .n { font-size: 18px; font-weight: 800; color: #5B2D8E; }
  .summary-tile .l {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
    margin-top: 2px;
  }

  .instructions {
    background: #fef9e7;
    border: 1px solid #f3e4a3;
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 16px;
    font-size: 11px;
    color: #664c00;
  }
  .instructions h4 {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #8b6a00;
    margin-bottom: 8px;
  }
  .instructions ol { padding-left: 16px; }
  .instructions li { margin-bottom: 4px; }

  .event-card {
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 8px;
    background: #fff;
  }
  .event-title {
    font-size: 14px;
    font-weight: 800;
    color: #5B2D8E;
    margin-bottom: 6px;
  }
  .event-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    font-size: 11px;
    color: #555;
    margin-bottom: 6px;
  }
  .event-meta b { color: #2D2D2D; }
  .event-tickets {
    font-size: 10px;
    color: #E8892F;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-bottom: 6px;
  }
  .ticket-list {
    list-style: none;
    margin: 6px 0;
  }
  .ticket-list li {
    background: #f5f5fa;
    padding: 6px 10px;
    border-radius: 6px;
    margin-bottom: 3px;
    font-size: 11px;
    display: flex;
    justify-content: space-between;
  }
  .ticket-list .tid {
    color: #888;
    font-family: monospace;
    font-size: 10px;
  }
  .event-order { font-size: 10px; color: #888; margin-top: 6px; }
  .event-order b { color: #2D2D2D; }

  .footer {
    text-align: center;
    margin-top: 18px;
    padding-top: 12px;
    border-top: 1px solid #eee;
    font-size: 10px;
    color: #999;
  }
  .footer b { color: #5B2D8E; }
</style>
</head>
<body>
  <div class="header">
    <h1>SEMANA EMPRESARIAL DE AÇAILÂNDIA 2026</h1>
    <h2>Comprovante de Inscrição</h2>
    <div class="sub">Grupo de compra: ${group}</div>
  </div>

  <div class="body">
    <span class="badge">INSCRIÇÃO CONFIRMADA</span>

    <div class="buyer">
      <div><div class="l">Participante</div><div class="v">${first.nome}</div></div>
      <div><div class="l">E-mail</div><div class="v">${first.email}</div></div>
      <div><div class="l">CPF</div><div class="v">${cpfFormatted}</div></div>
      <div><div class="l">Telefone</div><div class="v">${first.telefone || '—'}</div></div>
    </div>

    <div class="summary">
      <div class="summary-tile">
        <div class="n">${totalEvents}</div>
        <div class="l">Eventos</div>
      </div>
      <div class="summary-tile">
        <div class="n">${totalTickets}</div>
        <div class="l">Ingressos</div>
      </div>
      <div class="summary-tile">
        <div class="n">${formatCurrency(totalPaid)}</div>
        <div class="l">Total pago</div>
      </div>
    </div>

    ${qrCode
      ? `<div class="qr-wrap">
          <img src="${qrCode}" alt="QR Code do grupo" />
          <div class="qr-label">Seu QR Code de acesso</div>
          <div class="qr-hint">Válido para todos os eventos deste comprovante</div>
        </div>`
      : ''}

    <div class="instructions">
      <h4>Como usar seu ingresso</h4>
      <ol>
        <li>Apresente este QR Code no check-in de cada evento — impresso ou na tela do celular.</li>
        <li>Chegue com antecedência mínima de 30 minutos. Leve um documento com foto.</li>
        <li>Cada QR Code pode ser validado 1 vez por evento. Guarde este comprovante até o fim do evento.</li>
        <li>Em caso de dúvidas, fale com a organização: (99) 98833-4432 ou acia.aca@gmail.com.</li>
      </ol>
    </div>

    <h3>Eventos inclusos</h3>
    ${eventsHtml}

    <div class="footer">
      <b>Semana Empresarial de Açailândia 2026</b><br>
      17 a 22 de Agosto · Espaço Cultural José Carlos Brandão<br>
      acia.aca@gmail.com &bull; (99) 98833-4432
    </div>
  </div>
</body>
</html>`

  const pdfBuffer = await generatePdfFromHtml(html)

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="comprovante-${group}.pdf"`,
    },
  })
}
