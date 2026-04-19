export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatCurrency, formatDateShort, formatTime } from '@/lib/utils'
import Pagination from '@/components/ui/Pagination'
import EventActions from '@/components/admin/EventActions'
import EmailBlastModal from '@/components/admin/EmailBlastModal'
import {
  Plus,
  Pencil,
  Eye,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Building2,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react'
import type { Event } from '@/types/database'

const PAGE_SIZE = 20

const categories = [
  { value: 'palestra', label: 'Palestra' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'painel', label: 'Painel' },
  { value: 'rodada', label: 'Rodada' },
  { value: 'feira', label: 'Feira' },
  { value: 'curso', label: 'Curso' },
  { value: 'consultoria', label: 'Consultoria' },
  { value: 'networking', label: 'Networking' },
  { value: 'abertura', label: 'Abertura' },
  { value: 'encerramento', label: 'Encerramento' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'outro', label: 'Outro' },
]

async function approveEventAction(formData: FormData) {
  'use server'
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = Number(formData.get('id'))
  const admin = createAdminClient()
  await admin
    .from('events')
    .update({
      status: 'active',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      rejection_reason: null,
    })
    .eq('id', id)
  revalidatePath('/admin/eventos')
}

async function rejectEventAction(formData: FormData) {
  'use server'
  const id = Number(formData.get('id'))
  const reason = String(formData.get('reason') ?? '').trim() || 'Sem motivo informado'
  const admin = createAdminClient()
  await admin
    .from('events')
    .update({ status: 'rejected', rejection_reason: reason })
    .eq('id', id)
  revalidatePath('/admin/eventos')
}

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
    .select('*, organizations:organization_id ( id, name )', { count: 'exact' })
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
    { count: totalPending },
    { count: totalDraft },
    { data: revenueData },
  ] = await Promise.all([
    query,
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_approval'),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('inscriptions').select('net_amount').eq('payment_status', 'confirmed'),
  ])

  const events = eventsResult.data
  const count = eventsResult.count
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
  const totalRevenue = revenueData?.reduce((sum, r) => sum + (r.net_amount || 0), 0) ?? 0

  const eventIds = events?.map((e: any) => e.id) ?? []
  const inscriptionCounts: Record<number, number> = {}
  if (eventIds.length > 0) {
    const { data: counts } = await supabase
      .from('inscriptions')
      .select('event_id, quantity')
      .in('event_id', eventIds)
      .in('payment_status', ['confirmed', 'free', 'pending'])
    for (const row of counts ?? []) {
      const eid = (row as any).event_id as number
      const qty = ((row as any).quantity as number) || 1
      inscriptionCounts[eid] = (inscriptionCounts[eid] || 0) + qty
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

  const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a', label: 'PUBLICADO' },
    pending_approval: { bg: 'rgba(248,130,30,0.15)', color: '#b85d00', label: 'PENDENTE' },
    draft: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'RASCUNHO' },
    rejected: { bg: '#fee2e2', color: '#991b1b', label: 'REJEITADO' },
    archived: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'ARQUIVADO' },
    inactive: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'INATIVO' },
    sold_out: { bg: 'rgba(248,130,30,0.15)', color: '#b85d00', label: 'ESGOTADO' },
    closed: { bg: '#fee2e2', color: '#991b1b', label: 'ENCERRADO' },
    cancelled: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'CANCELADO' },
    published: { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a', label: 'PUBLICADO' },
    finished: { bg: '#fee2e2', color: '#991b1b', label: 'ENCERRADO' },
  }

  function getVagasColor(inscritos: number, capacidade: number) {
    const restantes = capacidade - inscritos
    if (restantes <= 0) return '#991b1b'
    if (restantes < 10) return 'var(--laranja-600)'
    return '#3d5a0a'
  }

  return (
    <div className="page-enter" style={{ color: 'var(--ink)' }}>
      {/* Header */}
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="eyebrow mb-4">
            <span className="dot" />
            CATÁLOGO · EVENTOS
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
            Eventos
          </h1>
          <p
            className="mt-3"
            style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
          >
            Gerencie a programação oficial. Aprove ou rejeite eventos submetidos
            pelos parceiros.
          </p>
        </div>
        <Link href="/admin/eventos/novo" className="btn btn-orange btn-lg shrink-0">
          <Plus size={18} />
          Novo Evento
        </Link>
      </div>

      {/* Banner: Pendentes */}
      {(totalPending ?? 0) > 0 && !searchParams.status && (
        <div
          className="mb-6 rounded-2xl p-4 flex items-center justify-between gap-3"
          style={{
            background: 'rgba(248,130,30,0.08)',
            border: '1px solid rgba(248,130,30,0.3)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <AlertTriangle
              size={18}
              className="shrink-0"
              style={{ color: 'var(--laranja)' }}
            />
            <div className="text-sm" style={{ color: '#b85d00' }}>
              <strong>{totalPending}</strong> evento(s) aguardando aprovação dos
              parceiros.
            </div>
          </div>
          <Link
            href="/admin/eventos?status=pending_approval"
            className="mono text-[11px] tracking-[0.1em] inline-flex items-center gap-1 hover:opacity-70 transition-opacity shrink-0 whitespace-nowrap"
            style={{ color: '#b85d00' }}
          >
            REVISAR <ArrowUpRight size={12} />
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="TOTAL"
          value={totalAll ?? 0}
          icon={<Calendar size={18} />}
          accent="var(--azul)"
          accentBg="var(--azul-50)"
        />
        <StatCard
          label="PUBLICADOS"
          value={totalActive ?? 0}
          icon={<CheckCircle size={18} />}
          accent="var(--verde-600)"
          accentBg="rgba(166,206,58,0.18)"
        />
        <StatCard
          label="PENDENTES"
          value={totalPending ?? 0}
          icon={<Clock size={18} />}
          accent="var(--laranja)"
          accentBg="rgba(248,130,30,0.12)"
        />
        <StatCard
          label="RECEITA TOTAL"
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
              CATEGORIA
            </label>
            <select
              name="categoria"
              defaultValue={searchParams.categoria ?? ''}
              className="admin-select w-full px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors"
              style={{ border: '1px solid var(--line)' }}
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
            <label
              className="mono text-[10px] tracking-[0.14em] mb-2 block"
              style={{ color: 'var(--ink-50)' }}
            >
              STATUS
            </label>
            <select
              name="status"
              defaultValue={searchParams.status ?? ''}
              className="admin-select w-full px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors"
              style={{ border: '1px solid var(--line)' }}
            >
              <option value="">Todos</option>
              <option value="draft">Rascunho</option>
              <option value="pending_approval">Pendente de aprovação</option>
              <option value="active">Publicado</option>
              <option value="rejected">Rejeitado</option>
              <option value="archived">Arquivado</option>
              <option value="sold_out">Esgotado</option>
              <option value="closed">Encerrado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label
              className="mono text-[10px] tracking-[0.14em] mb-2 block"
              style={{ color: 'var(--ink-50)' }}
            >
              BUSCAR (TÍTULO)
            </label>
            <input
              type="text"
              name="busca"
              defaultValue={searchParams.busca ?? ''}
              placeholder="Nome do evento..."
              className="admin-input w-full px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors"
              style={{ border: '1px solid var(--line)' }}
            />
          </div>

          <div className="flex items-center gap-3 lg:col-span-4">
            <button type="submit" className="btn btn-orange">
              Filtrar
            </button>
            <Link href="/admin/eventos" className="btn btn-ghost">
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
              Lista de eventos
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Título', 'Organização', 'Categoria', 'Data', 'Vagas', 'Status', 'Ações'].map(
                  (h) => (
                    <th
                      key={h}
                      className="mono text-[10px] tracking-[0.1em] py-3 px-2 font-medium uppercase"
                      style={{ color: 'var(--ink-50)' }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {events?.map((event: any) => {
                const status = statusStyles[event.status] ?? {
                  bg: 'var(--paper-2)',
                  color: 'var(--ink-50)',
                  label: event.status.toUpperCase(),
                }
                const inscritos = inscriptionCounts[event.id] || 0
                const vagasColor = getVagasColor(inscritos, event.capacity)
                const isPending = event.status === 'pending_approval'
                return (
                  <tr key={event.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td
                      className="py-4 px-2 font-medium max-w-[240px] truncate"
                      style={{ color: 'var(--ink)' }}
                      title={event.title}
                    >
                      {event.title}
                    </td>
                    <td className="py-4 px-2">
                      {event.organizations ? (
                        <Link
                          href={`/admin/parceiros/${event.organizations.id}`}
                          className="inline-flex items-center gap-1.5 max-w-[180px] truncate hover:underline"
                          style={{ color: 'var(--azul)' }}
                          title={event.organizations.name}
                        >
                          <Building2 size={12} className="shrink-0" />
                          <span className="truncate">{event.organizations.name}</span>
                        </Link>
                      ) : (
                        <span
                          className="mono text-[10px] tracking-[0.06em]"
                          style={{ color: 'var(--ink-50)' }}
                        >
                          PLATAFORMA
                        </span>
                      )}
                    </td>
                    <td
                      className="py-4 px-2 mono text-[11px] tracking-[0.06em] uppercase whitespace-nowrap"
                      style={{ color: 'var(--ink-70)' }}
                    >
                      {event.category}
                    </td>
                    <td
                      className="py-4 px-2 mono text-[11px] whitespace-nowrap"
                      style={{ color: 'var(--ink-70)' }}
                    >
                      {formatDateShort(event.event_date)}{' '}
                      <span style={{ color: 'var(--ink-50)' }}>{formatTime(event.start_time)}</span>
                    </td>
                    <td
                      className="py-4 px-2 mono whitespace-nowrap"
                      style={{ color: vagasColor, fontWeight: 600 }}
                    >
                      {inscritos}/{event.capacity}
                    </td>
                    <td className="py-4 px-2">
                      <span
                        className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap"
                        style={{ background: status.bg, color: status.color }}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      {isPending ? (
                        <div className="flex items-center gap-2">
                          <form action={approveEventAction}>
                            <input type="hidden" name="id" value={event.id} />
                            <button
                              type="submit"
                              className="mono text-[10px] tracking-[0.1em] px-2.5 py-1 rounded-md transition-colors hover:opacity-80"
                              style={{
                                background: 'rgba(166,206,58,0.18)',
                                color: '#3d5a0a',
                              }}
                            >
                              APROVAR
                            </button>
                          </form>
                          <form action={rejectEventAction}>
                            <input type="hidden" name="id" value={event.id} />
                            <input
                              type="hidden"
                              name="reason"
                              value="Rejeitado pelo administrador"
                            />
                            <button
                              type="submit"
                              className="mono text-[10px] tracking-[0.1em] px-2.5 py-1 rounded-md transition-colors hover:opacity-80"
                              style={{ background: '#fee2e2', color: '#991b1b' }}
                            >
                              REJEITAR
                            </button>
                          </form>
                          <Link
                            href={`/admin/eventos/${event.id}/editar`}
                            className="w-7 h-7 rounded-lg grid place-items-center transition-colors hover:bg-[var(--paper-2)]"
                            style={{ color: 'var(--ink-50)' }}
                            title="Ver detalhes"
                          >
                            <Eye size={14} />
                          </Link>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/admin/eventos/${event.id}/editar`}
                            className="w-8 h-8 rounded-lg grid place-items-center transition-colors hover:bg-[var(--paper-2)]"
                            style={{ color: 'var(--ink-50)' }}
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </Link>
                          <Link
                            href={`/admin/inscricoes?evento=${event.id}`}
                            className="w-8 h-8 rounded-lg grid place-items-center transition-colors hover:bg-[var(--paper-2)]"
                            style={{ color: 'var(--ink-50)' }}
                            title="Ver inscrições"
                          >
                            <Eye size={16} />
                          </Link>
                          <EventActions eventId={event.id} eventStatus={event.status} />
                          <EmailBlastModal
                            eventId={event.id}
                            eventTitle={event.title}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {(!events || events.length === 0) && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center mono text-[11px] tracking-[0.14em]"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    NENHUM EVENTO ENCONTRADO
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
          fontSize: monoValue ? 'clamp(18px, 2.4vw, 24px)' : 'clamp(28px, 3.4vw, 36px)',
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
