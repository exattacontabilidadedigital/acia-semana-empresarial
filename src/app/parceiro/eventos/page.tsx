import Link from 'next/link'
import { Plus, Calendar, ArrowUpRight, FileText, Clock, CheckCircle, XCircle } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireActiveOrg } from '@/lib/orgs'
import { formatDateShort } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const STATUS_PILL: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'RASCUNHO' },
  pending_approval: { bg: 'rgba(248,130,30,0.15)', color: '#b85d00', label: 'PENDENTE' },
  active: { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a', label: 'PUBLICADO' },
  rejected: { bg: '#fee2e2', color: '#991b1b', label: 'REJEITADO' },
  archived: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'ARQUIVADO' },
  inactive: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'INATIVO' },
}

const FILTER_TABS = [
  { value: '', label: 'TODOS' },
  { value: 'draft', label: 'RASCUNHOS' },
  { value: 'pending_approval', label: 'PENDENTES' },
  { value: 'active', label: 'PUBLICADOS' },
  { value: 'rejected', label: 'REJEITADOS' },
]

export default async function ParceiroEventosPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const org = await requireActiveOrg()
  const supabase = createServerSupabaseClient()

  let query = supabase
    .from('events')
    .select('id, title, status, event_date, start_time, capacity')
    .eq('organization_id', org.id)
    .order('event_date', { ascending: false })

  if (searchParams.status) {
    query = query.eq('status', searchParams.status)
  }

  const { data: events } = await query

  const { data: allForCounts } = await supabase
    .from('events')
    .select('id, status')
    .eq('organization_id', org.id)

  const counts = {
    total: allForCounts?.length ?? 0,
    draft: 0,
    pending_approval: 0,
    active: 0,
    rejected: 0,
  }
  for (const e of allForCounts ?? []) {
    if ((e as any).status in counts) (counts as any)[(e as any).status] += 1
  }

  const eventIds = (events ?? []).map((e: any) => e.id)
  const inscByEvent: Record<number, number> = {}
  if (eventIds.length > 0) {
    const { data: insc } = await supabase
      .from('inscriptions')
      .select('event_id')
      .in('event_id', eventIds)
      .in('payment_status', ['confirmed', 'free'])
    for (const i of insc ?? []) {
      const k = (i as any).event_id as number
      inscByEvent[k] = (inscByEvent[k] ?? 0) + 1
    }
  }

  return (
    <div className="page-enter">
      <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="eyebrow mb-4">
            <span className="dot" />
            PORTAL · EVENTOS
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
            Meus eventos
          </h1>
          <p
            className="mt-3"
            style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
          >
            Crie, edite e submeta eventos para aprovação. Eventos publicados
            ficam visíveis em /inscricoes.
          </p>
        </div>
        <Link href="/parceiro/eventos/novo" className="btn btn-orange btn-lg shrink-0">
          <Plus size={16} /> Novo evento
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="TOTAL" value={counts.total} icon={<Calendar size={14} />} accent="var(--azul)" />
        <MiniStat label="RASCUNHOS" value={counts.draft} icon={<FileText size={14} />} accent="var(--ink-50)" />
        <MiniStat label="PENDENTES" value={counts.pending_approval} icon={<Clock size={14} />} accent="var(--laranja)" />
        <MiniStat label="PUBLICADOS" value={counts.active} icon={<CheckCircle size={14} />} accent="var(--verde-600)" />
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {FILTER_TABS.map((tab) => {
          const active =
            (tab.value === '' && !searchParams.status) ||
            tab.value === searchParams.status
          return (
            <Link
              key={tab.value}
              href={tab.value ? `/parceiro/eventos?status=${tab.value}` : '/parceiro/eventos'}
              className="mono text-[10px] tracking-[0.1em] px-3 py-1.5 rounded-full transition-colors"
              style={{
                background: active ? 'var(--azul)' : 'white',
                color: active ? 'white' : 'var(--ink-70)',
                border: '1px solid ' + (active ? 'var(--azul)' : 'var(--line)'),
              }}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      <div
        className="rounded-[20px] bg-white p-7"
        style={{ border: '1px solid var(--line)' }}
      >
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="min-w-0">
            <div
              className="mono text-[10px] tracking-[0.14em]"
              style={{ color: 'var(--ink-50)' }}
            >
              {events?.length ?? 0} REGISTROS
            </div>
            <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
              Lista
            </h2>
          </div>
        </div>

        {(!events || events.length === 0) && (
          <div
            className="text-center py-16 mono text-[11px] tracking-[0.14em]"
            style={{ color: 'var(--ink-50)' }}
          >
            <XCircle size={20} className="mx-auto mb-3" style={{ color: 'var(--ink-50)' }} />
            NENHUM EVENTO {searchParams.status ? 'COM ESSE FILTRO' : 'CADASTRADO'}
          </div>
        )}

        {events && events.length > 0 && (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['Título', 'Data', 'Capacidade', 'Inscritos', 'Status', ''].map((h) => (
                    <th
                      key={h}
                      className="mono text-[10px] tracking-[0.1em] py-3 px-2 font-medium uppercase"
                      style={{ color: 'var(--ink-50)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((ev: any) => {
                  const status = STATUS_PILL[ev.status] ?? STATUS_PILL.draft
                  return (
                    <tr key={ev.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td
                        className="py-4 px-2 font-medium max-w-[280px] truncate"
                        style={{ color: 'var(--ink)' }}
                        title={ev.title}
                      >
                        {ev.title}
                      </td>
                      <td
                        className="py-4 px-2 mono text-[11px] whitespace-nowrap"
                        style={{ color: 'var(--ink-70)' }}
                      >
                        {formatDateShort(ev.event_date)}
                        {ev.start_time ? ` · ${ev.start_time.slice(0, 5)}` : ''}
                      </td>
                      <td className="py-4 px-2 mono whitespace-nowrap" style={{ color: 'var(--ink)' }}>
                        {ev.capacity ?? '—'}
                      </td>
                      <td className="py-4 px-2 mono whitespace-nowrap" style={{ color: 'var(--ink)' }}>
                        {inscByEvent[ev.id] ?? 0}
                      </td>
                      <td className="py-4 px-2">
                        <span
                          className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap"
                          style={{ background: status.bg, color: status.color }}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <Link
                          href={`/parceiro/eventos/${ev.id}/editar`}
                          className="mono text-[11px] tracking-[0.1em] inline-flex items-center gap-1 hover:opacity-70 transition-opacity"
                          style={{ color: 'var(--azul)' }}
                        >
                          ABRIR <ArrowUpRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: number
  icon: React.ReactNode
  accent: string
}) {
  return (
    <div
      className="rounded-2xl bg-white p-4 flex items-center gap-3"
      style={{ border: '1px solid var(--line)' }}
    >
      <div className="rounded-lg p-2.5 shrink-0" style={{ background: 'var(--paper-2)', color: accent }}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="mono text-[10px] tracking-[0.14em] truncate" style={{ color: 'var(--ink-50)' }}>
          {label}
        </div>
        <div className="display" style={{ fontSize: 24, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
          {value}
        </div>
      </div>
    </div>
  )
}
