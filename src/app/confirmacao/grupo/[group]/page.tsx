'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  User,
  Ticket as TicketIcon,
  AlertCircle,
  ExternalLink,
  CalendarCheck2,
  Loader2,
  RefreshCw,
  Download,
  ChevronDown,
} from 'lucide-react'

interface InscriptionData {
  id: number
  order_number: string
  nome: string
  email: string
  cpf: string
  quantity: number
  is_half_price: boolean
  total_amount: number
  payment_status: string
  payment_url: string | null
  qr_code: string | null
  event: {
    id: number
    title: string
    event_date: string
    start_time: string
    end_time: string | null
    location: string | null
  } | null
  tickets: Array<{
    id: string
    participant_name: string
  }>
}

interface ParticipantGroup {
  cpf: string
  nome: string
  email: string
  qrCode: string | null
  inscriptions: InscriptionData[]
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

function formatTime(time: string): string {
  return time.slice(0, 5)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export default function GroupConfirmacaoPage() {
  const params = useParams()
  const group = (params?.group ?? '') as string

  const [inscriptions, setInscriptions] = useState<InscriptionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }))
  }

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/cart/group?group=${group}`)
      if (!res.ok) {
        setError(true)
        return
      }
      const data = await res.json()
      setInscriptions(data.inscriptions)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [group])

  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true)
    try {
      const res = await fetch(`/api/tickets/group-pdf?group=${encodeURIComponent(group)}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Não foi possível gerar o comprovante.')
        return
      }
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `comprovante-${group}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      alert('Erro ao gerar o comprovante. Tente novamente.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncMessage('')
    try {
      const res = await fetch('/api/payments/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group }),
      })
      const data = await res.json()

      if (data.updated > 0) {
        setSyncMessage(`${data.updated} inscrição(ões) confirmada(s)!`)
        setLoading(true)
        await fetchData()
      } else {
        setSyncMessage(data.message || 'Nenhuma atualização')
      }
    } catch {
      setSyncMessage('Erro ao verificar pagamento')
    } finally {
      setSyncing(false)
    }
  }

  // Agrupa inscriptions por CPF (1 participante = N inscriptions, 1 por slot/evento)
  const participants: ParticipantGroup[] = useMemo(() => {
    const byCpf = new Map<string, ParticipantGroup>()
    for (const ins of inscriptions) {
      const key = ins.cpf || ins.email || `id-${ins.id}`
      const existing = byCpf.get(key)
      if (existing) {
        existing.inscriptions.push(ins)
        if (!existing.qrCode && ins.qr_code) existing.qrCode = ins.qr_code
      } else {
        byCpf.set(key, {
          cpf: ins.cpf,
          nome: ins.nome,
          email: ins.email,
          qrCode: ins.qr_code,
          inscriptions: [ins],
        })
      }
    }
    return Array.from(byCpf.values())
  }, [inscriptions])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F5F5FA] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple animate-spin" />
      </main>
    )
  }

  if (error || inscriptions.length === 0) {
    return (
      <main className="min-h-screen bg-[#F5F5FA] flex items-center justify-center py-12 px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-500 text-3xl font-bold">!</span>
          </div>
          <h1 className="text-2xl font-bold text-dark mb-2">Compra não encontrada</h1>
          <p className="text-gray-600 mb-6">Não encontramos inscrições com este grupo de compra.</p>
          <Link href="/eventos" className="btn btn-purple">Voltar para Eventos</Link>
        </div>
      </main>
    )
  }

  const allConfirmed = inscriptions.every(
    (i) => i.payment_status === 'confirmed' || i.payment_status === 'free'
  )
  const hasPending = inscriptions.some((i) => i.payment_status === 'pending')
  const isMultiParticipant = participants.length > 1

  return (
    <main className="min-h-screen bg-[#F5F5FA] py-8 md:py-12">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          {allConfirmed ? (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-dark">Inscrições Confirmadas!</h1>
            </>
          ) : hasPending ? (
            <>
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-dark">Pagamento Pendente</h1>
            </>
          ) : (
            <>
              <CalendarCheck2 className="w-16 h-16 text-purple mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-dark">Suas Inscrições</h1>
            </>
          )}
          <p className="text-gray-500 text-sm mt-1">
            Grupo <span className="font-semibold text-dark">{group}</span>
            <span className="ml-2 text-gray-400">
              {participants.length} participante{participants.length === 1 ? '' : 's'} ·{' '}
              {inscriptions.length} ingresso{inscriptions.length === 1 ? '' : 's'}
            </span>
          </p>
        </div>

        {/* Botão de download geral */}
        {allConfirmed && (
          <div className="text-center mb-6">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple text-white text-sm font-semibold hover:bg-purple-dark transition-colors disabled:opacity-60"
            >
              {downloadingPdf ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Baixar comprovante completo (PDF)
                </>
              )}
            </button>
          </div>
        )}

        {/* Bloco por participante */}
        <div className="space-y-6 mb-6">
          {participants.map((p) => (
            <div key={p.cpf} className="space-y-4">
              {isMultiParticipant && (
                <div className="flex items-center gap-2 px-1">
                  <div
                    className="rounded-full grid place-items-center text-white"
                    style={{ width: 28, height: 28, background: 'var(--azul, #5B2D8E)' }}
                  >
                    <User size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-dark truncate">{p.nome}</p>
                    <p className="text-[10px] text-gray-500 truncate">{p.email}</p>
                  </div>
                </div>
              )}

              {/* QR único do participante */}
              {allConfirmed && p.qrCode && (
                <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.qrCode}
                    alt={`QR Code de ${p.nome}`}
                    width={200}
                    height={200}
                    className="mx-auto rounded-lg"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    QR Code {isMultiParticipant ? `de ${p.nome.split(' ')[0]}` : ''}
                  </p>
                  <p className="text-[10px] text-gray-300 mt-1">
                    Válido para todos os eventos deste participante
                  </p>
                </div>
              )}

              {/* Cards de inscrições deste participante */}
              {p.inscriptions.map((inscription) => {
                const event = inscription.event
                const tickets = inscription.tickets
                const isPending = inscription.payment_status === 'pending'
                const isConfirmed =
                  inscription.payment_status === 'confirmed' ||
                  inscription.payment_status === 'free'
                const isOpen = expanded[inscription.id] ?? true

                return (
                  <div key={inscription.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(inscription.id)}
                      className={`w-full p-4 text-white text-left ${
                        isPending
                          ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                          : 'bg-gradient-to-r from-purple to-purple-dark'
                      }`}
                      aria-expanded={isOpen}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs uppercase tracking-wider opacity-80 mb-0.5">
                            Semana Empresarial 2026
                          </p>
                          <h2 className="text-base font-bold truncate">{event?.title}</h2>
                          {!isOpen && event && (
                            <p className="text-[11px] opacity-80 mt-0.5 truncate">
                              {formatDate(event.event_date)} · {tickets.length} ingresso
                              {tickets.length === 1 ? '' : 's'}
                            </p>
                          )}
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/20 shrink-0">
                          {isPending
                            ? 'Pendente'
                            : inscription.payment_status === 'free'
                              ? 'Gratuito'
                              : 'Confirmado'}
                        </span>
                        <ChevronDown
                          size={18}
                          className={`shrink-0 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="p-4">
                        {event && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mb-3">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} className="text-purple" />
                              {formatDate(event.event_date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} className="text-purple" />
                              {formatTime(event.start_time)}
                              {event.end_time ? ` - ${formatTime(event.end_time)}` : ''}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin size={12} className="text-purple" />
                                {event.location}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-xs text-gray-700 mb-3 pb-3 border-b border-dashed border-gray-200">
                          <User size={12} className="text-purple" />
                          <span className="font-medium">{inscription.nome}</span>
                          <span className="text-gray-400 text-[10px] ml-auto">
                            {inscription.quantity}x{' '}
                            {inscription.is_half_price ? 'meia' : 'inteira'}
                          </span>
                        </div>

                        {isPending && (
                          <div className="text-center py-4 bg-yellow-50 rounded-xl">
                            <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-1" />
                            <p className="text-xs font-semibold text-yellow-800 mb-1">
                              Aguardando pagamento
                            </p>
                            <p className="text-xs text-yellow-600 mb-3">
                              Valor: {formatCurrency(inscription.total_amount)}
                            </p>
                            {inscription.payment_url && (
                              <a
                                href={inscription.payment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-orange text-xs inline-flex items-center gap-1"
                              >
                                <ExternalLink size={12} />
                                Pagar agora
                              </a>
                            )}
                          </div>
                        )}

                        {isConfirmed && tickets.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-[10px] font-semibold text-orange uppercase tracking-wide flex items-center gap-1 mb-1.5">
                              <TicketIcon size={10} />
                              {tickets.length} ingresso{tickets.length > 1 ? 's' : ''}
                            </p>
                            <ul className="space-y-1">
                              {tickets.map((t) => (
                                <li
                                  key={t.id}
                                  className="flex justify-between items-center bg-[#f5f5fa] rounded-md px-2.5 py-1.5 text-xs"
                                >
                                  <span className="text-gray-700">{t.participant_name}</span>
                                  <span className="text-gray-400 font-mono text-[10px]">
                                    {t.id.slice(0, 8)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {isConfirmed && (
                          <div className="mt-3 text-center">
                            <Link
                              href={`/confirmacao/${inscription.order_number}`}
                              className="text-xs text-purple font-medium hover:underline"
                            >
                              Ver detalhes completos
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {hasPending && (
          <div className="mb-6">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {syncing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Verificando no Asaas...
                </>
              ) : (
                <>
                  <RefreshCw size={18} />
                  Já paguei — Verificar pagamento
                </>
              )}
            </button>
            {syncMessage && (
              <p className={`text-center text-sm mt-2 font-medium ${
                syncMessage.includes('confirmada') ? 'text-green-600' : 'text-gray-500'
              }`}>
                {syncMessage}
              </p>
            )}
          </div>
        )}

        <div className="text-center space-y-3">
          <Link href="/inscricoes" className="btn btn-purple inline-block">
            Minhas Inscrições
          </Link>
          <br />
          <Link href="/eventos" className="btn btn-orange inline-block">
            Ver mais eventos
          </Link>
        </div>
      </div>
    </main>
  )
}
