export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCurrency, formatDateShort, formatTime } from '@/lib/utils'
import Pagination from '@/components/ui/Pagination'
import EventActions from '@/components/admin/EventActions'
import EmailBlastModal from '@/components/admin/EmailBlastModal'
import { Plus, Pencil, Eye, Calendar, CheckCircle, Clock, XCircle, DollarSign } from 'lucide-react'
import type { Event } from '@/types/database'

const PAGE_SIZE = 20

const categories = [
  { value: 'palestra', label: 'Palestra' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'painel', label: 'Painel' },
  { value: 'networking', label: 'Networking' },
  { value: 'abertura', label: 'Abertura' },
  { value: 'encerramento', label: 'Encerramento' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'outro', label: 'Outro' },
]

export default async function AdminEventosPage({
  searchParams,
}: {
  searchParams: { categoria?: string; status?: string; busca?: string; pagina?: string }
}) {
  const supabase = createServerSupabaseClient()
  const page = Math.max(1, Number(searchParams.pagina) || 1)
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('events')
    .select('*', { count: 'exact' })
    .order('event_date', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (searchParams.categoria) {
    query = query.eq('category', searchParams.categoria)
  }
  if (searchParams.status) {
    query = query.eq('status', searchParams.status)
  }
  if (searchParams.busca) {
    query = query.ilike('title', `%${searchParams.busca}%`)
  }

  const [
    eventsResult,
    { count: totalAll },
    { count: totalActive },
    { count: totalDraft },
    { count: totalClosed },
    { data: revenueData },
  ] = await Promise.all([
    query,
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('events').select('*', { count: 'exact', head: true }).in('status', ['closed', 'cancelled']),
    supabase.from('inscriptions').select('net_amount').eq('payment_status', 'confirmed'),
  ])

  const events = eventsResult.data
  const count = eventsResult.count
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
  const totalRevenue = revenueData?.reduce((sum, r) => sum + (r.net_amount || 0), 0) ?? 0

  // Fetch inscription counts for all events on this page
  const eventIds = events?.map((e: Event) => e.id) ?? []
  let inscriptionCounts: Record<number, number> = {}

  if (eventIds.length > 0) {
    const { data: counts } = await supabase
      .from('inscriptions')
      .select('event_id, quantity')
      .in('event_id', eventIds)
      .in('payment_status', ['confirmed', 'free', 'pending'])

    if (counts) {
      for (const row of counts) {
        const eid = row.event_id as number
        const qty = (row.quantity as number) || 1
        inscriptionCounts[eid] = (inscriptionCounts[eid] || 0) + qty
      }
    }
  }

  function buildUrl(params: Record<string, string>) {
    const sp = new URLSearchParams()
    if (searchParams.categoria) sp.set('categoria', searchParams.categoria)
    if (searchParams.status) sp.set('status', searchParams.status)
    if (searchParams.busca) sp.set('busca', searchParams.busca)
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v)
      else sp.delete(k)
    })
    return `/admin/eventos?${sp.toString()}`
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    active: { label: 'Ativo', color: 'bg-green-100 text-green-800' },
    sold_out: { label: 'Esgotado', color: 'bg-orange-100 text-orange-800' },
    closed: { label: 'Encerrado', color: 'bg-red-100 text-red-800' },
    draft: { label: 'Rascunho', color: 'bg-yellow-100 text-yellow-800' },
    cancelled: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800' },
    // Compatibilidade com status antigos
    published: { label: 'Ativo', color: 'bg-green-100 text-green-800' },
    finished: { label: 'Encerrado', color: 'bg-red-100 text-red-800' },
  }

  function getVagasColor(inscritos: number, capacidade: number) {
    const restantes = capacidade - inscritos
    if (restantes <= 0) return 'text-red-600 font-semibold'
    if (restantes < 10) return 'text-orange-600 font-semibold'
    return 'text-green-700'
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 font-montserrat">Eventos</h1>
        <Link
          href="/admin/eventos/novo"
          className="inline-flex items-center gap-2 rounded-lg bg-purple px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-dark"
        >
          <Plus size={18} />
          Novo Evento
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-gray-900">{totalAll ?? 0}</p>
            </div>
            <div className="rounded-lg p-2.5 bg-purple/10">
              <Calendar size={20} className="text-purple" />
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Ativos</p>
              <p className="text-2xl font-bold text-gray-900">{totalActive ?? 0}</p>
            </div>
            <div className="rounded-lg p-2.5 bg-green-50">
              <CheckCircle size={20} className="text-green-500" />
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-yellow-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Rascunhos</p>
              <p className="text-2xl font-bold text-gray-900">{totalDraft ?? 0}</p>
            </div>
            <div className="rounded-lg p-2.5 bg-yellow-50">
              <Clock size={20} className="text-yellow-500" />
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-orange">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Receita Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="rounded-lg p-2.5 bg-orange/10">
              <DollarSign size={20} className="text-orange" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
        <form className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Categoria</label>
            <select
              name="categoria"
              defaultValue={searchParams.categoria ?? ''}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
            <select
              name="status"
              defaultValue={searchParams.status ?? ''}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="active">Ativo</option>
              <option value="sold_out">Esgotado</option>
              <option value="draft">Rascunho</option>
              <option value="closed">Encerrado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Buscar (título)</label>
            <input
              type="text"
              name="busca"
              defaultValue={searchParams.busca ?? ''}
              placeholder="Nome do evento..."
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-purple px-4 py-2 text-sm font-medium text-white hover:bg-purple-dark"
          >
            Filtrar
          </button>

          <Link
            href="/admin/eventos"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Limpar
          </Link>
        </form>
      </div>

      <div className="rounded-lg bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="px-6 py-3 font-medium">Titulo</th>
                <th className="px-6 py-3 font-medium">Categoria</th>
                <th className="px-6 py-3 font-medium">Data</th>
                <th className="px-6 py-3 font-medium">Vagas</th>
                <th className="px-6 py-3 font-medium">Preco</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {events?.map((event: Event) => {
                const status = statusLabels[event.status] ?? {
                  label: event.status,
                  color: 'bg-gray-100 text-gray-800',
                }
                const inscritos = inscriptionCounts[event.id] || 0
                const vagasColor = getVagasColor(inscritos, event.capacity)
                return (
                  <tr key={event.id} className="text-gray-700 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{event.title}</td>
                    <td className="px-6 py-4">{event.category}</td>
                    <td className="px-6 py-4">
                      {formatDateShort(event.event_date)}{' '}
                      <span className="text-gray-400">{formatTime(event.start_time)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={vagasColor}>
                        {inscritos}/{event.capacity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {event.price > 0 ? formatCurrency(event.price) : 'Gratuito'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/eventos/${event.id}/editar`}
                          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-purple"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </Link>
                        <Link
                          href={`/admin/inscricoes?evento=${event.id}`}
                          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-purple"
                          title="Ver inscrições"
                        >
                          <Eye size={16} />
                        </Link>
                        <EventActions eventId={event.id} eventStatus={event.status} />
                        <EmailBlastModal eventId={event.id} eventTitle={event.title} />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {(!events || events.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    Nenhum evento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={count ?? 0}
          buildUrl={(p) => buildUrl({ pagina: String(p) })}
        />
      </div>
    </div>
  )
}
