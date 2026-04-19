'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Search,
  Clock,
  CheckCircle,
  Ticket,
  AlertCircle,
  Loader2,
  ExternalLink,
  XCircle,
  Mail,
  ArrowRight,
} from 'lucide-react'
import { formatCurrency, formatDate, formatCPF } from '@/lib/utils'

interface InscriptionEvent {
  title: string
  event_date: string
  start_time: string
  location: string | null
}

interface InscriptionItem {
  id: number
  order_number: string
  nome: string
  email: string
  quantity: number
  total_amount: number
  payment_status: string
  payment_url: string | null
  payment_id: string | null
  created_at: string
  event_id: number
  events: InscriptionEvent
}

type ActionState = { [orderNumber: string]: boolean }

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  background: 'var(--paper)',
  border: '1px solid var(--line)',
  borderRadius: 10,
  fontSize: 15,
  fontFamily: 'inherit',
}

function statusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Pendente'
    case 'confirmed':
      return 'Confirmada'
    case 'free':
      return 'Gratuita'
    case 'cancelled':
      return 'Cancelada'
    default:
      return status
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'pending':
      return 'var(--laranja)'
    case 'confirmed':
      return 'var(--verde-600)'
    case 'free':
      return 'var(--ciano-600)'
    case 'cancelled':
      return 'var(--ink-50)'
    default:
      return 'var(--ink-50)'
  }
}

export default function InscricoesPage() {
  const [cpf, setCpf] = useState('')
  const [inscriptions, setInscriptions] = useState<InscriptionItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retrying, setRetrying] = useState<ActionState>({})
  const [cancelling, setCancelling] = useState<ActionState>({})
  const [sendingReminder, setSendingReminder] = useState<ActionState>({})

  const maskCPF = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCPF(e.target.value)
    setCpf(masked)
    const digits = masked.replace(/\D/g, '')
    if (digits.length === 11) {
      fetchInscriptions(digits)
    } else {
      setInscriptions(null)
      setError('')
    }
  }

  const fetchInscriptions = useCallback(async (cpfDigits: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/inscriptions/by-cpf?cpf=${cpfDigits}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao buscar inscrições')
        setInscriptions(null)
        return
      }
      setInscriptions(data.inscriptions)
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setInscriptions(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleRetry = async (orderNumber: string) => {
    const cpfDigits = cpf.replace(/\D/g, '')
    setRetrying((prev) => ({ ...prev, [orderNumber]: true }))
    try {
      const res = await fetch('/api/payments/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: orderNumber, cpf: cpfDigits }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Erro ao gerar novo link de pagamento')
        return
      }
      if (data.payment_url) {
        window.open(data.payment_url, '_blank')
        fetchInscriptions(cpfDigits)
      }
    } catch {
      alert('Erro de conexão. Tente novamente.')
    } finally {
      setRetrying((prev) => ({ ...prev, [orderNumber]: false }))
    }
  }

  const handleCancel = async (orderNumber: string) => {
    if (
      !confirm('Tem certeza que deseja cancelar esta inscrição? Esta ação não pode ser desfeita.')
    )
      return
    const cpfDigits = cpf.replace(/\D/g, '')
    setCancelling((prev) => ({ ...prev, [orderNumber]: true }))
    try {
      const res = await fetch('/api/inscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: orderNumber, cpf: cpfDigits }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Erro ao cancelar inscrição')
        return
      }
      fetchInscriptions(cpfDigits)
    } catch {
      alert('Erro de conexão. Tente novamente.')
    } finally {
      setCancelling((prev) => ({ ...prev, [orderNumber]: false }))
    }
  }

  const handleSendReminder = async (orderNumber: string) => {
    setSendingReminder((prev) => ({ ...prev, [orderNumber]: true }))
    try {
      const res = await fetch('/api/email/pending-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: orderNumber }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Erro ao enviar lembrete')
        return
      }
      alert('Lembrete enviado para o email cadastrado!')
    } catch {
      alert('Erro de conexão. Tente novamente.')
    } finally {
      setSendingReminder((prev) => ({ ...prev, [orderNumber]: false }))
    }
  }

  const pending = inscriptions?.filter((i) => i.payment_status === 'pending') || []
  const confirmed = inscriptions?.filter((i) => i.payment_status === 'confirmed') || []
  const free = inscriptions?.filter((i) => i.payment_status === 'free') || []

  const renderCard = (item: InscriptionItem) => (
    <div
      key={item.id}
      className="bg-white border border-line rounded-2xl"
      style={{ padding: 24 }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3
          className="display"
          style={{ fontSize: 18, letterSpacing: '-.02em', lineHeight: 1.2 }}
        >
          {item.events.title}
        </h3>
        <span
          className="mono uppercase tracking-[0.1em] text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
          style={{
            background: `${statusColor(item.payment_status)}15`,
            color: statusColor(item.payment_status),
          }}
        >
          {statusLabel(item.payment_status)}
        </span>
      </div>

      <div className="text-xs space-y-1 mb-4" style={{ color: 'var(--ink-70)' }}>
        <p>
          {formatDate(item.events.event_date)} • {item.events.start_time?.slice(0, 5)}
        </p>
        {item.events.location && <p>{item.events.location}</p>}
        <p>
          {item.quantity} ingresso{item.quantity > 1 ? 's' : ''} •{' '}
          {item.total_amount > 0 ? formatCurrency(item.total_amount) : 'Gratuito'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {item.payment_status === 'pending' && (
          <>
            {item.payment_url ? (
              <a
                href={item.payment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-orange"
                style={{ padding: '8px 14px', fontSize: 12 }}
              >
                <ExternalLink size={13} />
                Pagar agora
              </a>
            ) : null}
            <button
              onClick={() => handleRetry(item.order_number)}
              disabled={retrying[item.order_number]}
              className="btn btn-ghost"
              style={{ padding: '8px 14px', fontSize: 12 }}
            >
              {retrying[item.order_number] ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Clock size={13} />
              )}
              Gerar novo link
            </button>
            <button
              onClick={() => handleSendReminder(item.order_number)}
              disabled={sendingReminder[item.order_number]}
              className="btn btn-ghost"
              style={{ padding: '8px 14px', fontSize: 12 }}
              title="Enviar lembrete por email"
            >
              {sendingReminder[item.order_number] ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Mail size={13} />
              )}
              Enviar lembrete
            </button>
            <button
              onClick={() => handleCancel(item.order_number)}
              disabled={cancelling[item.order_number]}
              className="text-xs flex items-center gap-1.5 px-3 py-2 transition-colors"
              style={{ color: 'var(--ink-50)' }}
              title="Cancelar esta inscrição"
            >
              {cancelling[item.order_number] ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <XCircle size={13} />
              )}
              Não preciso mais
            </button>
          </>
        )}
        {(item.payment_status === 'confirmed' || item.payment_status === 'free') && (
          <Link
            href={`/confirmacao/${item.order_number}`}
            className="btn btn-primary"
            style={{ padding: '8px 14px', fontSize: 12 }}
          >
            <Ticket size={13} />
            Ver ingresso
          </Link>
        )}
      </div>
    </div>
  )

  const renderGroup = (
    title: string,
    items: InscriptionItem[],
    color: string,
  ) => {
    if (items.length === 0) return null
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-4">
          <span
            className="w-2 h-2 rounded-full block"
            style={{ background: color }}
          />
          <span className="mono text-[11px] tracking-[0.1em] uppercase font-semibold">
            {title} ({items.length})
          </span>
        </div>
        <div className="flex flex-col gap-3">{items.map(renderCard)}</div>
      </div>
    )
  }

  return (
    <div className="page-enter">
      <section style={{ padding: '64px 0 32px' }}>
        <div className="container-site">
          <div className="eyebrow mb-6">
            <span className="dot" />
            MINHAS INSCRIÇÕES · 6ª EDIÇÃO
          </div>
          <h1
            className="display mb-6"
            style={{ fontSize: 'clamp(48px, 8vw, 120px)', maxWidth: 1100 }}
          >
            Suas <span style={{ color: 'var(--laranja)' }}>inscrições</span>.
          </h1>
          <p
            className="text-lg leading-relaxed"
            style={{ color: 'var(--ink-70)', maxWidth: 700 }}
          >
            Digite seu CPF para consultar inscrições, pagar pendentes, baixar ingressos e gerenciar
            sua agenda.
          </p>
        </div>
      </section>

      <section style={{ padding: '24px 0 96px' }}>
        <div className="container-site">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 items-start">
            {/* CPF input */}
            <div
              className="bg-white border border-line rounded-2xl lg:sticky lg:top-24"
              style={{ padding: 28 }}
            >
              <div className="mono text-[11px] text-ink-50 tracking-[0.1em] mb-3">
                CONSULTE PELO CPF
              </div>
              <label htmlFor="cpf" className="block">
                <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2">CPF</div>
                <input
                  id="cpf"
                  type="text"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={handleCpfChange}
                  maxLength={14}
                  style={inputStyle}
                />
              </label>
              {loading && (
                <div className="flex items-center gap-2 mt-4 text-sm" style={{ color: 'var(--ink-70)' }}>
                  <Loader2 size={16} className="animate-spin" />
                  Buscando inscrições...
                </div>
              )}
              {error && (
                <div
                  className="mt-4 p-3 rounded-lg text-xs"
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                  }}
                >
                  {error}
                </div>
              )}

              <div
                className="mt-7 pt-6"
                style={{ borderTop: '1px solid var(--line)' }}
              >
                <div className="mono text-[11px] text-ink-50 tracking-[0.1em] mb-3">
                  AINDA NÃO SE INSCREVEU?
                </div>
                <Link href="/inscricoes" className="btn btn-primary w-full justify-center">
                  Ver eventos disponíveis <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Results */}
            <div>
              {inscriptions === null && !loading && !error && (
                <div
                  className="border border-line rounded-2xl flex flex-col items-center justify-center text-center"
                  style={{ padding: '64px 32px', minHeight: 320 }}
                >
                  <div
                    className="w-14 h-14 rounded-full grid place-items-center mb-4"
                    style={{ background: 'var(--paper-2)' }}
                  >
                    <Search size={22} />
                  </div>
                  <div
                    className="display mb-2"
                    style={{ fontSize: 22, letterSpacing: '-.02em' }}
                  >
                    Digite seu CPF para começar
                  </div>
                  <p className="text-sm" style={{ color: 'var(--ink-70)', maxWidth: 360 }}>
                    Vamos buscar todas as suas inscrições — pagas, pendentes e gratuitas.
                  </p>
                </div>
              )}

              {inscriptions !== null && !loading && !error && (
                <>
                  {inscriptions.length === 0 ? (
                    <div
                      className="bg-white border border-line rounded-2xl text-center"
                      style={{ padding: '48px 32px' }}
                    >
                      <AlertCircle
                        size={48}
                        className="mx-auto mb-4"
                        style={{ color: 'var(--ink-50)', opacity: 0.4 }}
                      />
                      <div
                        className="display mb-2"
                        style={{ fontSize: 22, letterSpacing: '-.02em' }}
                      >
                        Nenhuma inscrição encontrada
                      </div>
                      <p
                        className="text-sm mb-6"
                        style={{ color: 'var(--ink-70)' }}
                      >
                        Não encontramos inscrições para o CPF{' '}
                        {formatCPF(cpf.replace(/\D/g, ''))}
                      </p>
                      <Link href="/inscricoes" className="btn btn-primary">
                        Ver eventos disponíveis <ArrowRight size={14} />
                      </Link>
                    </div>
                  ) : (
                    <>
                      <p
                        className="mono text-[11px] tracking-[0.1em] uppercase mb-6"
                        style={{ color: 'var(--ink-50)' }}
                      >
                        {inscriptions.length} inscrição
                        {inscriptions.length > 1 ? 'ões' : ''} encontrada
                        {inscriptions.length > 1 ? 's' : ''}
                      </p>
                      {renderGroup('Pendentes', pending, 'var(--laranja)')}
                      {renderGroup('Confirmadas', confirmed, 'var(--verde-600)')}
                      {renderGroup('Gratuitas', free, 'var(--ciano-600)')}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
