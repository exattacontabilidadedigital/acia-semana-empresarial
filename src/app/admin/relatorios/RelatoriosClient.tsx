'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle, XCircle, Download, Users, UserCheck, BarChart3,
  DollarSign, Clock, Tag, AlertTriangle, Percent, TrendingUp,
  Ticket, Calendar, Search, Printer,
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

  const maxInscritos = Math.max(...eventRanking.map((e) => e.inscritos), 1)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 font-montserrat">Relatórios</h1>
        {selectedEventId && (
          <div className="flex gap-2">
            <button onClick={handleExportCSV} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
              <Download size={16} /> CSV
            </button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Printer size={16} /> Imprimir
            </button>
          </div>
        )}
      </div>

      {/* ==================== OVERVIEW GLOBAL ==================== */}
      {!selectedEventId && (
        <>
          {/* Global Stats */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-5 shadow-sm border-l-4 border-purple">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Total Inscrições</p>
                  <p className="text-3xl font-bold text-gray-900">{globalOverview.total}</p>
                  <p className="text-xs text-gray-400 mt-1">{globalOverview.confirmed} confirmadas</p>
                </div>
                <div className="rounded-lg p-3 bg-purple/10"><Users size={24} className="text-purple" /></div>
              </div>
            </div>
            <div className="rounded-lg bg-white p-5 shadow-sm border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Receita Total</p>
                  <p className="text-3xl font-bold text-gray-900">{formatCurrency(globalOverview.revenue)}</p>
                  <p className="text-xs text-gray-400 mt-1">{globalOverview.free} gratuitas</p>
                </div>
                <div className="rounded-lg p-3 bg-green-50"><DollarSign size={24} className="text-green-500" /></div>
              </div>
            </div>
            <div className="rounded-lg bg-white p-5 shadow-sm border-l-4 border-cyan">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Check-ins</p>
                  <p className="text-3xl font-bold text-gray-900">{globalOverview.checkins}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan rounded-full" style={{ width: `${globalOverview.checkinRate}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{globalOverview.checkinRate}%</span>
                  </div>
                </div>
                <div className="rounded-lg p-3 bg-cyan/10"><CheckCircle size={24} className="text-cyan" /></div>
              </div>
            </div>
            <div className="rounded-lg bg-white p-5 shadow-sm border-l-4 border-yellow-400">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Pendentes</p>
                  <p className="text-3xl font-bold text-gray-900">{globalOverview.pending}</p>
                  {globalOverview.expired > 0 && (
                    <p className="text-xs text-red-500 mt-1">{globalOverview.expired} expirados</p>
                  )}
                </div>
                <div className="rounded-lg p-3 bg-yellow-50"><Clock size={24} className="text-yellow-500" /></div>
              </div>
            </div>
          </div>

          {/* Ranking de Eventos */}
          <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ranking de Eventos por Inscrições</h2>
            <div className="space-y-3">
              {eventRanking.slice(0, 10).map((ev, i) => (
                <button
                  key={ev.id}
                  onClick={() => router.push(`/admin/relatorios?evento=${ev.id}`)}
                  className="w-full text-left hover:bg-gray-50 rounded-lg p-3 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange text-white' : 'bg-gray-100 text-gray-500'
                      }`}>{i + 1}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{ev.title}</p>
                        <p className="text-xs text-gray-400">{formatDateShort(ev.event_date)} &middot; {ev.price > 0 ? formatCurrency(ev.price) : 'Gratuito'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{ev.inscritos}/{ev.capacity}</p>
                      {ev.receita > 0 && <p className="text-xs text-green-600">{formatCurrency(ev.receita)}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          ev.ocupacao > 80 ? 'bg-orange' : ev.ocupacao > 50 ? 'bg-cyan' : 'bg-purple/40'
                        }`}
                        style={{ width: `${Math.min(ev.ocupacao, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-10 text-right">{ev.ocupacao}%</span>
                  </div>
                </button>
              ))}
              {eventRanking.length === 0 && (
                <p className="text-center text-gray-400 py-4">Nenhum evento com inscrições.</p>
              )}
            </div>
          </div>

          {/* Distribuição por Status */}
          <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribuição de Inscrições</h2>
            <div className="space-y-3">
              {[
                { label: 'Confirmadas', value: globalOverview.confirmed, color: 'bg-green-500', total: globalOverview.total },
                { label: 'Gratuitas', value: globalOverview.free, color: 'bg-blue-500', total: globalOverview.total },
                { label: 'Pendentes', value: globalOverview.pending, color: 'bg-yellow-500', total: globalOverview.total },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-semibold text-gray-900">{item.value} <span className="text-xs text-gray-400 font-normal">({item.total > 0 ? Math.round((item.value / item.total) * 100) : 0}%)</span></span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ==================== EVENT SELECTOR ==================== */}
      <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {selectedEventId ? 'Relatório do Evento' : 'Selecione um evento para relatório detalhado'}
        </label>
        <select
          value={selectedEventId ?? ''}
          onChange={handleEventChange}
          className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
        >
          <option value="">-- Overview Geral --</option>
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
            <div className="rounded-lg bg-white p-5 shadow-sm border-l-4 border-purple">
              <div className="flex items-center gap-3">
                <Users className="text-purple" size={24} />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Total Inscrições</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalInscriptions}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-white p-5 shadow-sm border-l-4 border-cyan">
              <div className="flex items-center gap-3">
                <UserCheck className="text-cyan" size={24} />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Confirmados</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.confirmed}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-white p-5 shadow-sm border-l-4 border-green-500">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-green-500" size={24} />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Check-ins</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.checkedIn}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-white p-5 shadow-sm border-l-4 border-orange">
              <div className="flex items-center gap-3">
                <BarChart3 className="text-orange" size={24} />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Presença</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.percentage}%</p>
                </div>
              </div>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange rounded-full" style={{ width: `${stats.percentage}%` }} />
              </div>
            </div>
          </div>

          {/* Financeiro */}
          <h2 className="mb-3 text-lg font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign size={20} className="text-green-600" />
            Financeiro
          </h2>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-green-600">
              <p className="text-xs text-gray-500 uppercase">Receita Confirmada</p>
              <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(financials.confirmedRevenue)}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-yellow-500">
              <p className="text-xs text-gray-500 uppercase">Receita Pendente</p>
              <p className="text-xl font-bold text-yellow-700 mt-1">{formatCurrency(financials.pendingRevenue)}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-blue-400">
              <p className="text-xs text-gray-500 uppercase">Gratuitas</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{financials.freeCount}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-indigo-400">
              <p className="text-xs text-gray-500 uppercase">Meia-entrada / Inteira</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{financials.halfPriceCount} / {financials.fullPriceCount}</p>
            </div>
          </div>

          {/* Alertas */}
          {financials.expiredPendingCount > 0 && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="text-red-500 flex-shrink-0" size={20} />
              <div className="text-sm">
                <span className="font-semibold text-red-800">Inadimplência:</span>
                <span className="text-red-700"> {financials.expiredPendingCount} inscrição(ões) pendente(s) há mais de 3 dias</span>
              </div>
            </div>
          )}

          {/* Cupons */}
          {couponUsage.length > 0 && (
            <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Tag size={20} className="text-purple" />
                Cupons Utilizados
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {couponUsage.map((coupon) => (
                  <div key={coupon.code} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                    <div className="rounded-lg bg-purple/10 p-2">
                      <Tag size={16} className="text-purple" />
                    </div>
                    <div>
                      <p className="font-mono font-bold text-sm text-gray-900">{coupon.code}</p>
                      <p className="text-xs text-gray-500">
                        {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : formatCurrency(coupon.discount_value)}
                        {' '}&middot; {coupon.times_used}x usado
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de Presença */}
          <div className="rounded-lg bg-white shadow-sm">
            <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Ticket size={20} className="text-cyan" />
                Lista de Presença
                <span className="text-xs font-normal text-gray-400">({filteredParticipants.length} ingressos)</span>
              </h2>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchParticipant}
                  onChange={(e) => setSearchParticipant(e.target.value)}
                  placeholder="Buscar participante..."
                  className="rounded-lg border border-gray-300 pl-8 pr-3 py-1.5 text-sm focus:border-purple focus:outline-none w-64"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="px-6 py-3 font-medium">Nome</th>
                    <th className="px-6 py-3 font-medium">Email</th>
                    <th className="px-6 py-3 font-medium">CPF</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Check-in</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredParticipants.map((p: any) => (
                    <tr key={p.id} className="text-gray-700 hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium">{p.participant_name}</td>
                      <td className="px-6 py-3 text-gray-500">{p.inscriptions?.email ?? '—'}</td>
                      <td className="px-6 py-3 text-gray-500">{p.inscriptions?.cpf ? formatCPF(p.inscriptions.cpf) : '—'}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.status === 'used' ? 'bg-green-100 text-green-800' : p.status === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {p.status === 'used' ? 'Utilizado' : p.status === 'active' ? 'Ativo' : p.status}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {p.checked_in_at ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                            <CheckCircle size={14} />
                            Sim
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-400 text-xs">
                            <XCircle size={14} />
                            Não
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredParticipants.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                        {searchParticipant ? 'Nenhum participante encontrado.' : 'Nenhum participante.'}
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
