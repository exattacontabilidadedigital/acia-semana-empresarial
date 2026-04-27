import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { CheckCircle2, Search, AlertCircle, User, Clock } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePermission } from '@/lib/permissions'
import { formatCPF } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function checkinAction(formData: FormData) {
  'use server'
  const org = await requirePermission('do_checkin')
  const ticketId = String(formData.get('ticket_id'))
  const eventId = Number(formData.get('event_id'))

  const admin = createAdminClient()

  // Confere que o ticket pertence a um evento da org
  const { data: ticket } = await admin
    .from('tickets')
    .select('id, event_id, status, events:event_id ( organization_id )')
    .eq('id', ticketId)
    .maybeSingle()

  if (!ticket || (ticket as any).events?.organization_id !== org.id) {
    redirect(
      `/parceiro/checkin?evento=${eventId}&error=${encodeURIComponent(
        'Ticket não pertence à sua organização.'
      )}`
    )
  }

  if (ticket.status === 'used') {
    redirect(
      `/parceiro/checkin?evento=${eventId}&warn=${encodeURIComponent(
        'Esse ticket já foi utilizado.'
      )}`
    )
  }

  await admin
    .from('tickets')
    .update({ status: 'used', checked_in_at: new Date().toISOString() })
    .eq('id', ticketId)

  revalidatePath('/parceiro/checkin')
  redirect(`/parceiro/checkin?evento=${eventId}&done=1`)
}

export default async function ParceiroCheckinPage({
  searchParams,
}: {
  searchParams: {
    evento?: string
    busca?: string
    error?: string
    warn?: string
    done?: string
  }
}) {
  const org = await requirePermission('do_checkin')
  const supabase = createServerSupabaseClient()

  const eventoFilter = searchParams.evento ?? ''
  const busca = (searchParams.busca ?? '').trim()

  // Eventos publicados da org
  const { data: events } = await supabase
    .from('events')
    .select('id, title, event_date, capacity')
    .eq('organization_id', org.id)
    .eq('status', 'active')
    .order('event_date', { ascending: true })

  const selectedEventId = eventoFilter ? Number(eventoFilter) : null
  const selectedEvent = (events ?? []).find((e: any) => e.id === selectedEventId)

  // Stats do evento selecionado
  let totalTickets = 0
  let totalCheckins = 0
  let results: any[] = []
  let recent: any[] = []

  if (selectedEventId) {
    const [{ count: ttC }, { count: tcC }] = await Promise.all([
      supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', selectedEventId),
      supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', selectedEventId)
        .not('checked_in_at', 'is', null),
    ])
    totalTickets = ttC ?? 0
    totalCheckins = tcC ?? 0

    // Resultados de busca por CPF/nome
    if (busca) {
      const term = busca.replace(/\D/g, '')
      const isCPF = term.length >= 11
      const { data: matches } = await supabase
        .from('inscriptions')
        .select(
          'id, nome, cpf, email, payment_status, tickets ( id, status, checked_in_at, participant_name )'
        )
        .eq('event_id', selectedEventId)
        .in('payment_status', ['confirmed', 'free'])
        .or(
          isCPF
            ? `cpf.eq.${term}`
            : `nome.ilike.%${busca}%,cpf.ilike.%${busca}%,email.ilike.%${busca}%`
        )
        .limit(10)
      results = matches ?? []
    }

    // Check-ins recentes
    const { data: rec } = await supabase
      .from('tickets')
      .select(
        'id, checked_in_at, participant_name, inscriptions:inscription_id ( nome, cpf )'
      )
      .eq('event_id', selectedEventId)
      .not('checked_in_at', 'is', null)
      .order('checked_in_at', { ascending: false })
      .limit(8)
    recent = rec ?? []
  }

  const checkinRate =
    totalTickets > 0 ? Math.round((totalCheckins / totalTickets) * 100) : 0

  return (
    <div className="page-enter">
      <div className="mb-10">
        <div className="eyebrow mb-4">
          <span className="dot" />
          PORTAL · CHECK-IN
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
          Check-in
        </h1>
        <p
          className="mt-3"
          style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
        >
          Selecione um evento publicado e busque o participante por CPF, nome ou
          email para confirmar a presença.
        </p>
      </div>

      {/* Banners */}
      {searchParams.done && (
        <Banner color="success">Check-in confirmado.</Banner>
      )}
      {searchParams.warn && <Banner color="warning">{searchParams.warn}</Banner>}
      {searchParams.error && <Banner color="error">{searchParams.error}</Banner>}

      {/* Seletor de evento + busca */}
      <form
        method="GET"
        className="rounded-[20px] bg-white p-5 mb-5"
        style={{ border: '1px solid var(--line)' }}
      >
        <div className="grid sm:grid-cols-[1fr_240px_auto] gap-4 items-end">
          <label className="block">
            <span
              className="mono block text-[10px] tracking-[0.1em] mb-2"
              style={{ color: 'var(--ink-50)' }}
            >
              EVENTO
            </span>
            <select
              name="evento"
              defaultValue={eventoFilter}
              className="admin-select w-full px-4 py-3 rounded-xl text-sm"
            >
              <option value="">Selecione um evento publicado...</option>
              {events?.map((e: any) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span
              className="mono block text-[10px] tracking-[0.1em] mb-2"
              style={{ color: 'var(--ink-50)' }}
            >
              BUSCAR (CPF / NOME)
            </span>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--ink-50)' }}
              />
              <input
                name="busca"
                type="text"
                defaultValue={busca}
                placeholder="000.000.000-00 ou nome"
                className="admin-input w-full pl-9 pr-4 py-3 rounded-xl text-sm"
              />
            </div>
          </label>
          <button type="submit" className="btn btn-orange btn-lg">
            Buscar
          </button>
        </div>
      </form>

      {/* Stats do evento */}
      {selectedEvent && (
        <div
          className="rounded-[20px] bg-white p-7 mb-5"
          style={{ border: '1px solid var(--line)' }}
        >
          <div
            className="mono text-[10px] tracking-[0.14em]"
            style={{ color: 'var(--ink-50)' }}
          >
            EVENTO ATIVO
          </div>
          <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
            {selectedEvent.title}
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 mt-5">
            <Stat label="INGRESSOS" value={totalTickets} accent="var(--azul)" />
            <Stat
              label="PRESENTES"
              value={totalCheckins}
              accent="var(--verde-600)"
            />
            <Stat
              label="TAXA"
              value={`${checkinRate}%`}
              accent="var(--laranja)"
              progress={checkinRate}
            />
          </div>
        </div>
      )}

      {/* Resultados da busca */}
      {selectedEventId && busca && (
        <div
          className="rounded-[20px] bg-white p-7 mb-5"
          style={{ border: '1px solid var(--line)' }}
        >
          <div
            className="mono text-[10px] tracking-[0.14em]"
            style={{ color: 'var(--ink-50)' }}
          >
            {results.length} RESULTADO(S) PARA "{busca}"
          </div>
          <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
            Confirmar presença
          </h2>

          {results.length === 0 && (
            <div
              className="text-center py-10 mono text-[11px] tracking-[0.14em] mt-5"
              style={{ color: 'var(--ink-50)' }}
            >
              <AlertCircle
                size={20}
                className="mx-auto mb-2"
                style={{ color: 'var(--ink-50)' }}
              />
              NENHUMA INSCRIÇÃO ENCONTRADA NESTE EVENTO
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-5 space-y-2">
              {results.flatMap((insc: any) =>
                (insc.tickets ?? []).map((t: any) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 p-4 rounded-xl"
                    style={{ border: '1px solid var(--line)' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="rounded-lg p-2 shrink-0"
                        style={{ background: 'var(--azul-50)' }}
                      >
                        <User size={16} style={{ color: 'var(--azul)' }} />
                      </div>
                      <div className="min-w-0">
                        <div
                          className="text-sm font-semibold truncate"
                          style={{ color: 'var(--ink)' }}
                        >
                          {t.participant_name ?? insc.nome}
                        </div>
                        <div
                          className="mono text-[10px] tracking-[0.06em]"
                          style={{ color: 'var(--ink-50)' }}
                        >
                          {formatCPF(insc.cpf)}
                          {' · '}
                          TICKET {String(t.id).slice(0, 8).toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {t.status === 'used' ? (
                        <span
                          className="mono inline-flex items-center gap-1 px-3 py-2 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap"
                          style={{
                            background: 'rgba(166,206,58,0.18)',
                            color: '#3d5a0a',
                          }}
                        >
                          <CheckCircle2 size={12} /> JÁ FEITO
                        </span>
                      ) : (
                        <form action={checkinAction}>
                          <input type="hidden" name="ticket_id" value={t.id} />
                          <input type="hidden" name="event_id" value={selectedEventId} />
                          <button type="submit" className="btn btn-orange">
                            Confirmar check-in
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Recentes */}
      {selectedEventId && recent.length > 0 && (
        <div
          className="rounded-[20px] bg-white p-7"
          style={{ border: '1px solid var(--line)' }}
        >
          <div
            className="mono text-[10px] tracking-[0.14em]"
            style={{ color: 'var(--ink-50)' }}
          >
            ÚLTIMOS {recent.length}
          </div>
          <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
            Check-ins recentes
          </h2>
          <div className="mt-5 space-y-2">
            {recent.map((t: any) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl"
                style={{ border: '1px solid var(--line)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle2
                    size={14}
                    style={{ color: 'var(--verde-600)' }}
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <div
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--ink)' }}
                    >
                      {t.participant_name ?? t.inscriptions?.nome ?? '—'}
                    </div>
                    <div
                      className="mono text-[10px] tracking-[0.06em]"
                      style={{ color: 'var(--ink-50)' }}
                    >
                      {t.inscriptions ? formatCPF(t.inscriptions.cpf) : ''}
                    </div>
                  </div>
                </div>
                <div
                  className="mono text-[10px] tracking-[0.08em] flex items-center gap-1 whitespace-nowrap shrink-0"
                  style={{ color: 'var(--ink-50)' }}
                >
                  <Clock size={10} />
                  {new Date(t.checked_in_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!selectedEventId && (
        <div
          className="rounded-[20px] p-10 text-center"
          style={{
            background: 'var(--azul-50)',
            border: '1px solid var(--line)',
          }}
        >
          <div
            className="mono text-[11px] tracking-[0.14em]"
            style={{ color: 'var(--azul)' }}
          >
            SELECIONE UM EVENTO ACIMA PARA INICIAR O CHECK-IN
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
  progress,
}: {
  label: string
  value: number | string
  accent: string
  progress?: number
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ border: '1px solid var(--line)', background: 'var(--paper)' }}
    >
      <div
        className="mono text-[10px] tracking-[0.14em]"
        style={{ color: 'var(--ink-50)' }}
      >
        {label}
      </div>
      <div
        className="display mt-1"
        style={{ fontSize: 28, color: accent, letterSpacing: '-0.02em' }}
      >
        {value}
      </div>
      {progress !== undefined && (
        <div
          className="h-1.5 rounded-full overflow-hidden mt-2"
          style={{ background: 'var(--paper-2)' }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${progress}%`, background: accent }}
          />
        </div>
      )}
    </div>
  )
}

function Banner({
  color,
  children,
}: {
  color: 'success' | 'error' | 'warning'
  children: React.ReactNode
}) {
  const map = {
    success: {
      bg: 'rgba(166,206,58,0.10)',
      border: '1px solid rgba(166,206,58,0.4)',
      color: '#3d5a0a',
    },
    error: { bg: '#fff1f2', border: '1px solid #fecdd3', color: '#b91c1c' },
    warning: {
      bg: 'rgba(248,130,30,0.08)',
      border: '1px solid rgba(248,130,30,0.3)',
      color: '#b85d00',
    },
  }
  const s = map[color]
  return (
    <div
      className="mb-5 p-3 rounded-xl text-sm"
      style={{ background: s.bg, border: s.border, color: s.color }}
    >
      {children}
    </div>
  )
}
