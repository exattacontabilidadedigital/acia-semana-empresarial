import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { CheckCircle, XOctagon, RefreshCw } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePermission } from '@/lib/permissions'
import { formatCurrency, formatDateShort } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const STATUS_PILL: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: 'rgba(248,130,30,0.15)', color: '#b85d00', label: 'PENDENTE' },
  approved: { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a', label: 'APROVADO' },
  rejected: { bg: '#fee2e2', color: '#991b1b', label: 'REJEITADO' },
  refunded: { bg: 'rgba(86,198,208,0.18)', color: '#0a4650', label: 'REEMBOLSADO' },
}

async function decideAction(formData: FormData) {
  'use server'
  const org = await requirePermission('manage_cancellations')
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const requestId = Number(formData.get('request_id'))
  const decision = String(formData.get('decision'))
  const notes = String(formData.get('notes') ?? '').trim()

  if (!requestId || !['approved', 'rejected', 'refunded'].includes(decision)) {
    redirect(
      `/parceiro/cancelamentos?error=${encodeURIComponent('Decisão inválida.')}`
    )
  }

  const admin = createAdminClient()

  // Carrega pedido + valida que pertence à org ativa (segunda linha de defesa
  // além da RLS).
  const { data: requestRow } = await admin
    .from('cancellation_requests')
    .select(
      'id, status, inscription_id, inscriptions:inscription_id ( event_id, events:event_id ( organization_id ) )'
    )
    .eq('id', requestId)
    .maybeSingle()

  const eventOrgId = (requestRow as any)?.inscriptions?.events?.organization_id
  if (!requestRow || eventOrgId !== org.id) {
    redirect(
      `/parceiro/cancelamentos?error=${encodeURIComponent('Pedido não encontrado.')}`
    )
  }

  if (requestRow.status !== 'pending') {
    redirect(
      `/parceiro/cancelamentos?error=${encodeURIComponent('Este pedido já foi resolvido.')}`
    )
  }

  await admin
    .from('cancellation_requests')
    .update({
      status: decision,
      admin_notes: notes || null,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (decision === 'approved' || decision === 'refunded') {
    await admin
      .from('inscriptions')
      .update({ payment_status: 'cancelled' })
      .eq('id', requestRow.inscription_id)

    await admin
      .from('tickets')
      .update({ status: 'cancelled' })
      .eq('inscription_id', requestRow.inscription_id)
      .eq('status', 'active')
  }

  revalidatePath('/parceiro/cancelamentos')
  redirect('/parceiro/cancelamentos?ok=1')
}

export default async function ParceiroCancelamentosPage({
  searchParams,
}: {
  searchParams: { error?: string; ok?: string }
}) {
  const org = await requirePermission('manage_cancellations')
  const supabase = createServerSupabaseClient()

  const { data: events } = await supabase
    .from('events')
    .select('id')
    .eq('organization_id', org.id)
  const eventIds = (events ?? []).map((e: any) => e.id)

  let requests: any[] = []
  if (eventIds.length > 0) {
    const { data } = await supabase
      .from('cancellation_requests')
      .select(
        `
        id, status, reason, admin_notes, created_at, resolved_at,
        inscriptions:inscription_id (
          id, order_number, nome, email, total_amount, payment_id, event_id,
          events:event_id ( id, title, event_date )
        )
      `
      )
      .order('created_at', { ascending: false })
      .limit(500)

    requests = (data ?? []).filter(
      (r: any) => r.inscriptions?.event_id && eventIds.includes(r.inscriptions.event_id)
    )
  }

  const pending = requests.filter((r) => r.status === 'pending')
  const resolved = requests.filter((r) => r.status !== 'pending')

  return (
    <div className="page-enter">
      <div className="mb-10">
        <div className="eyebrow mb-4">
          <span className="dot" />
          PORTAL · CANCELAMENTOS
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
          Pedidos de cancelamento
        </h1>
        <p
          className="mt-3"
          style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
        >
          Aprove, rejeite ou marque como reembolsado os pedidos de cancelamento
          dos inscritos nos eventos de{' '}
          <strong style={{ color: 'var(--ink)' }}>{org.name}</strong>.
        </p>
      </div>

      {searchParams.error && <Banner color="error">{searchParams.error}</Banner>}
      {searchParams.ok && (
        <Banner color="success">Pedido atualizado com sucesso.</Banner>
      )}

      {/* Pendentes */}
      <Card className="mb-5">
        <SectionTitle eyebrow={`${pending.length} PENDENTES`} title="Aguardando decisão" />
        {pending.length === 0 ? (
          <Empty>NENHUM PEDIDO PENDENTE</Empty>
        ) : (
          <div className="space-y-3 mt-5">
            {pending.map((r: any) => (
              <RequestRow key={r.id} request={r} editable />
            ))}
          </div>
        )}
      </Card>

      {/* Resolvidos */}
      <Card>
        <SectionTitle eyebrow={`${resolved.length} HISTÓRICO`} title="Pedidos resolvidos" />
        {resolved.length === 0 ? (
          <Empty>NENHUM PEDIDO RESOLVIDO AINDA</Empty>
        ) : (
          <div className="space-y-3 mt-5">
            {resolved.slice(0, 30).map((r: any) => (
              <RequestRow key={r.id} request={r} editable={false} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function RequestRow({
  request,
  editable,
}: {
  request: any
  editable: boolean
}) {
  const ins = request.inscriptions ?? {}
  const ev = ins.events ?? {}
  const status = STATUS_PILL[request.status] ?? {
    bg: 'var(--paper-2)',
    color: 'var(--ink-50)',
    label: String(request.status ?? '').toUpperCase(),
  }
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'var(--paper)',
        border: '1px solid var(--line)',
      }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="min-w-0">
          <div className="font-medium" style={{ color: 'var(--ink)' }}>
            {ins.nome ?? '—'}{' '}
            <span className="mono text-[11px]" style={{ color: 'var(--ink-50)' }}>
              · {ins.order_number}
            </span>
          </div>
          <div className="text-[12px]" style={{ color: 'var(--ink-70)' }}>
            {ev.title ?? '—'}
            {ev.event_date && (
              <span style={{ color: 'var(--ink-50)' }}>
                {' '}
                · {formatDateShort(ev.event_date)}
              </span>
            )}
          </div>
          <div
            className="mono text-[11px] mt-1"
            style={{ color: 'var(--ink-50)' }}
          >
            {ins.email} · {formatCurrency(Number(ins.total_amount ?? 0))}
            {ins.payment_id && ` · Asaas: ${ins.payment_id}`}
          </div>
        </div>
        <span
          className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap"
          style={{ background: status.bg, color: status.color }}
        >
          {status.label}
        </span>
      </div>
      {request.reason && (
        <div
          className="text-[13px] p-3 rounded-lg mb-3"
          style={{ background: 'white', border: '1px solid var(--line)', color: 'var(--ink-70)' }}
        >
          <span
            className="mono text-[10px] tracking-[0.1em] block mb-1"
            style={{ color: 'var(--ink-50)' }}
          >
            MOTIVO
          </span>
          {request.reason}
        </div>
      )}
      {request.admin_notes && !editable && (
        <div
          className="text-[12px] mt-2"
          style={{ color: 'var(--ink-70)' }}
        >
          <span
            className="mono text-[10px] tracking-[0.1em]"
            style={{ color: 'var(--ink-50)' }}
          >
            NOTA INTERNA:{' '}
          </span>
          {request.admin_notes}
        </div>
      )}
      {editable && (
        <form action={decideAction} className="grid sm:grid-cols-[1fr_auto] gap-3 items-end mt-3">
          <input type="hidden" name="request_id" value={request.id} />
          <textarea
            name="notes"
            rows={2}
            placeholder="Notas internas (opcional)"
            className="admin-input w-full px-4 py-2 rounded-xl text-sm"
          />
          <div className="flex gap-2 flex-wrap">
            <button
              type="submit"
              name="decision"
              value="approved"
              className="btn btn-ghost"
              style={{ color: '#3d5a0a' }}
            >
              <CheckCircle size={14} /> Aprovar
            </button>
            <button
              type="submit"
              name="decision"
              value="refunded"
              className="btn btn-ghost"
              style={{ color: '#0a4650' }}
            >
              <RefreshCw size={14} /> Reembolsado
            </button>
            <button
              type="submit"
              name="decision"
              value="rejected"
              className="btn btn-ghost"
              style={{ color: '#991b1b' }}
            >
              <XOctagon size={14} /> Rejeitar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-[20px] bg-white p-7 ${className}`}
      style={{ border: '1px solid var(--line)' }}
    >
      {children}
    </div>
  )
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div
        className="mono text-[10px] tracking-[0.14em]"
        style={{ color: 'var(--ink-50)' }}
      >
        {eyebrow}
      </div>
      <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
        {title}
      </h2>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-center py-10 mt-5 mono text-[11px] tracking-[0.14em]"
      style={{ color: 'var(--ink-50)' }}
    >
      {children}
    </div>
  )
}

function Banner({
  color,
  children,
}: {
  color: 'success' | 'error'
  children: React.ReactNode
}) {
  const styles =
    color === 'success'
      ? {
          bg: 'rgba(166,206,58,0.10)',
          border: '1px solid rgba(166,206,58,0.4)',
          color: '#3d5a0a',
        }
      : { bg: '#fff1f2', border: '1px solid #fecdd3', color: '#b91c1c' }
  return (
    <div
      className="mb-6 p-3 rounded-xl text-sm"
      style={{ background: styles.bg, border: styles.border, color: styles.color }}
    >
      {children}
    </div>
  )
}
