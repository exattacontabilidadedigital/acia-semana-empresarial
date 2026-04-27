import { CreditCard } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions'
import { formatDateShort, formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const STATUS_PILL: Record<string, { bg: string; color: string; label: string }> = {
  CONFIRMED: { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a', label: 'CONFIRMADO' },
  RECEIVED: { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a', label: 'RECEBIDO' },
  RECEIVED_IN_CASH: { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a', label: 'EM DINHEIRO' },
  PENDING: { bg: 'rgba(248,130,30,0.15)', color: '#b85d00', label: 'PENDENTE' },
  OVERDUE: { bg: '#fee2e2', color: '#991b1b', label: 'VENCIDO' },
  REFUNDED: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'ESTORNADO' },
  REFUND_REQUESTED: { bg: 'rgba(86,198,208,0.18)', color: '#0a4650', label: 'EM ANÁLISE' },
  CHARGEBACK_REQUESTED: { bg: '#fee2e2', color: '#991b1b', label: 'CHARGEBACK' },
  CANCELLED: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'CANCELADO' },
}

export default async function ParceiroPagamentosPage({
  searchParams,
}: {
  searchParams: { evento?: string }
}) {
  const org = await requirePermission('view_payments')
  const supabase = createServerSupabaseClient()

  const eventoFilter = searchParams.evento ?? ''

  const { data: events } = await supabase
    .from('events')
    .select('id, title')
    .eq('organization_id', org.id)
    .order('title')

  const eventIds = (events ?? []).map((e: any) => e.id)

  let logs: any[] = []
  if (eventIds.length > 0) {
    let query = supabase
      .from('payment_logs')
      .select(
        `
        id, status, payment_id, created_at,
        inscriptions:inscription_id (
          id, nome, email, total_amount, payment_status, event_id,
          events:event_id ( id, title )
        )
      `
      )
      .order('created_at', { ascending: false })
      .limit(500)

    const { data } = await query
    logs = (data ?? []).filter((row: any) => {
      const eventId = row.inscriptions?.event_id
      if (!eventId || !eventIds.includes(eventId)) return false
      if (eventoFilter) {
        const id = parseInt(eventoFilter, 10)
        if (!isNaN(id) && id !== eventId) return false
      }
      return true
    })
  }

  const totals = logs.reduce(
    (acc, log) => {
      const status = String(log.status ?? '').toUpperCase()
      const amount = Number(log.inscriptions?.total_amount ?? 0)
      if (['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(status)) {
        acc.confirmed += amount
        acc.confirmedCount += 1
      } else if (status === 'PENDING') {
        acc.pending += amount
        acc.pendingCount += 1
      }
      return acc
    },
    { confirmed: 0, pending: 0, confirmedCount: 0, pendingCount: 0 }
  )

  return (
    <div className="page-enter">
      <div className="mb-10">
        <div className="eyebrow mb-4">
          <span className="dot" />
          PORTAL · PAGAMENTOS
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
          Pagamentos
        </h1>
        <p
          className="mt-3"
          style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
        >
          Histórico de cobranças e atualizações de status dos eventos da{' '}
          <strong style={{ color: 'var(--ink)' }}>{org.name}</strong>. Os dados
          vêm direto do Asaas via webhook.
        </p>
      </div>

      {/* Totais */}
      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <Stat
          label="CONFIRMADO"
          value={formatCurrency(totals.confirmed)}
          hint={`${totals.confirmedCount} cobranças`}
          color="var(--verde)"
        />
        <Stat
          label="PENDENTE"
          value={formatCurrency(totals.pending)}
          hint={`${totals.pendingCount} cobranças`}
          color="var(--laranja)"
        />
      </div>

      {/* Filtro */}
      <form
        method="GET"
        className="rounded-[20px] bg-white p-5 mb-5"
        style={{ border: '1px solid var(--line)' }}
      >
        <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-end">
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
              {logs.length} REGISTROS
            </div>
            <h2
              className="display mt-1"
              style={{ fontSize: 22, letterSpacing: '-0.02em' }}
            >
              Histórico de cobranças
            </h2>
          </div>
        </div>

        {logs.length === 0 && (
          <div
            className="text-center py-16 mono text-[11px] tracking-[0.14em]"
            style={{ color: 'var(--ink-50)' }}
          >
            NENHUM PAGAMENTO REGISTRADO AINDA
          </div>
        )}

        {logs.length > 0 && (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['Inscrito', 'Evento', 'Valor', 'Status', 'Asaas ID', 'Data'].map((h) => (
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
                {logs.map((log: any) => {
                  const statusKey = String(log.status ?? '').toUpperCase()
                  const status = STATUS_PILL[statusKey] ?? {
                    bg: 'var(--paper-2)',
                    color: 'var(--ink-50)',
                    label: statusKey || '—',
                  }
                  const ins = log.inscriptions ?? {}
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td
                        className="py-4 px-2 max-w-[200px] truncate"
                        style={{ color: 'var(--ink)' }}
                        title={ins.nome ?? ''}
                      >
                        <div className="font-medium">{ins.nome ?? '—'}</div>
                        <div className="text-[11px]" style={{ color: 'var(--ink-50)' }}>
                          {ins.email ?? '—'}
                        </div>
                      </td>
                      <td
                        className="py-4 px-2 max-w-[200px] truncate"
                        style={{ color: 'var(--ink-70)' }}
                        title={ins.events?.title ?? ''}
                      >
                        {ins.events?.title ?? '—'}
                      </td>
                      <td
                        className="py-4 px-2 mono text-[12px] whitespace-nowrap"
                        style={{ color: 'var(--ink)' }}
                      >
                        {formatCurrency(Number(ins.total_amount ?? 0))}
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
                        className="py-4 px-2 mono text-[11px] whitespace-nowrap truncate max-w-[160px]"
                        style={{ color: 'var(--ink-50)' }}
                        title={log.payment_id ?? ''}
                      >
                        {log.payment_id ?? '—'}
                      </td>
                      <td
                        className="py-4 px-2 mono text-[11px] whitespace-nowrap"
                        style={{ color: 'var(--ink-50)' }}
                      >
                        {formatDateShort(log.created_at)}
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

function Stat({
  label,
  value,
  hint,
  color,
}: {
  label: string
  value: string
  hint: string
  color: string
}) {
  return (
    <div
      className="rounded-[20px] bg-white p-5"
      style={{ border: '1px solid var(--line)' }}
    >
      <div
        className="mono text-[10px] tracking-[0.14em] flex items-center gap-2"
        style={{ color: 'var(--ink-50)' }}
      >
        <CreditCard size={12} style={{ color }} /> {label}
      </div>
      <div
        className="display mt-2"
        style={{ fontSize: 28, letterSpacing: '-0.02em' }}
      >
        {value}
      </div>
      <div className="mono text-[11px] mt-1" style={{ color: 'var(--ink-50)' }}>
        {hint}
      </div>
    </div>
  )
}
