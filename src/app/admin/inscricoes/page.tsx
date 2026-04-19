import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCurrency, formatDateShort, formatCPF } from '@/lib/utils'
import { Users, CheckCircle, Clock, DollarSign, Download } from 'lucide-react'
import Pagination from '@/components/ui/Pagination'
import InscriptionActions from '@/components/admin/InscriptionActions'
import ManualInscriptionModal from '@/components/admin/ManualInscriptionModal'
import type { Event } from '@/types/database'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
  confirmed: { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a', label: 'CONFIRMADO' },
  free: { bg: 'rgba(86,198,208,0.18)', color: '#0a4650', label: 'GRATUITO' },
  pending: { bg: 'rgba(248,130,30,0.15)', color: '#b85d00', label: 'PENDENTE' },
  failed: { bg: '#fee2e2', color: '#991b1b', label: 'FALHOU' },
  refunded: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'REEMBOLSADO' },
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
    <div className="page-enter" style={{ color: 'var(--ink)' }}>

      {/* Header */}
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="eyebrow mb-4">
            <span className="dot" />
            CADASTROS · INSCRIÇÕES
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
            Inscrições
          </h1>
          <p
            className="mt-3"
            style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
          >
            Acompanhe pagamentos, gere inscrições manuais e exporte dados.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <a href={buildExportUrl()} className="btn btn-ghost btn-lg">
            <Download size={16} />
            Exportar CSV
          </a>
          <ManualInscriptionModal
            events={(events ?? []).map((ev: any) => ({ id: ev.id, title: ev.title }))}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="CONFIRMADAS"
          value={totalConfirmed ?? 0}
          icon={<CheckCircle size={18} />}
          accent="var(--verde-600)"
          accentBg="rgba(166,206,58,0.18)"
        />
        <StatCard
          label="PENDENTES"
          value={totalPending ?? 0}
          icon={<Clock size={18} />}
          accent="var(--laranja-600)"
          accentBg="rgba(248,130,30,0.15)"
        />
        <StatCard
          label="GRATUITAS"
          value={totalFree ?? 0}
          icon={<Users size={18} />}
          accent="var(--ciano-600)"
          accentBg="rgba(86,198,208,0.18)"
        />
        <StatCard
          label="RECEITA"
          value={formatCurrency(totalRevenue)}
          icon={<DollarSign size={18} />}
          accent="var(--laranja)"
          accentBg="rgba(248,130,30,0.12)"
          monoValue
        />
      </div>

      {/* Filters */}
      <div
        className="mb-6 rounded-[20px] bg-white p-7"
        style={{ border: '1px solid var(--line)' }}
      >
        <div className="mb-5 min-w-0">
          <div
            className="mono text-[10px] tracking-[0.14em]"
            style={{ color: 'var(--ink-50)' }}
          >
            FILTROS
          </div>
          <h2
            className="display mt-1"
            style={{ fontSize: 22, letterSpacing: '-0.02em' }}
          >
            Refinar listagem
          </h2>
        </div>
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              className="mono text-[10px] tracking-[0.14em] mb-2 block"
              style={{ color: 'var(--ink-50)' }}
            >
              EVENTO
            </label>
            <select
              name="evento"
              defaultValue={searchParams.evento ?? ''}
              className="admin-input admin-select w-full px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors"
              style={{ border: '1px solid var(--line)' }}
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
            <label
              className="mono text-[10px] tracking-[0.14em] mb-2 block"
              style={{ color: 'var(--ink-50)' }}
            >
              STATUS PGTO
            </label>
            <select
              name="status"
              defaultValue={searchParams.status ?? ''}
              className="admin-input admin-select w-full px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors"
              style={{ border: '1px solid var(--line)' }}
            >
              <option value="">Todos</option>
              <option value="confirmed">Confirmado</option>
              <option value="free">Gratuito</option>
              <option value="pending">Pendente</option>
              <option value="failed">Falhou</option>
              <option value="refunded">Reembolsado</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label
              className="mono text-[10px] tracking-[0.14em] mb-2 block"
              style={{ color: 'var(--ink-50)' }}
            >
              BUSCAR (NOME OU CPF)
            </label>
            <input
              type="text"
              name="busca"
              defaultValue={searchParams.busca ?? ''}
              placeholder="Nome ou CPF..."
              className="admin-input w-full px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors"
              style={{ border: '1px solid var(--line)' }}
            />
          </div>

          <div className="flex items-center gap-3 lg:col-span-4">
            <button type="submit" className="btn btn-orange">
              Filtrar
            </button>
            <Link href="/admin/inscricoes" className="btn btn-ghost">
              Limpar
            </Link>
          </div>
        </form>
      </div>

      {/* Table */}
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
              {count ?? 0} REGISTRO(S)
            </div>
            <h2
              className="display mt-1"
              style={{ fontSize: 22, letterSpacing: '-0.02em' }}
            >
              Lista de inscrições
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Nome', 'CPF', 'Evento', 'Qtd', 'Valor', 'Status', 'Data', 'Ações'].map((h) => (
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
              {inscriptions?.map((insc: any) => {
                const status = statusStyles[insc.payment_status] ?? {
                  bg: 'var(--paper-2)',
                  color: 'var(--ink-50)',
                  label: String(insc.payment_status).toUpperCase(),
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
                      className="py-4 px-2 mono text-[11px] whitespace-nowrap"
                      style={{ color: 'var(--ink-70)' }}
                    >
                      {formatCPF(insc.cpf)}
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
                      style={{ color: 'var(--ink-70)' }}
                    >
                      {insc.quantity}
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
                    <td className="py-4 px-2">
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
                )
              })}
              {(!inscriptions || inscriptions.length === 0) && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-16 text-center mono text-[11px] tracking-[0.14em]"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    NENHUMA INSCRIÇÃO ENCONTRADA
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

function StatCard({
  label,
  value,
  icon,
  accent,
  accentBg,
  monoValue,
}: {
  label: string
  value: number | string
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
        title={String(value)}
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
    </div>
  )
}
