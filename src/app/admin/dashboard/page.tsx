import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import {
  Calendar,
  Users,
  DollarSign,
  CheckCircle,
  Ticket,
  Tag,
  Clock,
  AlertCircle,
  ShoppingCart,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const supabase = createServerSupabaseClient()

  // Calculate date boundaries
  const now = new Date()
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(now.getDate() + 7)
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(now.getDate() - 3)

  const sevenDaysISO = sevenDaysFromNow.toISOString().split('T')[0]
  const todayDate = now.toISOString().split('T')[0]
  const threeDaysAgoISO = threeDaysAgo.toISOString()

  const [
    { count: totalEvents },
    { count: activeEvents },
    { count: totalInscriptions },
    { count: confirmedInscriptions },
    { count: pendingInscriptions },
    { count: freeInscriptions },
    { data: revenueData },
    { count: totalCheckins },
    { count: totalTickets },
    { count: totalCoupons },
    { count: activeCoupons },
    { count: totalGroups },
    { data: recentInscriptions },
    { data: upcomingEvents },
    { count: expiredPendingCount },
  ] = await Promise.all([
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('inscriptions').select('*', { count: 'exact', head: true }),
    supabase
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .in('payment_status', ['confirmed', 'free']),
    supabase
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'pending'),
    supabase
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'free'),
    supabase
      .from('inscriptions')
      .select('net_amount')
      .eq('payment_status', 'confirmed'),
    supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .not('checked_in_at', 'is', null),
    supabase.from('tickets').select('*', { count: 'exact', head: true }),
    supabase.from('coupons').select('*', { count: 'exact', head: true }),
    supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase
      .from('inscriptions')
      .select('purchase_group', { count: 'exact', head: true })
      .not('purchase_group', 'is', null),
    supabase
      .from('inscriptions')
      .select('id, nome, email, total_amount, payment_status, created_at, events(title)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('events')
      .select('id, title, event_date, start_time, capacity')
      .gte('event_date', todayDate)
      .lte('event_date', sevenDaysISO)
      .eq('status', 'active')
      .order('event_date', { ascending: true }),
    supabase
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'pending')
      .lt('created_at', threeDaysAgoISO),
  ])

  const totalRevenue = revenueData?.reduce((sum, row) => sum + (row.net_amount || 0), 0) ?? 0
  const checkinRate = (totalTickets ?? 0) > 0
    ? Math.round(((totalCheckins ?? 0) / (totalTickets ?? 1)) * 100)
    : 0

  let upcomingEventsWithCounts: {
    id: number
    title: string
    event_date: string
    start_time: string | null
    capacity: number | null
    inscriptionCount: number
    fillPercentage: number
  }[] = []

  if (upcomingEvents && upcomingEvents.length > 0) {
    const eventIds = upcomingEvents.map((e: any) => e.id)
    const countPromises = eventIds.map((id: number) =>
      supabase
        .from('inscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', id)
        .in('payment_status', ['confirmed', 'free'])
    )
    const countResults = await Promise.all(countPromises)

    upcomingEventsWithCounts = upcomingEvents.map((ev: any, i: number) => {
      const count = countResults[i].count ?? 0
      const capacity = ev.capacity ?? 0
      const fillPercentage = capacity > 0 ? Math.round((count / capacity) * 100) : 0
      return {
        ...ev,
        inscriptionCount: count,
        fillPercentage,
      }
    })
  }

  const almostSoldOut = upcomingEventsWithCounts.filter((ev) => ev.fillPercentage > 80)

  const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
    confirmed: { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a', label: 'CONFIRMADO' },
    free: { bg: 'rgba(86,198,208,0.18)', color: '#0a4650', label: 'GRATUITO' },
    pending: { bg: 'rgba(248,130,30,0.15)', color: '#b85d00', label: 'PENDENTE' },
    failed: { bg: '#fee2e2', color: '#991b1b', label: 'FALHOU' },
    refunded: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'ESTORNADO' },
  }

  return (
    <div className="page-enter" style={{ color: 'var(--ink)' }}>
      {/* Header */}
      <div className="mb-10">
        <div className="eyebrow mb-4">
          <span className="dot" />
          PAINEL ADMINISTRATIVO · {now.getFullYear()}
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
          Dashboard
        </h1>
        <p
          className="mt-3"
          style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
        >
          Visão geral em tempo real de eventos, inscrições, receita e check-ins.
        </p>
      </div>

      {/* Alertas */}
      {(almostSoldOut.length > 0 || (expiredPendingCount ?? 0) > 0) && (
        <div className="mb-8 space-y-3">
          {almostSoldOut.map((ev) => (
            <div
              key={ev.id}
              className="flex items-center gap-3 rounded-2xl p-4"
              style={{
                background: 'rgba(248,130,30,0.06)',
                border: '1px solid rgba(248,130,30,0.25)',
              }}
            >
              <AlertTriangle
                className="shrink-0"
                size={18}
                style={{ color: 'var(--laranja)' }}
              />
              <div className="text-sm">
                <span className="font-semibold" style={{ color: 'var(--ink)' }}>
                  {ev.title}
                </span>
                <span style={{ color: 'var(--ink-70)' }}>
                  {' '}quase esgotado — {ev.inscriptionCount}/{ev.capacity ?? '?'} ({ev.fillPercentage}%)
                </span>
              </div>
            </div>
          ))}
          {(expiredPendingCount ?? 0) > 0 && (
            <div
              className="flex items-center gap-3 rounded-2xl p-4"
              style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
            >
              <AlertCircle className="shrink-0" size={18} style={{ color: '#dc2626' }} />
              <div className="text-sm">
                <span className="font-semibold" style={{ color: '#991b1b' }}>
                  Pagamentos expirados:
                </span>
                <span style={{ color: '#b91c1c' }}>
                  {' '}{expiredPendingCount} inscrição(ões) pendente(s) há mais de 3 dias
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          href="/admin/eventos"
          label="EVENTOS"
          value={totalEvents ?? 0}
          hint={`${activeEvents ?? 0} ativos`}
          icon={<Calendar size={18} />}
          accent="var(--azul)"
          accentBg="var(--azul-50)"
        />
        <StatCard
          href="/admin/inscricoes"
          label="INSCRIÇÕES"
          value={confirmedInscriptions ?? 0}
          hint={
            <span className="flex flex-wrap gap-x-2 gap-y-0.5">
              {(pendingInscriptions ?? 0) > 0 && (
                <span className="flex items-center gap-1" style={{ color: 'var(--laranja-600)' }}>
                  <Clock size={10} />
                  {pendingInscriptions} pendentes
                </span>
              )}
              {(freeInscriptions ?? 0) > 0 && (
                <span style={{ color: 'var(--ciano-600)' }}>{freeInscriptions} gratuitas</span>
              )}
              {(pendingInscriptions ?? 0) === 0 && (freeInscriptions ?? 0) === 0 && (
                <span style={{ color: 'var(--ink-50)' }}>Total confirmadas</span>
              )}
            </span>
          }
          icon={<Users size={18} />}
          accent="var(--ciano)"
          accentBg="rgba(86,198,208,0.12)"
        />
        <StatCard
          label="RECEITA"
          value={formatCurrency(totalRevenue)}
          hint={`${totalInscriptions ?? 0} inscrições no total`}
          icon={<DollarSign size={18} />}
          accent="var(--laranja)"
          accentBg="rgba(248,130,30,0.12)"
          monoValue
        />
        <StatCard
          href="/admin/checkin"
          label="CHECK-INS"
          value={totalCheckins ?? 0}
          hint={
            <div className="flex items-center gap-2">
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ width: 80, background: 'var(--paper-2)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${checkinRate}%`, background: 'var(--verde)' }}
                />
              </div>
              <span style={{ color: 'var(--ink-50)' }}>{checkinRate}%</span>
            </div>
          }
          icon={<CheckCircle size={18} />}
          accent="var(--verde-600)"
          accentBg="rgba(166,206,58,0.18)"
        />
      </div>

      {/* Secondary Stats */}
      <div className="mb-10 grid gap-3 sm:grid-cols-3">
        <MiniCard
          href="/admin/cupons"
          icon={<Tag size={16} />}
          title={`${totalCoupons ?? 0} Cupons`}
          subtitle={`${activeCoupons ?? 0} ativos`}
          accent="var(--laranja)"
        />
        <MiniCard
          icon={<Ticket size={16} />}
          title={`${totalTickets ?? 0} Ingressos`}
          subtitle={`${(totalTickets ?? 0) - (totalCheckins ?? 0)} não utilizados`}
          accent="var(--azul)"
        />
        <MiniCard
          icon={<ShoppingCart size={16} />}
          title={`${totalGroups ?? 0} Compras`}
          subtitle="via carrinho"
          accent="var(--ciano)"
        />
      </div>

      {/* Próximos Eventos */}
      {upcomingEventsWithCounts.length > 0 && (
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
                PRÓXIMOS 7 DIAS
              </div>
              <h2
                className="display mt-1"
                style={{ fontSize: 22, letterSpacing: '-0.02em' }}
              >
                Eventos no horizonte
              </h2>
            </div>
            <Link
              href="/admin/eventos"
              className="mono text-[11px] tracking-[0.1em] flex items-center gap-1 hover:opacity-70 transition-opacity shrink-0 whitespace-nowrap"
              style={{ color: 'var(--azul)' }}
            >
              VER TODOS <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingEventsWithCounts.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between rounded-xl p-4 transition-colors"
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
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>
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
                <div className="text-right shrink-0 ml-3">
                  <p
                    className="display text-base whitespace-nowrap"
                    style={{ letterSpacing: '-0.01em' }}
                  >
                    {ev.inscriptionCount}
                    <span style={{ color: 'var(--ink-50)', fontWeight: 400 }}>
                      /{ev.capacity ?? '?'}
                    </span>
                  </p>
                  <div className="flex items-center gap-2 mt-1 justify-end">
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ width: 72, background: 'var(--paper-2)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(ev.fillPercentage, 100)}%`,
                          background:
                            ev.fillPercentage > 80 ? 'var(--laranja)' : 'var(--verde)',
                        }}
                      />
                    </div>
                    <span
                      className="mono text-[10px] tracking-[0.06em]"
                      style={{ color: 'var(--ink-50)' }}
                    >
                      {ev.fillPercentage}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Inscriptions */}
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
              ÚLTIMAS 10
            </div>
            <h2
              className="display mt-1"
              style={{ fontSize: 22, letterSpacing: '-0.02em' }}
            >
              Inscrições recentes
            </h2>
          </div>
          <Link
            href="/admin/inscricoes"
            className="mono text-[11px] tracking-[0.1em] flex items-center gap-1 hover:opacity-70 transition-opacity shrink-0 whitespace-nowrap"
            style={{ color: 'var(--azul)' }}
          >
            VER TODAS <ArrowUpRight size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Nome', 'Evento', 'Valor', 'Status', 'Data'].map((h) => (
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
              {recentInscriptions?.map((insc: any) => {
                const status = statusStyles[insc.payment_status] ?? {
                  bg: 'var(--paper-2)',
                  color: 'var(--ink-50)',
                  label: insc.payment_status,
                }
                return (
                  <tr key={insc.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td
                      className="py-4 px-2 font-medium max-w-[180px] truncate"
                      style={{ color: 'var(--ink)' }}
                      title={insc.nome}
                    >
                      {insc.nome}
                    </td>
                    <td
                      className="py-4 px-2 max-w-[220px] truncate"
                      style={{ color: 'var(--ink-70)' }}
                      title={insc.events?.title ?? '—'}
                    >
                      {insc.events?.title ?? '—'}
                    </td>
                    <td
                      className="py-4 px-2 mono whitespace-nowrap"
                      style={{ color: 'var(--ink)' }}
                    >
                      {formatCurrency(insc.total_amount)}
                    </td>
                    <td className="py-4 px-2">
                      <span
                        className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap"
                        style={{ background: status.bg, color: status.color }}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td
                      className="py-4 px-2 mono text-[11px] whitespace-nowrap"
                      style={{ color: 'var(--ink-50)' }}
                    >
                      {formatDateShort(insc.created_at)}
                    </td>
                  </tr>
                )
              })}
              {(!recentInscriptions || recentInscriptions.length === 0) && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-10 text-center mono text-[11px] tracking-[0.1em]"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    NENHUMA INSCRIÇÃO ENCONTRADA
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
  monoValue,
}: {
  href?: string
  label: string
  value: number | string
  hint: React.ReactNode
  icon: React.ReactNode
  accent: string
  accentBg: string
  monoValue?: boolean
}) {
  const content = (
    <div
      className="group h-full rounded-[20px] bg-white p-5 transition-all hover:-translate-y-0.5 overflow-hidden"
      style={{
        border: '1px solid var(--line)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
      }}
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
        className={`${monoValue ? 'mono font-bold' : 'display'} truncate`}
        title={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}
        style={{
          fontSize: monoValue
            ? 'clamp(18px, 2.4vw, 24px)'
            : 'clamp(28px, 3.4vw, 36px)',
          letterSpacing: monoValue ? '-0.02em' : '-0.03em',
          lineHeight: 1,
          color: 'var(--ink)',
        }}
      >
        {value}
      </div>
      <div
        className="text-xs mt-2 min-w-0 break-words"
        style={{ color: 'var(--ink-50)' }}
      >
        {hint}
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    )
  }
  return content
}

function MiniCard({
  href,
  icon,
  title,
  subtitle,
  accent,
}: {
  href?: string
  icon: React.ReactNode
  title: string
  subtitle: string
  accent: string
}) {
  const content = (
    <div
      className="group flex items-center gap-3 rounded-2xl bg-white p-4 transition-all hover:-translate-y-0.5"
      style={{ border: '1px solid var(--line)' }}
    >
      <div
        className="rounded-lg p-2.5 transition-transform group-hover:scale-110 shrink-0"
        style={{ background: 'var(--paper-2)', color: accent }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>
          {title}
        </p>
        <p
          className="mono text-[10px] tracking-[0.06em] mt-0.5 truncate"
          style={{ color: 'var(--ink-50)' }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    )
  }
  return content
}
