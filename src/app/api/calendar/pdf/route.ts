import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generatePdfFromHtml } from '@/lib/pdf'
import { enforceRateLimit } from '@/lib/rate-limit'

function formatDateLong(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`))
}

function formatDayMonth(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${date}T12:00:00`))
}

function formatTime(time: string | null | undefined): string {
  if (!time) return ''
  return time.slice(0, 5)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function GET(request: NextRequest) {
  // PDF é mais caro (puppeteer); limite mais agressivo
  const limited = enforceRateLimit(request, { key: 'calendar-pdf', limit: 5, windowSeconds: 60 })
  if (limited) return limited

  const cpf = request.nextUrl.searchParams.get('cpf')?.replace(/\D/g, '')

  if (!cpf || cpf.length !== 11) {
    return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: inscriptions, error } = await supabase
    .from('inscriptions')
    .select(
      `
      id,
      order_number,
      nome,
      event_id,
      payment_status,
      events!inner (
        id,
        title,
        event_date,
        start_time,
        end_time,
        location,
        description
      )
    `,
    )
    .eq('cpf', cpf)
    .in('payment_status', ['confirmed', 'free'])

  if (error) {
    console.error('[CALENDAR PDF] Erro:', error)
    return NextResponse.json({ error: 'Erro ao buscar inscrições' }, { status: 500 })
  }

  if (!inscriptions || inscriptions.length === 0) {
    return NextResponse.json(
      { error: 'Nenhuma inscrição confirmada para este CPF' },
      { status: 404 },
    )
  }

  // Deduplica por event_id e ordena por data + hora
  const uniqueByEvent = new Map<number, (typeof inscriptions)[number]>()
  for (const ins of inscriptions) {
    if (!uniqueByEvent.has(ins.event_id)) uniqueByEvent.set(ins.event_id, ins)
  }
  const items = Array.from(uniqueByEvent.values()).sort((a, b) => {
    const ea = Array.isArray(a.events) ? a.events[0] : a.events
    const eb = Array.isArray(b.events) ? b.events[0] : b.events
    const dCmp = (ea?.event_date ?? '').localeCompare(eb?.event_date ?? '')
    if (dCmp !== 0) return dCmp
    return (ea?.start_time ?? '').localeCompare(eb?.start_time ?? '')
  })

  // Agrupa por data
  const byDate = new Map<string, typeof items>()
  for (const ins of items) {
    const ev = Array.isArray(ins.events) ? ins.events[0] : ins.events
    const date = ev?.event_date ?? ''
    if (!date) continue
    const arr = byDate.get(date) ?? []
    arr.push(ins)
    byDate.set(date, arr)
  }

  const titular = items[0]
  const totalEvents = items.length

  const daysHtml = Array.from(byDate.entries())
    .map(([date, dayItems]) => {
      const fullDate = formatDateLong(date)
      const dayMonth = formatDayMonth(date)
      const eventsHtml = dayItems
        .map((ins) => {
          const ev = Array.isArray(ins.events) ? ins.events[0] : ins.events
          if (!ev) return ''
          const start = formatTime(ev.start_time)
          const end = ev.end_time ? formatTime(ev.end_time) : ''
          const time = end ? `${start} – ${end}` : start
          return `
          <div class="event">
            <div class="event-time">${time}</div>
            <div class="event-content">
              <div class="event-title">${escapeHtml(ev.title)}</div>
              ${ev.location ? `<div class="event-location">📍 ${escapeHtml(ev.location)}</div>` : ''}
              ${ev.description ? `<div class="event-desc">${escapeHtml(ev.description.slice(0, 200))}${ev.description.length > 200 ? '…' : ''}</div>` : ''}
            </div>
          </div>
          `
        })
        .join('')
      return `
      <div class="day">
        <div class="day-header">
          <div class="day-tag">${dayMonth.toUpperCase().replace('.', '')}</div>
          <div class="day-full">${fullDate}</div>
        </div>
        <div class="day-events">${eventsHtml}</div>
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
    border-radius: 14px;
    text-align: center;
    margin-bottom: 18px;
  }
  .header .eyebrow {
    font-size: 11px;
    letter-spacing: 2px;
    font-weight: 600;
    opacity: 0.85;
    margin-bottom: 6px;
  }
  .header h2 { font-size: 24px; font-weight: 800; }
  .header .sub { font-size: 12px; opacity: 0.8; margin-top: 8px; }

  .who {
    background: #f5f5fa;
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .who .l { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; }
  .who .v { color: #2D2D2D; font-weight: 700; font-size: 14px; }
  .who .count {
    background: white;
    border-radius: 50px;
    padding: 6px 14px;
    font-size: 11px;
    font-weight: 700;
    color: #5B2D8E;
  }

  .day {
    background: #fff;
    border: 1px solid #e5e5e5;
    border-radius: 12px;
    padding: 16px 18px;
    margin-bottom: 12px;
    page-break-inside: avoid;
  }
  .day-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 1px dashed #d4d4d8;
  }
  .day-tag {
    background: #5B2D8E;
    color: white;
    font-weight: 800;
    font-size: 11px;
    padding: 6px 10px;
    border-radius: 6px;
    letter-spacing: 0.5px;
  }
  .day-full {
    font-size: 13px;
    font-weight: 700;
    color: #2D2D2D;
    text-transform: capitalize;
  }
  .day-events { display: flex; flex-direction: column; gap: 8px; }

  .event {
    display: flex;
    gap: 12px;
    padding: 10px 12px;
    background: #f5f5fa;
    border-radius: 8px;
  }
  .event-time {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    font-weight: 700;
    color: #5B2D8E;
    min-width: 84px;
    padding-top: 1px;
  }
  .event-content { flex: 1; min-width: 0; }
  .event-title {
    font-size: 13px;
    font-weight: 700;
    color: #2D2D2D;
    margin-bottom: 2px;
  }
  .event-location {
    font-size: 11px;
    color: #555;
    margin-top: 2px;
  }
  .event-desc {
    font-size: 11px;
    color: #777;
    margin-top: 4px;
    line-height: 1.4;
  }

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
    <div class="eyebrow">SEMANA EMPRESARIAL DE AÇAILÂNDIA 2026</div>
    <h2>Minha Agenda</h2>
    <div class="sub">Eventos confirmados</div>
  </div>

  <div class="who">
    <div>
      <div class="l">Participante</div>
      <div class="v">${escapeHtml(titular.nome)}</div>
    </div>
    <div class="count">${totalEvents} ${totalEvents === 1 ? 'evento' : 'eventos'}</div>
  </div>

  ${daysHtml}

  <div class="footer">
    <b>Semana Empresarial de Açailândia 2026</b><br>
    17 a 22 de Agosto · Espaço Cultural José Carlos Brandão<br>
    acia.aca@gmail.com &bull; (99) 98833-4432
  </div>
</body>
</html>`

  const pdfBuffer = await generatePdfFromHtml(html)

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="minha-agenda-semana-empresarial-2026.pdf"',
      'Cache-Control': 'no-store',
    },
  })
}
