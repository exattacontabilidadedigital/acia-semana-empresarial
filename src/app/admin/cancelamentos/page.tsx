'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle, XCircle, RefreshCw, Clock } from 'lucide-react'

interface CancellationRequest {
  id: number
  status: 'pending' | 'approved' | 'rejected' | 'refunded'
  reason: string | null
  admin_notes: string | null
  created_at: string
  resolved_at: string | null
  inscription_id: number
  inscription: {
    order_number: string
    nome: string
    email: string
    telefone: string
    cpf: string
    payment_status: string
    payment_id: string | null
    total_amount: number
    event_id: number
    event: { title: string; event_date: string; start_time: string } | null
  } | null
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const STATUS_LABEL = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  refunded: 'Reembolsado',
} as const

const STATUS_COLOR = {
  pending: 'var(--laranja)',
  approved: 'var(--ciano-600)',
  rejected: 'var(--ink-50)',
  refunded: 'var(--verde-600)',
} as const

export default function AdminCancellationsPage() {
  const [requests, setRequests] = useState<CancellationRequest[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending'>('pending')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/cancellations', { cache: 'no-store' })
      if (!res.ok) {
        setRequests([])
        return
      }
      const json = await res.json()
      setRequests(json.requests || [])
    } catch {
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleResolve = async (
    id: number,
    status: 'approved' | 'rejected' | 'refunded',
    cancelInscription: boolean,
  ) => {
    const notes = window.prompt(
      `Notas internas (opcional) — ${STATUS_LABEL[status]}:`,
      '',
    )
    if (notes === null) return

    try {
      const res = await fetch('/api/admin/cancellations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status,
          admin_notes: notes,
          cancel_inscription: cancelInscription,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Erro ao processar')
        return
      }
      fetchData()
    } catch {
      alert('Erro de conexão')
    }
  }

  const filtered =
    filter === 'pending'
      ? requests?.filter((r) => r.status === 'pending')
      : requests

  return (
    <main className="container-site" style={{ padding: '32px 0' }}>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="eyebrow mb-2">
            <span className="dot" />
            ADMIN
          </div>
          <h1 className="display" style={{ fontSize: 32, letterSpacing: '-.02em' }}>
            Pedidos de cancelamento
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex gap-1 p-1 rounded-full"
            style={{ background: 'var(--paper-2)' }}
          >
            <button
              type="button"
              onClick={() => setFilter('pending')}
              className="px-4 py-2 rounded-full text-xs font-semibold transition-colors"
              style={{
                background: filter === 'pending' ? 'var(--ink)' : 'transparent',
                color: filter === 'pending' ? 'white' : 'var(--ink-70)',
              }}
            >
              Pendentes
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="px-4 py-2 rounded-full text-xs font-semibold transition-colors"
              style={{
                background: filter === 'all' ? 'var(--ink)' : 'transparent',
                color: filter === 'all' ? 'white' : 'var(--ink-70)',
              }}
            >
              Todos
            </button>
          </div>
          <button
            onClick={fetchData}
            className="btn btn-ghost"
            style={{ padding: '8px 14px', fontSize: 12 }}
          >
            <RefreshCw size={13} />
            Atualizar
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-16">
          <Loader2 className="animate-spin mx-auto mb-3" />
        </div>
      )}

      {!loading && (filtered?.length ?? 0) === 0 && (
        <div
          className="rounded-2xl text-center"
          style={{ background: 'white', border: '1px solid var(--line)', padding: '48px 32px' }}
        >
          <CheckCircle size={32} className="mx-auto mb-3" style={{ color: 'var(--ink-50)' }} />
          <p className="text-sm" style={{ color: 'var(--ink-70)' }}>
            Nenhum pedido de cancelamento {filter === 'pending' ? 'pendente' : ''}.
          </p>
        </div>
      )}

      {!loading &&
        filtered?.map((req) => {
          const ins = req.inscription
          return (
            <div
              key={req.id}
              className="rounded-2xl mb-3"
              style={{ background: 'white', border: '1px solid var(--line)', padding: 20 }}
            >
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-sm">{ins?.event?.title || 'Evento'}</span>
                    <span
                      className="mono uppercase tracking-[0.1em] text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${STATUS_COLOR[req.status]}15`,
                        color: STATUS_COLOR[req.status],
                      }}
                    >
                      {STATUS_LABEL[req.status]}
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: 'var(--ink-70)' }}>
                    {ins?.nome} · {ins?.email} · {ins?.telefone || '—'}
                  </div>
                  <div
                    className="text-[11px] mono mt-1"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    Pedido {ins?.order_number} · {formatCurrency(Number(ins?.total_amount ?? 0))}
                    {ins?.payment_id ? ` · Asaas ${ins.payment_id}` : ''}
                  </div>
                </div>
                <div className="text-[11px]" style={{ color: 'var(--ink-50)' }}>
                  <Clock size={11} className="inline mr-1" />
                  {formatDate(req.created_at)}
                </div>
              </div>

              {req.reason && (
                <div
                  className="rounded-lg p-3 text-sm mb-3"
                  style={{ background: 'var(--paper-2)', color: 'var(--ink-70)' }}
                >
                  <div className="mono text-[10px] tracking-[0.1em] mb-1" style={{ color: 'var(--ink-50)' }}>
                    MOTIVO INFORMADO
                  </div>
                  {req.reason}
                </div>
              )}

              {req.admin_notes && (
                <div className="text-xs mb-3" style={{ color: 'var(--ink-70)' }}>
                  <strong>Notas internas:</strong> {req.admin_notes}
                </div>
              )}

              {req.status === 'pending' && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleResolve(req.id, 'refunded', true)}
                    className="btn btn-primary"
                    style={{ padding: '8px 14px', fontSize: 12 }}
                    title="Marcar como reembolsado e cancelar inscrição"
                  >
                    <CheckCircle size={13} />
                    Reembolsado + cancelar inscrição
                  </button>
                  <button
                    onClick={() => handleResolve(req.id, 'approved', true)}
                    className="btn btn-ghost"
                    style={{ padding: '8px 14px', fontSize: 12 }}
                    title="Aprovar (sem reembolso) e cancelar inscrição"
                  >
                    Aprovar + cancelar
                  </button>
                  <button
                    onClick={() => handleResolve(req.id, 'rejected', false)}
                    className="text-xs px-3 py-2"
                    style={{ color: '#dc2626' }}
                  >
                    <XCircle size={13} className="inline mr-1" />
                    Rejeitar
                  </button>
                </div>
              )}
            </div>
          )
        })}
    </main>
  )
}
