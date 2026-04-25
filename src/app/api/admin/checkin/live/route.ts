import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { reportError } from '@/lib/observability'

export const dynamic = 'force-dynamic'

/**
 * Estatísticas de check-in ao vivo agrupadas por evento.
 * Retorna eventos do dia e dos próximos 2 dias com contagem total/checked-in.
 */
export async function GET() {
  try {
    const supabase = createAdminClient()

    // Janela: hoje até 2 dias depois (cobre o evento todo)
    const today = new Date()
    const start = today.toISOString().split('T')[0]
    const end = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const { data: events } = await supabase
      .from('events')
      .select('id, title, event_date, start_time, end_time, location, capacity')
      .eq('status', 'active')
      .gte('event_date', start)
      .lte('event_date', end)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (!events || events.length === 0) {
      return NextResponse.json({ events: [], generated_at: new Date().toISOString() })
    }

    const eventIds = events.map((e) => e.id)

    // Conta tickets ativos + usados por evento (em uma só round trip)
    const { data: tickets } = await supabase
      .from('tickets')
      .select('event_id, status')
      .in('event_id', eventIds)

    const counts = new Map<number, { active: number; used: number }>()
    for (const t of tickets ?? []) {
      const c = counts.get(t.event_id) ?? { active: 0, used: 0 }
      if (t.status === 'used') c.used++
      else if (t.status === 'active') c.active++
      counts.set(t.event_id, c)
    }

    const result = events.map((ev) => {
      const c = counts.get(ev.id) ?? { active: 0, used: 0 }
      const total = c.active + c.used
      const percentage = total > 0 ? Math.round((c.used / total) * 100) : 0
      return {
        id: ev.id,
        title: ev.title,
        event_date: ev.event_date,
        start_time: ev.start_time,
        end_time: ev.end_time,
        location: ev.location,
        capacity: ev.capacity,
        total_tickets: total,
        checked_in: c.used,
        active: c.active,
        percentage,
      }
    })

    return NextResponse.json({
      events: result,
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    reportError(error, { scope: 'admin.checkin.live' })
    return NextResponse.json({ error: 'Erro ao carregar dados' }, { status: 500 })
  }
}
