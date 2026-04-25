'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  Clock,
  Ticket,
  AlertCircle,
  Loader2,
  ExternalLink,
  XCircle,
  Mail,
  ArrowRight,
  Award,
  CalendarDays,
  Download,
  MapPin,
} from 'lucide-react'
import { formatCurrency, formatDate, formatCPF } from '@/lib/utils'

type EligibleCertificate = {
  certificate_id: number
  verification_code: string
  ticket_id: string
  event_id: number
  event_title: string
  event_date: string
  participant_name: string
  url: string
}

interface InscriptionEvent {
  title: string
  event_date: string
  start_time: string
  end_time?: string | null
  location: string | null
  description?: string | null
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

export default function MinhasInscricoesPanel() {
  const [cpf, setCpf] = useState('')
  const [inscriptions, setInscriptions] = useState<InscriptionItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retrying, setRetrying] = useState<ActionState>({})
  const [cancelling, setCancelling] = useState<ActionState>({})
  const [sendingReminder, setSendingReminder] = useState<ActionState>({})
  const [certificates, setCertificates] = useState<EligibleCertificate[]>([])
  const [activeTab, setActiveTab] = useState<'agenda' | 'detalhes' | 'pendentes'>('agenda')
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [requestingCancellation, setRequestingCancellation] = useState<ActionState>({})

  const maskCPF = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }

  const fetchInscriptions = useCallback(async (cpfDigits: string) => {
    setLoading(true)
    setError('')
    setCertificates([])
    try {
      const res = await fetch(`/api/inscriptions/by-cpf?cpf=${cpfDigits}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao buscar inscrições')
        setInscriptions(null)
        return
      }
      setInscriptions(data.inscriptions)

      // Busca certificados elegíveis em paralelo (não bloqueia inscrições)
      fetch(`/api/certificates/eligible?cpf=${cpfDigits}`)
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d.items)) setCertificates(d.items)
        })
        .catch(() => {
          /* silencioso — botão simplesmente não aparece */
        })
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setInscriptions(null)
    } finally {
      setLoading(false)
    }
  }, [])

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

  const handleRequestCancellation = async (orderNumber: string) => {
    const reason = window.prompt(
      'Por favor descreva o motivo do cancelamento (obrigatório, mín. 5 caracteres). O pedido será analisado em até 2 dias úteis.',
      '',
    )
    if (!reason || reason.trim().length < 5) {
      if (reason !== null) {
        alert('Motivo precisa ter pelo menos 5 caracteres.')
      }
      return
    }
    const cpfDigits = cpf.replace(/\D/g, '')
    setRequestingCancellation((prev) => ({ ...prev, [orderNumber]: true }))
    try {
      const res = await fetch('/api/inscriptions/request-cancellation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number: orderNumber,
          cpf: cpfDigits,
          reason: reason.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Erro ao enviar pedido de cancelamento')
        return
      }
      alert(data.message || 'Pedido enviado. Você receberá retorno por e-mail.')
    } catch {
      alert('Erro de conexão. Tente novamente.')
    } finally {
      setRequestingCancellation((prev) => ({ ...prev, [orderNumber]: false }))
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
  const ativas = [...confirmed, ...free]

  const handleDownloadIcs = async () => {
    const cpfDigits = cpf.replace(/\D/g, '')
    if (cpfDigits.length !== 11) return
    try {
      const res = await fetch(`/api/calendar/ics?cpf=${cpfDigits}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Erro ao gerar agenda.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'agenda-semana-empresarial-2026.ics'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert('Erro de conexão. Tente novamente.')
    }
  }

  const handleDownloadPdf = async () => {
    const cpfDigits = cpf.replace(/\D/g, '')
    if (cpfDigits.length !== 11) return
    setDownloadingPdf(true)
    try {
      const res = await fetch(`/api/calendar/pdf?cpf=${cpfDigits}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Erro ao gerar PDF.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'minha-agenda-semana-empresarial-2026.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert('Erro de conexão. Tente novamente.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  // Quando o usuário busca novas inscrições, abre na aba "Pendentes" se houver pagamentos a fazer
  useEffect(() => {
    if (!inscriptions) return
    const hasPending = inscriptions.some((i) => i.payment_status === 'pending')
    setActiveTab(hasPending ? 'pendentes' : 'agenda')
  }, [inscriptions])

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
          <>
            <Link
              href={`/confirmacao/${item.order_number}`}
              className="btn btn-primary"
              style={{ padding: '8px 14px', fontSize: 12 }}
            >
              <Ticket size={13} />
              Ver ingresso
            </Link>
            <button
              onClick={() => handleRequestCancellation(item.order_number)}
              disabled={requestingCancellation[item.order_number]}
              className="text-xs flex items-center gap-1.5 px-3 py-2 transition-colors"
              style={{ color: 'var(--ink-50)' }}
              title="Solicitar cancelamento e reembolso"
            >
              {requestingCancellation[item.order_number] ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <XCircle size={13} />
              )}
              Solicitar cancelamento
            </button>
          </>
        )}
      </div>

      {/* Certificados disponíveis pra este evento */}
      {(() => {
        const certs = certificates.filter((c) => c.event_id === item.event_id)
        if (certs.length === 0) return null
        return (
          <div
            className="mt-4 pt-4 flex flex-wrap items-center gap-2"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <span
              className="mono text-[10px] tracking-[0.1em] mr-1"
              style={{ color: 'var(--ink-50)' }}
            >
              CERTIFICADO{certs.length > 1 ? 'S' : ''} DISPONÍVEL{certs.length > 1 ? 'EIS' : ''}:
            </span>
            {certs.map((c) => (
              <a
                key={c.certificate_id}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{
                  padding: '8px 14px',
                  fontSize: 12,
                  background: 'rgba(166,206,58,0.12)',
                  color: '#3d5a0a',
                  borderColor: 'rgba(166,206,58,0.4)',
                }}
                title={`Gerar certificado de ${c.participant_name}`}
              >
                <Award size={13} />
                {certs.length > 1
                  ? `Certificado · ${c.participant_name}`
                  : 'Gerar certificado'}
              </a>
            ))}
          </div>
        )
      })()}
    </div>
  )

  const renderAgenda = (items: InscriptionItem[]) => {
    if (items.length === 0) return null

    // Agrupa por data, ordena por data crescente e horário crescente
    const sorted = [...items].sort((a, b) => {
      const dateCmp = a.events.event_date.localeCompare(b.events.event_date)
      if (dateCmp !== 0) return dateCmp
      return (a.events.start_time || '').localeCompare(b.events.start_time || '')
    })

    const byDate = new Map<string, InscriptionItem[]>()
    for (const ins of sorted) {
      const k = ins.events.event_date
      const arr = byDate.get(k) ?? []
      arr.push(ins)
      byDate.set(k, arr)
    }

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <CalendarDays size={18} style={{ color: 'var(--azul)' }} />
            <span className="mono text-[11px] tracking-[0.1em] uppercase font-semibold">
              {items.length} evento{items.length > 1 ? 's' : ''} confirmado{items.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="btn btn-primary"
              style={{ padding: '8px 14px', fontSize: 12 }}
              title="Baixar agenda em PDF"
            >
              {downloadingPdf ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              Baixar agenda (PDF)
            </button>
            <button
              type="button"
              onClick={handleDownloadIcs}
              className="btn btn-ghost"
              style={{ padding: '8px 14px', fontSize: 12 }}
              title="Importar no Google Calendar, Outlook, Apple Calendar, etc."
            >
              <Download size={13} />
              .ics
            </button>
          </div>
        </div>

        <div
          className="bg-white border border-line rounded-2xl overflow-hidden"
          style={{ padding: 0 }}
        >
          {Array.from(byDate.entries()).map(([date, dayItems], idx) => {
            const d = new Date(`${date}T12:00:00`)
            const weekday = new Intl.DateTimeFormat('pt-BR', {
              weekday: 'long',
            }).format(d)
            const dayMonth = new Intl.DateTimeFormat('pt-BR', {
              day: '2-digit',
              month: 'long',
            }).format(d)
            return (
              <div
                key={date}
                style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--line)' }}
                className="flex flex-col sm:flex-row gap-4 p-5"
              >
                <div
                  className="sm:w-32 sm:flex-shrink-0 sm:border-r sm:pr-4"
                  style={{ borderColor: 'var(--line)' }}
                >
                  <div
                    className="mono text-[10px] tracking-[0.1em] uppercase mb-1"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    {weekday}
                  </div>
                  <div
                    className="display"
                    style={{ fontSize: 22, letterSpacing: '-.02em', lineHeight: 1.1 }}
                  >
                    {dayMonth}
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-2.5">
                  {dayItems.map((ins) => (
                    <div
                      key={ins.id}
                      className="rounded-lg flex items-start gap-3"
                      style={{
                        background: 'var(--paper-2)',
                        padding: '12px 14px',
                      }}
                    >
                      <div
                        className="font-mono text-xs whitespace-nowrap pt-0.5"
                        style={{ color: 'var(--azul)', minWidth: 56 }}
                      >
                        {ins.events.start_time?.slice(0, 5) ?? '—'}
                        {ins.events.end_time
                          ? ` – ${ins.events.end_time.slice(0, 5)}`
                          : ''}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm" style={{ lineHeight: 1.3 }}>
                          {ins.events.title}
                        </div>
                        {ins.events.location && (
                          <div
                            className="text-[11px] flex items-center gap-1 mt-0.5"
                            style={{ color: 'var(--ink-70)' }}
                          >
                            <MapPin size={11} />
                            {ins.events.location}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderGroup = (title: string, items: InscriptionItem[], color: string) => {
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
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 items-start">
      {/* CPF input */}
      <div
        className="bg-white border border-line rounded-2xl lg:sticky lg:top-24"
        style={{ padding: 28 }}
      >
        <div className="mono text-[11px] text-ink-50 tracking-[0.1em] mb-3">
          CONSULTE PELO CPF
        </div>
        <label htmlFor="cpf-panel" className="block">
          <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2">CPF</div>
          <input
            id="cpf-panel"
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
          <div
            className="flex items-center gap-2 mt-4 text-sm"
            style={{ color: 'var(--ink-70)' }}
          >
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
            <p
              className="text-sm"
              style={{ color: 'var(--ink-70)', maxWidth: 360 }}
            >
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
                  className="mono text-[11px] tracking-[0.1em] uppercase mb-4"
                  style={{ color: 'var(--ink-50)' }}
                >
                  {inscriptions.length} inscrição
                  {inscriptions.length > 1 ? 'ões' : ''} encontrada
                  {inscriptions.length > 1 ? 's' : ''}
                </p>

                {/* Tabs */}
                <div
                  className="flex gap-1 p-1 rounded-full mb-6 inline-flex"
                  style={{ background: 'var(--paper-2)' }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab('agenda')}
                    className="px-4 py-2 rounded-full text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                    style={{
                      background: activeTab === 'agenda' ? 'var(--ink)' : 'transparent',
                      color: activeTab === 'agenda' ? 'white' : 'var(--ink-70)',
                    }}
                  >
                    <CalendarDays size={14} />
                    Calendário
                    {ativas.length > 0 && (
                      <span
                        className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background:
                            activeTab === 'agenda' ? 'var(--verde-600)' : 'var(--ink)',
                          color: 'white',
                        }}
                      >
                        {ativas.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('detalhes')}
                    className="px-4 py-2 rounded-full text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                    style={{
                      background: activeTab === 'detalhes' ? 'var(--ink)' : 'transparent',
                      color: activeTab === 'detalhes' ? 'white' : 'var(--ink-70)',
                    }}
                  >
                    <Ticket size={14} />
                    Confirmadas
                    {ativas.length > 0 && (
                      <span
                        className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background:
                            activeTab === 'detalhes' ? 'var(--verde-600)' : 'var(--ink)',
                          color: 'white',
                        }}
                      >
                        {ativas.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('pendentes')}
                    className="px-4 py-2 rounded-full text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                    style={{
                      background: activeTab === 'pendentes' ? 'var(--ink)' : 'transparent',
                      color: activeTab === 'pendentes' ? 'white' : 'var(--ink-70)',
                    }}
                  >
                    <Clock size={14} />
                    Pendentes
                    {pending.length > 0 && (
                      <span
                        className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background:
                            activeTab === 'pendentes' ? 'var(--laranja)' : 'var(--ink)',
                          color: 'white',
                        }}
                      >
                        {pending.length}
                      </span>
                    )}
                  </button>
                </div>

                {activeTab === 'agenda' && (
                  <>
                    {ativas.length === 0 ? (
                      <div
                        className="bg-white border border-line rounded-2xl text-center"
                        style={{ padding: '48px 32px' }}
                      >
                        <CalendarDays
                          size={40}
                          className="mx-auto mb-3"
                          style={{ color: 'var(--ink-50)', opacity: 0.5 }}
                        />
                        <div
                          className="display mb-2"
                          style={{ fontSize: 18, letterSpacing: '-.02em' }}
                        >
                          Nenhum evento confirmado ainda
                        </div>
                        <p className="text-sm" style={{ color: 'var(--ink-70)' }}>
                          Conclua o pagamento das suas inscrições pendentes para ver sua agenda aqui.
                        </p>
                      </div>
                    ) : (
                      renderAgenda(ativas)
                    )}
                  </>
                )}

                {activeTab === 'detalhes' && (
                  <>
                    {ativas.length === 0 ? (
                      <div
                        className="bg-white border border-line rounded-2xl text-center"
                        style={{ padding: '48px 32px' }}
                      >
                        <Ticket
                          size={40}
                          className="mx-auto mb-3"
                          style={{ color: 'var(--ink-50)', opacity: 0.5 }}
                        />
                        <div
                          className="display mb-2"
                          style={{ fontSize: 18, letterSpacing: '-.02em' }}
                        >
                          Nenhuma inscrição confirmada ainda
                        </div>
                        <p className="text-sm" style={{ color: 'var(--ink-70)' }}>
                          As inscrições pagas (ou gratuitas) aparecem aqui com
                          ingressos e certificados disponíveis.
                        </p>
                      </div>
                    ) : (
                      <>
                        {renderGroup('Confirmadas', confirmed, 'var(--verde-600)')}
                        {renderGroup('Gratuitas', free, 'var(--ciano-600)')}
                      </>
                    )}
                  </>
                )}

                {activeTab === 'pendentes' && (
                  <>
                    {pending.length === 0 ? (
                      <div
                        className="bg-white border border-line rounded-2xl text-center"
                        style={{ padding: '48px 32px' }}
                      >
                        <Clock
                          size={40}
                          className="mx-auto mb-3"
                          style={{ color: 'var(--ink-50)', opacity: 0.5 }}
                        />
                        <div
                          className="display mb-2"
                          style={{ fontSize: 18, letterSpacing: '-.02em' }}
                        >
                          Nenhum pagamento pendente
                        </div>
                        <p className="text-sm" style={{ color: 'var(--ink-70)' }}>
                          Todas as suas inscrições estão em dia.
                        </p>
                      </div>
                    ) : (
                      renderGroup('Pendentes', pending, 'var(--laranja)')
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
