import Link from 'next/link'
import {
  Calendar,
  Users,
  CheckCircle,
  Clock,
  ArrowUpRight,
  FileText,
} from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireActiveOrg } from '@/lib/orgs'
import { formatDateShort } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const STATUS_PILL: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'RASCUNHO' },
  pending_approval: {
    bg: 'rgba(248,130,30,0.15)',
    color: '#b85d00',
    label: 'PENDENTE',
  },
  active: {
    bg: 'rgba(166,206,58,0.18)',
    color: '#3d5a0a',
    label: 'PUBLICADO',
  },
  rejected: { bg: '#fee2e2', color: '#991b1b', label: 'REJEITADO' },
  archived: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'ARQUIVADO' },
  inactive: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'INATIVO' },
}

export default async function ParceiroDashboardPage() {
  const org = await requireActiveOrg()
  const supabase = createServerSupabaseClient()

  const [
    { count: totalEvents },
    { count: activeEvents },
    { count: pendingEvents },
    { count: draftEvents },
    { data: events },
  ] = await Promise.all([
    supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org.id),
    supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org.id)
      .eq('status', 'active'),
    supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org.id)
      .eq('status', 'pending_approval'),
    supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org.id)
      .eq('status', 'draft'),
    supabase
      .from('events')
      .select('id, title, status, event_date, capacity, start_time')
      .eq('organization_id', org.id)
      .order('event_date', { ascending: true }),
  ])

  const eventIds = (events ?? []).map((e: any) => e.id)
  let totalInscriptions = 0
  let totalCheckins = 0
  let recent: any[] = []

  if (eventIds.length > 0) {
    const [{ count: insCount }, { count: chkCount }, { data: recentData }] =
      await Promise.all([
        supabase
          .from('inscriptions')
          .select('*', { count: 'exact', head: true })
          .in('event_id', eventIds)
          .in('payment_status', ['confirmed', 'free']),
        supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .in('event_id', eventIds)
          .not('checked_in_at', 'is', null),
        supabase
          .from('inscriptions')
          .select('id, nome, payment_status, created_at, events(title)')
          .in('event_id', eventIds)
          .order('created_at', { ascending: false })
          .limit(8),
      ])
    totalInscriptions = insCount ?? 0
    totalCheckins = chkCount ?? 0
    recent = recentData ?? []
  }

  // Próximos eventos (active ou pending) nos próximos 30 dias
  const today = new Date().toISOString().split('T')[0]
  const upcoming = (events ?? []).filter((e: any) => e.event_date >= today).slice(0, 5)

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="mb-10">
        <div className="eyebrow mb-4">
          <span className="dot" />
          PORTAL DO PARCEIRO · {new Date().getFullYear()}
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
          Olá, {org.name}
        </h1>
        <p
          className="mt-3"
          style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
        >
          Acompanhe seus eventos, inscritos e check-ins em um só lugar.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          href="/parceiro/eventos"
          label="EVENTOS"
          value={totalEvents ?? 0}
          hint={`${activeEvents ?? 0} publicados · ${pendingEvents ?? 0} pendentes`}
          icon={<Calendar size={18} />}
          accent="var(--azul)"
          accentBg="var(--azul-50)"
        />
        <StatCard
          href="/parceiro/inscricoes"
          label="INSCRIÇÕES"
          value={totalInscriptions}
          hint="Confirmadas + gratuitas"
          icon={<Users size={18} />}
          accent="var(--ciano)"
          accentBg="rgba(86,198,208,0.12)"
        />
        <StatCard
          href="/parceiro/checkin"
          label="CHECK-INS"
          value={totalCheckins}
          hint="Participantes presentes"
          icon={<CheckCircle size={18} />}
          accent="var(--verde-600)"
          accentBg="rgba(166,206,58,0.18)"
        />
        <StatCard
          href="/parceiro/eventos"
          label="RASCUNHOS"
          value={draftEvents ?? 0}
          hint="Aguardando submissão"
          icon={<FileText size={18} />}
          accent="var(--laranja)"
          accentBg="rgba(248,130,30,0.12)"
        />
      </div>

      {/* CTA */}
      <div
        className="rounded-[20px] p-6 mb-8 flex items-center justify-between gap-4 flex-wrap"
        style={{
          background: 'var(--azul-50)',
          border: '1px solid var(--line)',
        }}
      >
        <div className="min-w-0">
          <div
            className="mono text-[10px] tracking-[0.14em] mb-1"
            style={{ color: 'var(--azul)' }}
          >
            COMECE AGORA
          </div>
          <div className="text-sm" style={{ color: 'var(--ink)' }}>
            Crie um novo evento e submeta para aprovação do administrador.
          </div>
        </div>
        <Link href="/parceiro/eventos/novo" className="btn btn-orange shrink-0">
          + Novo evento
        </Link>
      </div>

      {/* Próximos eventos */}
      {upcoming.length > 0 && (
        <div
          className="mb-8 rounded-[20px] bg-white p-7"
          style={{ border: '1px solid var(--line)' }}
        >
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="min-w-0">
              <div
                className="mono text-[10px] tracking-[0.14em]"
                style={{ color: 'var(--ink-50)' }}
              >
                PRÓXIMOS EVENTOS
              </div>
              <h2
                className="display mt-1"
                style={{ fontSize: 22, letterSpacing: '-0.02em' }}
              >
                Sua programação
              </h2>
            </div>
            <Link
              href="/parceiro/eventos"
              className="mono text-[11px] tracking-[0.1em] flex items-center gap-1 hover:opacity-70 transition-opacity shrink-0 whitespace-nowrap"
              style={{ color: 'var(--azul)' }}
            >
              VER TODOS <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {upcoming.map((ev: any) => {
              const status = STATUS_PILL[ev.status] ?? STATUS_PILL.draft
              return (
                <Link
                  key={ev.id}
                  href={`/parceiro/eventos/${ev.id}/editar`}
                  className="flex items-center justify-between rounded-xl p-4 transition-colors hover:bg-paper-2"
                  style={{ border: '1px solid var(--line)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="rounded-lg p-2 shrink-0"
                      style={{ background: 'var(--azul-50)' }}
                    >
                      <Calendar size={16} style={{ color: 'var(--azul)' }} />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="text-sm font-semibold truncate"
                        style={{ color: 'var(--ink)' }}
                      >
                        {ev.title}
                      </p>
                      <p
                        className="mono text-[10px] tracking-[0.06em] mt-0.5"
                        style={{ color: 'var(--ink-50)' }}
                      >
                        {formatDateShort(ev.event_date).toUpperCase()}
                        {ev.start_time ? ` · ${ev.start_time.slice(0, 5)}` : ''}
                      </p>
                    </div>
                  </div>
                  <span
                    className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap shrink-0 ml-3"
                    style={{ background: status.bg, color: status.color }}
                  >
                    {status.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Inscrições recentes */}
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
              ÚLTIMAS 8
            </div>
            <h2
              className="display mt-1"
              style={{ fontSize: 22, letterSpacing: '-0.02em' }}
            >
              Inscrições recentes
            </h2>
          </div>
          <Link
            href="/parceiro/inscricoes"
            className="mono text-[11px] tracking-[0.1em] flex items-center gap-1 hover:opacity-70 transition-opacity shrink-0 whitespace-nowrap"
            style={{ color: 'var(--azul)' }}
          >
            VER TODAS <ArrowUpRight size={12} />
          </Link>
        </div>

        {recent.length === 0 && (
          <div
            className="text-center py-12 mono text-[11px] tracking-[0.14em]"
            style={{ color: 'var(--ink-50)' }}
          >
            NENHUMA INSCRIÇÃO AINDA
          </div>
        )}

        {recent.length > 0 && (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['Nome', 'Evento', 'Status', 'Data'].map((h) => (
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
                {recent.map((insc: any) => (
                  <tr key={insc.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td
                      className="py-4 px-2 font-medium max-w-[200px] truncate"
                      style={{ color: 'var(--ink)' }}
                      title={insc.nome}
                    >
                      {insc.nome}
                    </td>
                    <td
                      className="py-4 px-2 max-w-[220px] truncate"
                      style={{ color: 'var(--ink-70)' }}
                      title={insc.events?.title ?? ''}
                    >
                      {insc.events?.title ?? '—'}
                    </td>
                    <td className="py-4 px-2">
                      <PaymentPill status={insc.payment_status} />
                    </td>
                    <td
                      className="py-4 px-2 mono text-[11px] whitespace-nowrap"
                      style={{ color: 'var(--ink-50)' }}
                    >
                      {formatDateShort(insc.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  href,
  label,
  value,
  hint,
  icon,
  accent,
  accentBg,
}: {
  href?: string
  label: string
  value: number | string
  hint: string
  icon: React.ReactNode
  accent: string
  accentBg: string
}) {
  const content = (
    <div
      className="group h-full rounded-[20px] bg-white p-5 transition-all hover:-translate-y-0.5 overflow-hidden"
      style={{ border: '1px solid var(--line)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div
          className="mono text-[10px] tracking-[0.14em] truncate min-w-0 flex-1"
          style={{ color: 'var(--ink-50)' }}
        >
          {label}
        </div>
        <div
          className="rounded-lg p-2 transition-transform group-hover:scale-110 shrink-0"
          style={{ background: accentBg, color: accent }}
        >
          {icon}
        </div>
      </div>
      <div
        className="display truncate"
        style={{
          fontSize: 'clamp(28px, 3.4vw, 36px)',
          letterSpacing: '-0.03em',
          lineHeight: 1,
          color: 'var(--ink)',
        }}
      >
        {value}
      </div>
      <div className="text-xs mt-2 truncate" style={{ color: 'var(--ink-50)' }}>
        {hint}
      </div>
    </div>
  )
  return href ? <Link href={href} className="block">{content}</Link> : content
}

function PaymentPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    confirmed: { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a', label: 'CONFIRMADO' },
    free: { bg: 'rgba(86,198,208,0.18)', color: '#0a4650', label: 'GRATUITO' },
    pending: { bg: 'rgba(248,130,30,0.15)', color: '#b85d00', label: 'PENDENTE' },
    failed: { bg: '#fee2e2', color: '#991b1b', label: 'FALHOU' },
    refunded: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'ESTORNADO' },
  }
  const s = map[status] ?? { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: status.toUpperCase() }
  return (
    <span
      className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}
