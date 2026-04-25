'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import {
  Award,
  Mail,
  Eye,
  RefreshCw,
  XCircle,
  Loader2,
  Send,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import Pagination from '@/components/ui/Pagination'

const PAGE_SIZE = 20

type EventOption = {
  id: number
  title: string
  event_date: string
  status: string
  duration_hours: number | null
}

type EligibleRow = {
  ticket_id: string
  inscription_id: number
  event_id: number
  event_title: string
  event_date: string
  participant_name: string
  participant_cpf: string
  participant_email: string
  checked_in_at: string
  certificate_id: number | null
  verification_code: string | null
  issued_at: string | null
  email_sent_at: string | null
  revoked_at: string | null
}

function formatDateBr(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function CertificadosClient({
  events,
  selectedEventId,
  eligible,
}: {
  events: EventOption[]
  selectedEventId: number | null
  eligible: EligibleRow[]
}) {
  const router = useRouter()
  const [pendingTickets, setPendingTickets] = useState<Record<string, boolean>>({})
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkResult, setBulkResult] = useState<{
    ok: number
    fail: number
  } | null>(null)
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)

  // Página atual da listagem (mantém seleção entre páginas)
  const totalPages = Math.max(1, Math.ceil(eligible.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pagedEligible = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return eligible.slice(start, start + PAGE_SIZE)
  }, [eligible, safePage])

  function toggleSelected(ticketId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(ticketId)) next.delete(ticketId)
      else next.add(ticketId)
      return next
    })
  }

  // Marca/desmarca todos os da PÁGINA ATUAL (preserva seleções de outras páginas)
  function togglePage() {
    const pageIds = pagedEligible.map((e) => e.ticket_id)
    const allOnPageSelected = pageIds.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) {
        for (const id of pageIds) next.delete(id)
      } else {
        for (const id of pageIds) next.add(id)
      }
      return next
    })
  }

  function selectAllElegiveis() {
    setSelected(new Set(eligible.map((e) => e.ticket_id)))
  }

  function changeEvent(id: string) {
    if (id) router.push(`/admin/certificados?event_id=${id}`)
    else router.push('/admin/certificados')
  }

  async function issueOne(ticketId: string) {
    setPendingTickets((p) => ({ ...p, [ticketId]: true }))
    try {
      await fetch('/api/admin/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_ids: [ticketId] }),
      })
      router.refresh()
    } finally {
      setPendingTickets((p) => ({ ...p, [ticketId]: false }))
    }
  }

  async function sendOne(ticketId: string) {
    setPendingTickets((p) => ({ ...p, [ticketId]: true }))
    try {
      await fetch('/api/admin/certificates/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId }),
      })
      router.refresh()
    } finally {
      setPendingTickets((p) => ({ ...p, [ticketId]: false }))
    }
  }

  async function regenerate(certId: number, ticketId: string) {
    if (!confirm('Apagar PDF salvo e regenerar na próxima visualização?')) return
    setPendingTickets((p) => ({ ...p, [ticketId]: true }))
    try {
      await fetch(`/api/admin/certificates/${certId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate' }),
      })
      router.refresh()
    } finally {
      setPendingTickets((p) => ({ ...p, [ticketId]: false }))
    }
  }

  async function revoke(certId: number, ticketId: string) {
    const reason = prompt('Motivo da revogação?')
    if (reason === null) return
    setPendingTickets((p) => ({ ...p, [ticketId]: true }))
    try {
      await fetch(`/api/admin/certificates/${certId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke', reason }),
      })
      router.refresh()
    } finally {
      setPendingTickets((p) => ({ ...p, [ticketId]: false }))
    }
  }

  async function viewPdf(certId: number) {
    const r = await fetch(`/api/admin/certificates/${certId}`)
    if (!r.ok) {
      alert('Falha ao gerar URL')
      return
    }
    const data = await r.json()
    if (data.url) window.open(data.url, '_blank')
  }

  async function sendBulk(payload: { event_id?: number; ticket_ids?: string[] }) {
    const total =
      payload.ticket_ids?.length ??
      (payload.event_id ? eligible.length : 0)
    if (total === 0) return
    if (
      !confirm(
        `Emitir e enviar certificado por email pra ${total} participante${total > 1 ? 's' : ''}? Pode demorar alguns minutos.`
      )
    )
      return

    setBulkSending(true)
    setBulkResult(null)
    try {
      const r = await fetch('/api/admin/certificates/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await r.json()
      const items = (data.results ?? []) as { ok: boolean }[]
      setBulkResult({
        ok: items.filter((x) => x.ok).length,
        fail: items.filter((x) => !x.ok).length,
      })
      setSelected(new Set())
      router.refresh()
    } finally {
      setBulkSending(false)
    }
  }

  async function sendBulkAll() {
    if (!selectedEventId) return
    await sendBulk({ event_id: selectedEventId })
  }

  async function sendBulkSelected() {
    if (selected.size === 0) return
    await sendBulk({ ticket_ids: Array.from(selected) })
  }

  const issuedCount = eligible.filter((r) => r.certificate_id).length
  const sentCount = eligible.filter((r) => r.email_sent_at).length

  return (
    <>
      <div
        className="rounded-2xl bg-white p-6 mb-6 flex items-end gap-4 flex-wrap"
        style={{ border: '1px solid var(--line)' }}
      >
        <div className="flex-1 min-w-[280px]">
          <label
            className="mono block text-[10px] tracking-[0.1em] mb-2"
            style={{ color: 'var(--ink-50)' }}
          >
            EVENTO ENCERRADO
          </label>
          <select
            value={selectedEventId ?? ''}
            onChange={(e) => changeEvent(e.target.value)}
            className="admin-select w-full px-4 py-3 rounded-xl text-sm"
          >
            <option value="">— selecione um evento —</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {formatDateBr(e.event_date)} · {e.title}
                {e.status === 'finalizado' ? ' (finalizado)' : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedEventId && (
          <button
            type="button"
            onClick={sendBulkAll}
            disabled={bulkSending || eligible.length === 0}
            className="btn btn-orange btn-lg"
            style={
              bulkSending || eligible.length === 0
                ? { opacity: 0.6, pointerEvents: 'none' }
                : undefined
            }
          >
            {bulkSending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send size={14} />
                Emitir e enviar pra todos
              </>
            )}
          </button>
        )}
      </div>

      {bulkResult && (
        <div
          className="rounded-xl mb-5 p-4 flex items-center gap-3"
          style={{
            background:
              bulkResult.fail === 0
                ? 'rgba(166,206,58,0.10)'
                : 'rgba(248,130,30,0.10)',
            border:
              bulkResult.fail === 0
                ? '1px solid rgba(166,206,58,0.4)'
                : '1px solid rgba(248,130,30,0.4)',
          }}
        >
          {bulkResult.fail === 0 ? (
            <CheckCircle2 size={18} style={{ color: 'var(--verde-600)' }} />
          ) : (
            <AlertCircle size={18} style={{ color: 'var(--laranja)' }} />
          )}
          <span style={{ fontSize: 14 }}>
            {bulkResult.ok} enviado(s)
            {bulkResult.fail > 0 && ` · ${bulkResult.fail} falha(s)`}
          </span>
        </div>
      )}

      {!selectedEventId ? (
        <div
          className="rounded-2xl bg-white text-center py-16"
          style={{ border: '1px solid var(--line)', color: 'var(--ink-50)' }}
        >
          <Award size={28} className="mx-auto mb-3" />
          <div className="mono text-[11px] tracking-[0.14em]">
            SELECIONE UM EVENTO PRA VER OS ELEGÍVEIS
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3 mb-5">
            <Stat label="ELEGÍVEIS" value={eligible.length} accent="var(--azul)" />
            <Stat
              label="EMITIDOS"
              value={issuedCount}
              accent="var(--ciano-600)"
            />
            <Stat
              label="EMAIL ENVIADO"
              value={sentCount}
              accent="var(--verde-600)"
            />
          </div>

          {/* Barra de ações da seleção — visível quando ao menos um marcado */}
          {selected.size > 0 && (
            <div
              className="rounded-xl mb-3 p-3 flex items-center justify-between gap-3 flex-wrap"
              style={{
                background: 'rgba(43,46,141,0.06)',
                border: '1px solid rgba(43,46,141,0.3)',
              }}
            >
              <div
                className="mono text-[11px] tracking-[0.1em] flex items-center gap-3 flex-wrap"
                style={{ color: 'var(--ink)' }}
              >
                <span>{selected.size} SELECIONADO{selected.size > 1 ? 'S' : ''}</span>
                {selected.size < eligible.length && (
                  <button
                    type="button"
                    onClick={selectAllElegiveis}
                    className="mono text-[10px] tracking-[0.08em] underline"
                    style={{ color: 'var(--azul)' }}
                  >
                    SELECIONAR TODOS OS {eligible.length} ELEGÍVEIS
                  </button>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="btn btn-ghost"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  Limpar seleção
                </button>
                <button
                  type="button"
                  onClick={sendBulkSelected}
                  disabled={bulkSending}
                  className="btn btn-orange"
                  style={
                    bulkSending
                      ? { opacity: 0.6, pointerEvents: 'none', padding: '6px 14px', fontSize: 12 }
                      : { padding: '6px 14px', fontSize: 12 }
                  }
                >
                  {bulkSending ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send size={12} />
                      Emitir e enviar selecionados ({selected.size})
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div
            className="rounded-[20px] bg-white p-4"
            style={{ border: '1px solid var(--line)' }}
          >
            {eligible.length === 0 ? (
              <div
                className="text-center py-12"
                style={{ color: 'var(--ink-50)' }}
              >
                <Award size={28} className="mx-auto mb-3" />
                <div className="mono text-[11px] tracking-[0.14em]">
                  NENHUM PARTICIPANTE FEZ CHECK-IN NESTE EVENTO
                </div>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    <th
                      className="py-3 px-2 w-8"
                      style={{ color: 'var(--ink-50)' }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          pagedEligible.length > 0 &&
                          pagedEligible.every((r) => selected.has(r.ticket_id))
                        }
                        ref={(el) => {
                          if (el) {
                            const onPage = pagedEligible.filter((r) =>
                              selected.has(r.ticket_id)
                            ).length
                            el.indeterminate =
                              onPage > 0 && onPage < pagedEligible.length
                          }
                        }}
                        onChange={togglePage}
                        className="cursor-pointer"
                        title="Selecionar todos da página"
                      />
                    </th>
                    {['Participante', 'Email', 'Check-in', 'Status', ''].map((h) => (
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
                  {pagedEligible.map((row) => (
                    <tr
                      key={row.ticket_id}
                      style={{
                        borderBottom: '1px solid var(--line)',
                        background: selected.has(row.ticket_id)
                          ? 'rgba(43,46,141,0.04)'
                          : undefined,
                      }}
                    >
                      <td className="py-3 px-2">
                        <input
                          type="checkbox"
                          checked={selected.has(row.ticket_id)}
                          onChange={() => toggleSelected(row.ticket_id)}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-2">
                        <div
                          className="font-semibold"
                          style={{ color: 'var(--ink)' }}
                        >
                          {row.participant_name}
                        </div>
                        {row.verification_code && (
                          <div
                            className="mono text-[10px] mt-0.5"
                            style={{ color: 'var(--ink-50)' }}
                          >
                            {row.verification_code}
                          </div>
                        )}
                      </td>
                      <td
                        className="py-3 px-2 text-xs"
                        style={{ color: 'var(--ink-70)' }}
                      >
                        {row.participant_email}
                      </td>
                      <td
                        className="py-3 px-2 mono text-[11px] whitespace-nowrap"
                        style={{ color: 'var(--ink-70)' }}
                      >
                        {formatDateBr(row.checked_in_at)}
                      </td>
                      <td className="py-3 px-2">
                        {row.revoked_at ? (
                          <Pill bg="#fee2e2" color="#991b1b" label="REVOGADO" />
                        ) : row.email_sent_at ? (
                          <Pill
                            bg="rgba(166,206,58,0.18)"
                            color="#3d5a0a"
                            label="ENVIADO"
                          />
                        ) : row.certificate_id ? (
                          <Pill
                            bg="rgba(43,46,141,0.12)"
                            color="#2b2e8d"
                            label="EMITIDO"
                          />
                        ) : (
                          <Pill
                            bg="var(--paper-2)"
                            color="var(--ink-50)"
                            label="PENDENTE"
                          />
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          {!row.certificate_id && !row.revoked_at && (
                            <ActionBtn
                              icon={<Award size={12} />}
                              label="Emitir"
                              loading={pendingTickets[row.ticket_id]}
                              onClick={() => issueOne(row.ticket_id)}
                            />
                          )}
                          {row.certificate_id && !row.revoked_at && (
                            <>
                              <ActionBtn
                                icon={<Eye size={12} />}
                                label="Ver"
                                onClick={() => viewPdf(row.certificate_id!)}
                              />
                              <ActionBtn
                                icon={<Mail size={12} />}
                                label={row.email_sent_at ? 'Reenviar' : 'Enviar'}
                                loading={pendingTickets[row.ticket_id]}
                                onClick={() => sendOne(row.ticket_id)}
                              />
                              <ActionBtn
                                icon={<RefreshCw size={12} />}
                                label="Regerar"
                                loading={pendingTickets[row.ticket_id]}
                                onClick={() =>
                                  regenerate(row.certificate_id!, row.ticket_id)
                                }
                              />
                              <ActionBtn
                                icon={<XCircle size={12} />}
                                label="Revogar"
                                danger
                                loading={pendingTickets[row.ticket_id]}
                                onClick={() =>
                                  revoke(row.certificate_id!, row.ticket_id)
                                }
                              />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {totalPages > 1 && (
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                totalItems={eligible.length}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        </>
      )}
    </>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: string
}) {
  return (
    <div
      className="rounded-2xl bg-white p-4"
      style={{ border: '1px solid var(--line)' }}
    >
      <div
        className="mono text-[10px] tracking-[0.14em]"
        style={{ color: 'var(--ink-50)' }}
      >
        {label}
      </div>
      <div
        className="display mt-1"
        style={{ fontSize: 28, color: accent, letterSpacing: '-0.02em' }}
      >
        {value}
      </div>
    </div>
  )
}

function Pill({
  bg,
  color,
  label,
}: {
  bg: string
  color: string
  label: string
}) {
  return (
    <span
      className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  )
}

function ActionBtn({
  icon,
  label,
  loading,
  danger,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  loading?: boolean
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="mono text-[10px] tracking-[0.06em] inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors"
      style={{
        background: 'white',
        border: '1px solid var(--line)',
        color: danger ? '#b91c1c' : 'var(--ink-70)',
        opacity: loading ? 0.5 : 1,
      }}
    >
      {loading ? <Loader2 size={11} className="animate-spin" /> : icon}
      {label.toUpperCase()}
    </button>
  )
}
