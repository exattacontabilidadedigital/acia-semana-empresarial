import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/rate-limit'

// Escapa caracteres especiais conforme RFC 5545 (vírgula, ponto-e-vírgula, barra, quebras)
function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

// Converte data/hora local de Açailândia (UTC-3 fixo, sem horário de verão) para UTC formato ICS
function toIcsUtc(date: string, time: string | null): string {
  // date: 'YYYY-MM-DD', time: 'HH:MM:SS' ou 'HH:MM'
  const [y, m, d] = date.split('-').map(Number)
  const [hh = 0, mm = 0] = (time ?? '00:00').split(':').map(Number)
  // Local Açailândia (UTC-3) → UTC: +3h
  const utc = new Date(Date.UTC(y, m - 1, d, hh + 3, mm, 0))
  const yyyy = utc.getUTCFullYear()
  const mo = String(utc.getUTCMonth() + 1).padStart(2, '0')
  const da = String(utc.getUTCDate()).padStart(2, '0')
  const ho = String(utc.getUTCHours()).padStart(2, '0')
  const mi = String(utc.getUTCMinutes()).padStart(2, '0')
  return `${yyyy}${mo}${da}T${ho}${mi}00Z`
}

function nowStamp(): string {
  const d = new Date()
  const yyyy = d.getUTCFullYear()
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
  const da = String(d.getUTCDate()).padStart(2, '0')
  const ho = String(d.getUTCHours()).padStart(2, '0')
  const mi = String(d.getUTCMinutes()).padStart(2, '0')
  const se = String(d.getUTCSeconds()).padStart(2, '0')
  return `${yyyy}${mo}${da}T${ho}${mi}${se}Z`
}

// Quebra linhas longas em 75 octetos com prefixo de espaço, conforme RFC 5545
function foldLine(line: string): string {
  if (line.length <= 75) return line
  const chunks: string[] = []
  let i = 0
  while (i < line.length) {
    chunks.push(line.slice(i, i + 75))
    i += 75
  }
  return chunks.join('\r\n ')
}

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, { key: 'calendar-ics', limit: 10, windowSeconds: 60 })
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
    console.error('[ICS] Erro ao buscar inscrições:', error)
    return NextResponse.json({ error: 'Erro ao buscar inscrições' }, { status: 500 })
  }

  if (!inscriptions || inscriptions.length === 0) {
    return NextResponse.json(
      { error: 'Nenhuma inscrição confirmada para este CPF' },
      { status: 404 },
    )
  }

  // Deduplica por event_id (caso uma pessoa tenha múltiplas inscrições no mesmo evento)
  const uniqueByEvent = new Map<number, (typeof inscriptions)[number]>()
  for (const ins of inscriptions) {
    if (!uniqueByEvent.has(ins.event_id)) uniqueByEvent.set(ins.event_id, ins)
  }

  const stamp = nowStamp()
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Acia Acailandia//Semana Empresarial 2026//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Semana Empresarial 2026',
    'X-WR-TIMEZONE:America/Fortaleza',
  ]

  for (const ins of Array.from(uniqueByEvent.values())) {
    const ev = Array.isArray(ins.events) ? ins.events[0] : ins.events
    if (!ev?.event_date) continue

    const dtStart = toIcsUtc(ev.event_date, ev.start_time ?? '08:00:00')
    const dtEnd = toIcsUtc(ev.event_date, ev.end_time ?? ev.start_time ?? '18:00:00')

    const summary = escapeIcs(ev.title || 'Evento Semana Empresarial')
    const location = ev.location ? escapeIcs(ev.location) : ''
    const description = escapeIcs(
      [
        ev.description || '',
        '',
        `Inscrição: ${ins.order_number}`,
        `Participante: ${ins.nome}`,
      ]
        .filter(Boolean)
        .join('\n'),
    )

    lines.push(
      'BEGIN:VEVENT',
      foldLine(`UID:event-${ev.id}-${cpf}@semanaempresarial.acia.com.br`),
      `DTSTAMP:${stamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      foldLine(`SUMMARY:${summary}`),
      ...(location ? [foldLine(`LOCATION:${location}`)] : []),
      foldLine(`DESCRIPTION:${description}`),
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  const body = lines.join('\r\n')

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="agenda-semana-empresarial-2026.ics"`,
      'Cache-Control': 'no-store',
    },
  })
}
