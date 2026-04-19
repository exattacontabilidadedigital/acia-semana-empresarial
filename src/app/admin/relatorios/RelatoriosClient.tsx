'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle, XCircle, Download, Users, UserCheck, BarChart3,
  DollarSign, Clock, Tag, AlertTriangle,
  Ticket, Search, Printer, ArrowUpRight, TrendingUp,
} from 'lucide-react'
import { formatCPF, formatCurrency, formatDateShort } from '@/lib/utils'

type Props = {
  events: { id: number; title: string; capacity: number; price: number; event_date: string; status: string }[]
  selectedEventId: number | null
  stats: {
    totalInscriptions: number
    confirmed: number
    checkedIn: number
    percentage: number
  }
  financials: {
    confirmedRevenue: number
    pendingRevenue: number
    freeCount: number
    halfPriceCount: number
    fullPriceCount: number
    expiredPendingCount: number
  }
  couponUsage: { code: string; discount_type: string; discount_value: number; times_used: number }[]
  participants: any[]
  globalOverview: {
    total: number
    confirmed: number
    pending: number
    free: number
    revenue: number
    checkins: number
    tickets: number
    expired: number
    checkinRate: number
  }
  eventRanking: {
    id: number
    title: string
    capacity: number
    price: number
    event_date: string
    inscritos: number
    receita: number
    ocupacao: number
  }[]
}

export default function RelatoriosClient({
  events, selectedEventId, stats, financials, couponUsage, participants,
  globalOverview, eventRanking,
}: Props) {
  const router = useRouter()
  const [searchParticipant, setSearchParticipant] = useState('')

  function handleEventChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    router.push(value ? `/admin/relatorios?evento=${value}` : '/admin/relatorios')
  }

  const filteredParticipants = searchParticipant
    ? participants.filter((p: any) =>
        p.participant_name?.toLowerCase().includes(searchParticipant.toLowerCase()) ||
        p.inscriptions?.email?.toLowerCase().includes(searchParticipant.toLowerCase()) ||
        p.inscriptions?.cpf?.includes(searchParticipant.replace(/\D/g, ''))
      )
    : participants

  function handleExportCSV() {
    const headers = ['Nome', 'Email', 'CPF', 'Status Ticket', 'Check-in']
    const rows = filteredParticipants.map((p: any) => [
      p.participant_name,
      p.inscriptions?.email ?? '',
      p.inscriptions?.cpf ?? '',
      p.status === 'used' ? 'Utilizado' : p.status === 'active' ? 'Ativo' : p.status,
      p.checked_in_at ? 'Sim' : 'Não',
    ])
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell: string) => `"${cell}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio-evento-${selectedEventId}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page-enter" style={{ color: 'var(--ink)' }}>

      {/* Header */}
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="eyebrow mb-4">
            <span className="dot" />
            {selectedEventId ? 'RELATÓRIO DETALHADO' : 'PAINEL ADMINISTRATIVO · RELATÓRIOS'}
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
            Relatórios
          </h1>
          <p
            className="mt-3"
            style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
          >
            {selectedEventId
              ? 'Análise detalhada de inscrições, financeiro, cupons e presença para o evento selecionado.'
              : 'Visão consolidada de inscrições, receita, check-ins e desempenho por evento.'}
          </p>
        </div>
        {selectedEventId && (
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={handleExportCSV}
              className="btn btn-ghost btn-lg"
            >
              <Download size={16} />
              CSV
            </button>
            <button
              onClick={() => window.print()}
              className="btn btn-ghost btn-lg"
            >
              <Printer size={16} />
              Imprimir
            </button>
          </div>
        )}
      </div>

      {/* ==================== OVERVIEW GLOBAL ==================== */}
      {!selectedEventId && (
        <>
          {/* Global Stats */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="TOTAL INSCRIÇÕES"
              value={globalOverview.total}
              hint={`${globalOverview.confirmed} confirmadas`}
              icon={<Users size={18} />}
              accent="var(--azul)"
              accentBg="var(--azul-50)"
            />
            <StatCard
              label="RECEITA TOTAL"
              value={formatCurrency(globalOverview.revenue)}
              hint={`${globalOverview.free} gratuitas`}
              icon={<DollarSign size={18} />}
              accent="var(--laranja)"
              accentBg="rgba(248,130,30,0.12)"
              monoValue
            />
            <StatCard
              label="CHECK-INS"
              value={globalOverview.checkins}
              hint={
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ width: 80, background: 'var(--paper-2)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${globalOverview.checkinRate}%`, background: 'var(--ciano)' }}
                    />
                  </div>
                  <span style={{ color: 'var(--ink-50)' }}>{globalOverview.checkinRate}%</span>
                </div>
              }
              icon={<CheckCircle size={18} />}
              accent="var(--ciano)"
              accentBg="rgba(86,198,208,0.12)"
            />
            <StatCard
              label="PENDENTES"
              value={globalOverview.pending}
              hint={
                globalOverview.expired > 0 ? (
                  <span style={{ color: '#dc2626' }}>{globalOverview.expired} expirados</span>
                ) : (
                  <span style={{ color: 'var(--ink-50)' }}>Aguardando pagamento</span>
                )
              }
              icon={<Clock size={18} />}
              accent="var(--laranja-600)"
              accentBg="rgba(248,130,30,0.12)"
            />
          </div>

          {/* Ranking de Eventos */}
          <div
            className="mb-6 rounded-[20px] bg-white p-7"
            style={{ border: '1px solid var(--line)' }}
          >
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="min-w-0">
                <div
                  className="mono text-[10px] tracking-[0.14em]"
                  style={{ color: 'var(--ink-50)' }}
                >
                  TOP 10
                </div>
                <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
                  Ranking de eventos
                </h2>
              </div>
              <Link
                href="/admin/eventos"
                className="mono text-[11px] tracking-[0.1em] flex items-center gap-1 hover:opacity-70 transition-opacity shrink-0 whitespace-nowrap"
                style={{ color: 'var(--azul)' }}
              >
                VER EVENTOS <ArrowUpRight size={12} />
              </Link>
            </div>

            <div className="space-y-2">
              {eventRanking.slice(0, 10).map((ev, i) => {
                const barColor =
                  ev.ocupacao > 80
                    ? 'var(--laranja)'
                    : ev.ocupacao > 50
                      ? 'var(--ciano)'
                      : 'var(--azul)'
                const rankColors = [
                  { bg: 'var(--laranja)', color: '#fff' },
                  { bg: 'var(--azul-50)', color: 'var(--azul)' },
                  { bg: 'rgba(86,198,208,0.18)', color: 'var(--ciano-600)' },
                ]
                const rank =
                  i < 3
                    ? rankColors[i]
                    : { bg: 'var(--paper-2)', color: 'var(--ink-50)' }

                return (
                  <button
                    key={ev.id}
                    onClick={() => router.push(`/admin/relatorios?evento=${ev.id}`)}
                    className="w-full text-left rounded-xl p-4 transition-colors hover:bg-[var(--paper-2)]"
                    style={{ border: '1px solid var(--line)' }}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center mono text-[11px] font-bold shrink-0"
                          style={{ background: rank.bg, color: rank.color }}
                        >
                          {i + 1}
                        </span>
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
                            {formatDateShort(ev.event_date).toUpperCase()} ·{' '}
                            {ev.price > 0 ? formatCurrency(ev.price) : 'GRATUITO'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className="display text-base whitespace-nowrap"
                          style={{ letterSpacing: '-0.01em' }}
                        >
                          {ev.inscritos}
                          <span style={{ color: 'var(--ink-50)', fontWeight: 400 }}>
                            /{ev.capacity}
                          </span>
                        </p>
                        {ev.receita > 0 && (
                          <p
                            className="mono text-[10px] tracking-[0.06em] mt-0.5"
                            style={{ color: 'var(--verde-600)' }}
                          >
                            {formatCurrency(ev.receita)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-1 h-1.5 rounded-full overflow-hidden"
                        style={{ background: 'var(--paper-2)' }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(ev.ocupacao, 100)}%`,
                            background: barColor,
                          }}
                        />
                      </div>
                      <span
                        className="mono text-[10px] tracking-[0.06em] w-10 text-right"
                        style={{ color: 'var(--ink-50)' }}
                      >
                        {ev.ocupacao}%
                      </span>
                    </div>
                  </button>
                )
              })}
              {eventRanking.length === 0 && (
                <div
                  className="text-center py-16 mono text-[11px] tracking-[0.14em]"
                  style={{ color: 'var(--ink-50)' }}
                >
                  SEM DADOS PARA O PERÍODO
                </div>
              )}
            </div>
          </div>

          {/* Distribuição por Status */}
          <div
            className="mb-6 rounded-[20px] bg-white p-7"
            style={{ border: '1px solid var(--line)' }}
          >
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="min-w-0">
                <div
                  className="mono text-[10px] tracking-[0.14em]"
                  style={{ color: 'var(--ink-50)' }}
                >
                  STATUS BREAKDOWN
                </div>
                <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
                  Distribuição de inscrições
                </h2>
              </div>
              <div
                className="rounded-lg p-2 shrink-0"
                style={{ background: 'var(--azul-50)', color: 'var(--azul)' }}
              >
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="space-y-4">
              {[
                {
                  label: 'Confirmadas',
                  value: globalOverview.confirmed,
                  color: 'var(--verde)',
                  total: globalOverview.total,
                },
                {
                  label: 'Gratuitas',
                  value: globalOverview.free,
                  color: 'var(--ciano)',
                  total: globalOverview.total,
                },
                {
                  label: 'Pendentes',
                  value: globalOverview.pending,
                  color: 'var(--laranja)',
                  total: globalOverview.total,
                },
              ].map((item) => {
                const pct = item.total > 0 ? Math.round((item.value / item.total) * 100) : 0
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span style={{ color: 'var(--ink-70)' }}>{item.label}</span>
                      <span style={{ color: 'var(--ink)' }}>
                        <span className="font-semibold">{item.value}</span>{' '}
                        <span
                          className="mono text-[10px] tracking-[0.08em]"
                          style={{ color: 'var(--ink-50)' }}
                        >
                          ({pct}%)
                        </span>
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: 'var(--paper-2)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: item.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ==================== EVENT SELECTOR ==================== */}
      <div
        className="mb-6 rounded-[20px] bg-white p-6"
        style={{ border: '1px solid var(--line)' }}
      >
        <div
          className="mono text-[10px] tracking-[0.14em] mb-2"
          style={{ color: 'var(--ink-50)' }}
        >
          {selectedEventId ? 'EVENTO SELECIONADO' : 'FILTRAR POR EVENTO'}
        </div>
        <label
          className="mb-3 block text-sm"
          style={{ color: 'var(--ink-70)' }}
        >
          {selectedEventId
            ? 'Trocar de evento ou voltar para o overview geral.'
            : 'Selecione um evento para ver o relatório detalhado.'}
        </label>
        <select
          value={selectedEventId ?? ''}
          onChange={handleEventChange}
          className="admin-select w-full max-w-md px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors"
          style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
        >
          <option value="">— Overview Geral —</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.title}</option>
          ))}
        </select>
      </div>

      {/* ==================== RELATÓRIO DO EVENTO ==================== */}
      {selectedEventId && (
        <>
          {/* Inscrições + Presença */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="TOTAL INSCRIÇÕES"
              value={stats.totalInscriptions}
              hint="Todos os status"
              icon={<Users size={18} />}
              accent="var(--azul)"
              accentBg="var(--azul-50)"
            />
            <StatCard
              label="CONFIRMADOS"
              value={stats.confirmed}
              hint="Pagos + gratuitos"
              icon={<UserCheck size={18} />}
              accent="var(--ciano)"
              accentBg="rgba(86,198,208,0.12)"
            />
            <StatCard
              label="CHECK-INS"
              value={stats.checkedIn}
              hint={`${stats.totalInscriptions} ingressos no total`}
              icon={<CheckCircle size={18} />}
              accent="var(--verde-600)"
              accentBg="rgba(166,206,58,0.18)"
            />
            <StatCard
              label="PRESENÇA"
              value={`${stats.percentage}%`}
              hint={
                <div
                  className="h-1.5 rounded-full overflow-hidden mt-1"
                  style={{ background: 'var(--paper-2)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${stats.percentage}%`, background: 'var(--laranja)' }}
                  />
                </div>
              }
              icon={<BarChart3 size={18} />}
              accent="var(--laranja)"
              accentBg="rgba(248,130,30,0.12)"
              monoValue
            />
          </div>

          {/* Financeiro */}
          <div
            className="mb-6 rounded-[20px] bg-white p-7"
            style={{ border: '1px solid var(--line)' }}
          >
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="min-w-0">
                <div
                  className="mono text-[10px] tracking-[0.14em]"
                  style={{ color: 'var(--ink-50)' }}
                >
                  RECEITA E DISTRIBUIÇÃO
                </div>
                <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
                  Financeiro
                </h2>
              </div>
              <div
                className="rounded-lg p-2 shrink-0"
                style={{ background: 'rgba(166,206,58,0.18)', color: 'var(--verde-600)' }}
              >
                <DollarSign size={16} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FinancialMini
                label="RECEITA CONFIRMADA"
                value={formatCurrency(financials.confirmedRevenue)}
                accent="var(--verde-600)"
              />
              <FinancialMini
                label="RECEITA PENDENTE"
                value={formatCurrency(financials.pendingRevenue)}
                accent="var(--laranja-600)"
              />
              <FinancialMini
                label="GRATUITAS"
                value={String(financials.freeCount)}
                accent="var(--ciano)"
              />
              <FinancialMini
                label="MEIA / INTEIRA"
                value={`${financials.halfPriceCount} / ${financials.fullPriceCount}`}
                accent="var(--azul)"
              />
            </div>
          </div>

          {/* Alertas */}
          {financials.expiredPendingCount > 0 && (
            <div
              className="mb-6 flex items-center gap-3 rounded-2xl p-4"
              style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
            >
              <AlertTriangle className="shrink-0" size={18} style={{ color: '#dc2626' }} />
              <div className="text-sm min-w-0">
                <span className="font-semibold" style={{ color: '#991b1b' }}>
                  Inadimplência:
                </span>
                <span style={{ color: '#b91c1c' }}>
                  {' '}{financials.expiredPendingCount} inscrição(ões) pendente(s) há mais de 3 dias
                </span>
              </div>
            </div>
          )}

          {/* Cupons */}
          {couponUsage.length > 0 && (
            <div
              className="mb-6 rounded-[20px] bg-white p-7"
              style={{ border: '1px solid var(--line)' }}
            >
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="min-w-0">
                  <div
                    className="mono text-[10px] tracking-[0.14em]"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    DESCONTOS APLICADOS
                  </div>
                  <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
                    Cupons utilizados
                  </h2>
                </div>
                <div
                  className="rounded-lg p-2 shrink-0"
                  style={{ background: 'rgba(248,130,30,0.12)', color: 'var(--laranja)' }}
                >
                  <Tag size={16} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {couponUsage.map((coupon) => (
                  <div
                    key={coupon.code}
                    className="flex items-center gap-3 rounded-xl p-3"
                    style={{ border: '1px solid var(--line)' }}
                  >
                    <div
                      className="rounded-lg p-2 shrink-0"
                      style={{ background: 'rgba(248,130,30,0.12)', color: 'var(--laranja)' }}
                    >
                      <Tag size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="mono font-bold text-sm truncate"
                        style={{ color: 'var(--ink)' }}
                      >
                        {coupon.code}
                      </p>
                      <p
                        className="mono text-[10px] tracking-[0.06em] mt-0.5 truncate"
                        style={{ color: 'var(--ink-50)' }}
                      >
                        {coupon.discount_type === 'percentage'
                          ? `${coupon.discount_value}%`
                          : formatCurrency(coupon.discount_value)}
                        {' · '}
                        {coupon.times_used}× USADO
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de Presença */}
          <div
            className="rounded-[20px] bg-white p-7"
            style={{ border: '1px solid var(--line)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="min-w-0">
                <div
                  className="mono text-[10px] tracking-[0.14em]"
                  style={{ color: 'var(--ink-50)' }}
                >
                  {filteredParticipants.length} INGRESSOS
                </div>
                <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
                  Lista de presença
                </h2>
              </div>
              <div className="relative shrink-0">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--ink-50)' }}
                />
                <input
                  type="text"
                  value={searchParticipant}
                  onChange={(e) => setSearchParticipant(e.target.value)}
                  placeholder="Buscar participante..."
                  className="admin-input pl-9 pr-3 py-2.5 rounded-xl text-sm bg-white focus:outline-none transition-colors w-64"
                  style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
                />
              </div>
            </div>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    {['Nome', 'Email', 'CPF', 'Status', 'Check-in'].map((h) => (
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
                  {filteredParticipants.map((p: any) => {
                    const statusStyle =
                      p.status === 'used'
                        ? { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a', label: 'UTILIZADO' }
                        : p.status === 'active'
                          ? { bg: 'var(--azul-50)', color: 'var(--azul)', label: 'ATIVO' }
                          : { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: String(p.status).toUpperCase() }
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td
                          className="py-4 px-2 font-medium max-w-[180px] truncate"
                          style={{ color: 'var(--ink)' }}
                          title={p.participant_name}
                        >
                          {p.participant_name}
                        </td>
                        <td
                          className="py-4 px-2 max-w-[220px] truncate"
                          style={{ color: 'var(--ink-70)' }}
                          title={p.inscriptions?.email ?? '—'}
                        >
                          {p.inscriptions?.email ?? '—'}
                        </td>
                        <td
                          className="py-4 px-2 mono whitespace-nowrap"
                          style={{ color: 'var(--ink-70)' }}
                        >
                          {p.inscriptions?.cpf ? formatCPF(p.inscriptions.cpf) : '—'}
                        </td>
                        <td className="py-4 px-2">
                          <span
                            className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap"
                            style={{ background: statusStyle.bg, color: statusStyle.color }}
                          >
                            {statusStyle.label}
                          </span>
                        </td>
                        <td className="py-4 px-2">
                          {p.checked_in_at ? (
                            <span
                              className="mono inline-flex items-center gap-1 text-[11px] tracking-[0.06em]"
                              style={{ color: 'var(--verde-600)' }}
                            >
                              <CheckCircle size={14} />
                              SIM
                            </span>
                          ) : (
                            <span
                              className="mono inline-flex items-center gap-1 text-[11px] tracking-[0.06em]"
                              style={{ color: 'var(--ink-50)' }}
                            >
                              <XCircle size={14} />
                              NÃO
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {filteredParticipants.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-16 text-center mono text-[11px] tracking-[0.14em]"
                        style={{ color: 'var(--ink-50)' }}
                      >
                        {searchParticipant
                          ? 'NENHUM PARTICIPANTE ENCONTRADO'
                          : 'SEM PARTICIPANTES NO MOMENTO'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
  accentBg,
  monoValue,
}: {
  label: string
  value: number | string
  hint: React.ReactNode
  icon: React.ReactNode
  accent: string
  accentBg: string
  monoValue?: boolean
}) {
  return (
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
}

function FinancialMini({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: string
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ border: '1px solid var(--line)', background: 'var(--paper-2)' }}
    >
      <div
        className="mono text-[10px] tracking-[0.14em] truncate"
        style={{ color: 'var(--ink-50)' }}
      >
        {label}
      </div>
      <div
        className="mono font-bold mt-2 truncate"
        style={{
          fontSize: 'clamp(16px, 1.8vw, 20px)',
          letterSpacing: '-0.02em',
          color: accent,
        }}
        title={value}
      >
        {value}
      </div>
    </div>
  )
}
