import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCurrency, formatDateShort, formatCPF } from '@/lib/utils'
import { Users, CheckCircle, Clock, DollarSign } from 'lucide-react'
import Pagination from '@/components/ui/Pagination'
import InscriptionActions from '@/components/admin/InscriptionActions'
import ManualInscriptionModal from '@/components/admin/ManualInscriptionModal'
import type { Event } from '@/types/database'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800',
  free: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
}

export default async function AdminInscricoesPage({
  searchParams,
}: {
  searchParams: { evento?: string; status?: string; busca?: string; pagina?: string }
}) {
  const supabase = createServerSupabaseClient()
  const page = Math.max(1, Number(searchParams.pagina) || 1)
  const offset = (page - 1) * PAGE_SIZE

  // Fetch events for filter dropdown
  const { data: events } = await supabase
    .from('events')
    .select('id, title')
    .order('event_date', { ascending: false })

  // Build query
  let query = supabase
    .from('inscriptions')
    .select('*, events(title)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (searchParams.evento) {
    query = query.eq('event_id', Number(searchParams.evento))
  }
  if (searchParams.status) {
    query = query.eq('payment_status', searchParams.status)
  }
  if (searchParams.busca) {
    const search = searchParams.busca
    query = query.or(`nome.ilike.%${search}%,cpf.ilike.%${search}%`)
  }

  const [
    inscriptionsResult,
    { count: totalConfirmed },
    { count: totalPending },
    { count: totalFree },
    { data: revenueData },
  ] = await Promise.all([
    query,
    supabase.from('inscriptions').select('*', { count: 'exact', head: true }).in('payment_status', ['confirmed']),
    supabase.from('inscriptions').select('*', { count: 'exact', head: true }).eq('payment_status', 'pending'),
    supabase.from('inscriptions').select('*', { count: 'exact', head: true }).eq('payment_status', 'free'),
    supabase.from('inscriptions').select('total_amount').eq('payment_status', 'confirmed'),
  ])

  const inscriptions = inscriptionsResult.data
  const count = inscriptionsResult.count
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
  const totalRevenue = revenueData?.reduce((sum, r) => sum + (r.total_amount || 0), 0) ?? 0

  function buildUrl(params: Record<string, string>) {
    const sp = new URLSearchParams()
    if (searchParams.evento) sp.set('evento', searchParams.evento)
    if (searchParams.status) sp.set('status', searchParams.status)
    if (searchParams.busca) sp.set('busca', searchParams.busca)
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v)
      else sp.delete(k)
    })
    return `/admin/inscricoes?${sp.toString()}`
  }

  // Build export URL with current filters
  function buildExportUrl() {
    const sp = new URLSearchParams()
    if (searchParams.evento) sp.set('evento', searchParams.evento)
    if (searchParams.status) sp.set('status', searchParams.status)
    if (searchParams.busca) sp.set('busca', searchParams.busca)
    const qs = sp.toString()
    return `/api/admin/inscriptions/export${qs ? `?${qs}` : ''}`
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 font-montserrat">Inscrições</h1>
        <div className="flex items-center gap-3">
          <a
            href={buildExportUrl()}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Exportar CSV
          </a>
          <ManualInscriptionModal
            events={(events ?? []).map((ev: any) => ({ id: ev.id, title: ev.title }))}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Confirmadas</p>
              <p className="text-2xl font-bold text-gray-900">{totalConfirmed ?? 0}</p>
            </div>
            <div className="rounded-lg p-2.5 bg-green-50"><CheckCircle size={20} className="text-green-500" /></div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-yellow-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Pendentes</p>
              <p className="text-2xl font-bold text-gray-900">{totalPending ?? 0}</p>
            </div>
            <div className="rounded-lg p-2.5 bg-yellow-50"><Clock size={20} className="text-yellow-500" /></div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-blue-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Gratuitas</p>
              <p className="text-2xl font-bold text-gray-900">{totalFree ?? 0}</p>
            </div>
            <div className="rounded-lg p-2.5 bg-blue-50"><Users size={20} className="text-blue-500" /></div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-orange">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Receita</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="rounded-lg p-2.5 bg-orange/10"><DollarSign size={20} className="text-orange" /></div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
        <form className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Evento</label>
            <select
              name="evento"
              defaultValue={searchParams.evento ?? ''}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Todos os eventos</option>
              {events?.map((ev: any) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Status Pgto</label>
            <select
              name="status"
              defaultValue={searchParams.status ?? ''}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="confirmed">Confirmado</option>
              <option value="free">Gratuito</option>
              <option value="pending">Pendente</option>
              <option value="failed">Falhou</option>
              <option value="refunded">Reembolsado</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Buscar (nome ou CPF)</label>
            <input
              type="text"
              name="busca"
              defaultValue={searchParams.busca ?? ''}
              placeholder="Nome ou CPF..."
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
            href="/admin/inscricoes"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Limpar
          </Link>
        </form>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="px-6 py-3 font-medium">Nome</th>
                <th className="px-6 py-3 font-medium">CPF</th>
                <th className="px-6 py-3 font-medium">Evento</th>
                <th className="px-6 py-3 font-medium">Qtd</th>
                <th className="px-6 py-3 font-medium">Valor</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Data</th>
                <th className="px-6 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inscriptions?.map((insc: any) => (
                <tr key={insc.id} className="text-gray-700 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium">{insc.nome}</td>
                  <td className="px-6 py-3">{formatCPF(insc.cpf)}</td>
                  <td className="px-6 py-3 max-w-[200px] truncate">{insc.events?.title ?? '—'}</td>
                  <td className="px-6 py-3">{insc.quantity}</td>
                  <td className="px-6 py-3">{formatCurrency(insc.total_amount)}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusColors[insc.payment_status] ?? 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {insc.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-3">{formatDateShort(insc.created_at)}</td>
                  <td className="px-6 py-3">
                    <InscriptionActions
                      inscription={JSON.parse(JSON.stringify({
                        id: insc.id,
                        order_number: insc.order_number,
                        nome: insc.nome,
                        email: insc.email,
                        cpf: insc.cpf,
                        telefone: insc.telefone,
                        nome_empresa: insc.nome_empresa,
                        cargo: insc.cargo,
                        cep: insc.cep,
                        rua: insc.rua,
                        numero: insc.numero,
                        bairro: insc.bairro,
                        cidade: insc.cidade,
                        estado: insc.estado,
                        quantity: insc.quantity,
                        is_half_price: insc.is_half_price,
                        total_amount: insc.total_amount,
                        payment_status: insc.payment_status,
                        payment_id: insc.payment_id,
                        payment_url: insc.payment_url,
                        purchase_group: insc.purchase_group,
                        coupon_id: insc.coupon_id,
                        created_at: insc.created_at,
                        event_title: insc.events?.title ?? '—',
                      }))}
                    />
                  </td>
                </tr>
              ))}
              {(!inscriptions || inscriptions.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                    Nenhuma inscrição encontrada.
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
