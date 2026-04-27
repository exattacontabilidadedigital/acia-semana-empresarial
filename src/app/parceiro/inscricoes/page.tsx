import { Search, CheckCircle2, Download } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { hasPermission, requirePermission } from '@/lib/permissions'
import { formatCPF, formatDateShort } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const PAYMENT_PILL: Record<string, { bg: string; color: string; label: string }> = {
  confirmed: { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a', label: 'CONFIRMADO' },
  free: { bg: 'rgba(86,198,208,0.18)', color: '#0a4650', label: 'GRATUITO' },
  pending: { bg: 'rgba(248,130,30,0.15)', color: '#b85d00', label: 'PENDENTE' },
  failed: { bg: '#fee2e2', color: '#991b1b', label: 'FALHOU' },
  refunded: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'ESTORNADO' },
}

export default async function ParceiroInscricoesPage({
  searchParams,
}: {
  searchParams: { evento?: string; busca?: string }
}) {
  const org = await requirePermission('view_inscriptions')
  const canExport = hasPermission(org.role, 'export_data')
  const supabase = createServerSupabaseClient()

  const eventoFilter = searchParams.evento ?? ''
  const busca = (searchParams.busca ?? '').trim()

  // Eventos da org
  const { data: events } = await supabase
    .from('events')
    .select('id, title')
    .eq('organization_id', org.id)
    .order('title')

  const eventIds = (events ?? []).map((e: any) => e.id)

  let inscriptions: any[] = []
  if (eventIds.length > 0) {
    let query = supabase
      .from('inscriptions')
      .select(
        'id, nome, email, cpf, payment_status, created_at, event_id, events(title)'
      )
      .in('event_id', eventIds)
      .order('created_at', { ascending: false })

    if (eventoFilter) {
      const id = parseInt(eventoFilter, 10)
      if (!isNaN(id) && eventIds.includes(id)) {
        query = query.eq('event_id', id)
      }
    }

    const { data } = await query
    inscriptions = data ?? []
  }

  if (busca) {
    const term = busca.toLowerCase()
    inscriptions = inscriptions.filter(
      (i: any) =>
        i.nome?.toLowerCase().includes(term) ||
        i.cpf?.includes(term) ||
        i.email?.toLowerCase().includes(term)
    )
  }

  // Check-in status
  const checkinMap: Record<number, boolean> = {}
  if (inscriptions.length > 0) {
    const ids = inscriptions.map((i: any) => i.id)
    const { data: tickets } = await supabase
      .from('tickets')
      .select('inscription_id, checked_in_at')
      .in('inscription_id', ids)
    for (const t of tickets ?? []) {
      if ((t as any).checked_in_at) checkinMap[(t as any).inscription_id] = true
    }
  }

  return (
    <div className="page-enter">
      <div className="mb-10">
        <div className="eyebrow mb-4">
          <span className="dot" />
          PORTAL · INSCRIÇÕES
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
          Inscrições
        </h1>
        <p
          className="mt-3"
          style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
        >
          Visualize todas as inscrições dos seus eventos. Filtre por evento ou
          busque por nome, CPF ou email.
        </p>
      </div>

      {/* Filtros */}
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
              BUSCAR
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
                placeholder="Nome, CPF ou email..."
                className="admin-input w-full pl-9 pr-4 py-3 rounded-xl text-sm"
              />
            </div>
          </label>
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
              <option value="">Todos os eventos</option>
              {events?.map((e: any) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-orange btn-lg">
            Filtrar
          </button>
        </div>
      </form>

      {/* Tabela */}
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
              {inscriptions.length} REGISTROS
            </div>
            <h2
              className="display mt-1"
              style={{ fontSize: 22, letterSpacing: '-0.02em' }}
            >
              Lista de inscrições
            </h2>
          </div>
          {canExport && (
            <a
              href={`/api/parceiro/inscriptions/export${
                eventoFilter || busca
                  ? `?${new URLSearchParams({
                      ...(eventoFilter ? { evento: eventoFilter } : {}),
                      ...(busca ? { busca } : {}),
                    }).toString()}`
                  : ''
              }`}
              className="btn btn-ghost"
            >
              <Download size={14} /> Exportar CSV
            </a>
          )}
        </div>

        {inscriptions.length === 0 && (
          <div
            className="text-center py-16 mono text-[11px] tracking-[0.14em]"
            style={{ color: 'var(--ink-50)' }}
          >
            NENHUMA INSCRIÇÃO ENCONTRADA
          </div>
        )}

        {inscriptions.length > 0 && (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['Nome', 'Email', 'CPF', 'Evento', 'Status', 'Check-in', 'Data'].map((h) => (
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
                {inscriptions.map((insc: any) => {
                  const status = PAYMENT_PILL[insc.payment_status] ?? {
                    bg: 'var(--paper-2)',
                    color: 'var(--ink-50)',
                    label: insc.payment_status?.toUpperCase() ?? '—',
                  }
                  const checked = !!checkinMap[insc.id]
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
                        className="py-4 px-2 max-w-[200px] truncate"
                        style={{ color: 'var(--ink-70)' }}
                        title={insc.email}
                      >
                        {insc.email}
                      </td>
                      <td
                        className="py-4 px-2 mono text-[12px] whitespace-nowrap"
                        style={{ color: 'var(--ink-70)' }}
                      >
                        {formatCPF(insc.cpf)}
                      </td>
                      <td
                        className="py-4 px-2 max-w-[200px] truncate"
                        style={{ color: 'var(--ink-70)' }}
                        title={insc.events?.title ?? ''}
                      >
                        {insc.events?.title ?? '—'}
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
                        {checked ? (
                          <span
                            className="mono inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap"
                            style={{
                              background: 'rgba(166,206,58,0.18)',
                              color: '#3d5a0a',
                            }}
                          >
                            <CheckCircle2 size={10} /> PRESENTE
                          </span>
                        ) : (
                          <span
                            className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap"
                            style={{
                              background: 'var(--paper-2)',
                              color: 'var(--ink-50)',
                            }}
                          >
                            AUSENTE
                          </span>
                        )}
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
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
