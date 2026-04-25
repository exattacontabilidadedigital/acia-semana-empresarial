'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import {
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  User,
  Ticket,
} from 'lucide-react'

interface EventData {
  id: number
  title: string
  event_date: string
  start_time: string
  end_time: string | null
  location: string | null
}

interface TicketData {
  id: string
  status: string
  checked_in_at: string | null
}

interface InscriptionData {
  id: number
  order_number: string
  event: EventData | null
  quantity: number
  is_half_price: boolean
  payment_status: string
  tickets_total: number
  tickets_active: number
  tickets_used: number
  tickets: TicketData[]
}

interface CheckinData {
  success: boolean
  type: 'group' | 'order'
  purchase_group?: string
  participant: {
    nome: string
    email: string
    cpf: string
  }
  inscriptions?: InscriptionData[]
  inscription?: InscriptionData
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

function formatTime(time: string): string {
  return time.slice(0, 5)
}

export default function CheckinPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const identifier = (params?.identifier ?? '') as string
  const participantCpf = searchParams?.get('p') ?? null

  const [data, setData] = useState<CheckinData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checkingIn, setCheckingIn] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ ticketId: string; success: boolean; message: string } | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        // Detectar se é grupo (PG-) ou order (SE-)
        const isGroup = identifier.startsWith('PG-')
        const params = new URLSearchParams()
        if (isGroup) {
          params.set('group', identifier)
          if (participantCpf) params.set('cpf', participantCpf)
        } else {
          params.set('order', identifier)
        }
        const res = await fetch(`/api/checkin/validate?${params.toString()}`)
        const json = await res.json()

        if (!res.ok || !json.success) {
          setError(json.message || 'Inscrição não encontrada')
          return
        }

        setData(json)
      } catch {
        setError('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [identifier, participantCpf])

  async function handleCheckin(ticketId: string) {
    setCheckingIn(ticketId)
    setFeedback(null)
    try {
      const res = await fetch('/api/checkin/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId }),
      })
      const json = await res.json()

      setFeedback({
        ticketId,
        success: json.success,
        message: json.message || (json.success ? 'Check-in realizado!' : 'Erro no check-in'),
      })

      if (json.success && data) {
        // Atualizar estado local
        const updateTickets = (inscriptions: InscriptionData[]) =>
          inscriptions.map((ins) => ({
            ...ins,
            tickets: ins.tickets.map((t) =>
              t.id === ticketId ? { ...t, status: 'used', checked_in_at: new Date().toISOString() } : t
            ),
            tickets_active: ins.tickets.filter((t) => t.id !== ticketId && t.status === 'active').length,
            tickets_used: ins.tickets.filter((t) => t.id === ticketId || t.status === 'used').length,
          }))

        if (data.type === 'group' && data.inscriptions) {
          setData({ ...data, inscriptions: updateTickets(data.inscriptions) })
        } else if (data.inscription) {
          setData({ ...data, inscription: updateTickets([data.inscription])[0] })
        }
      }
    } catch {
      setFeedback({ ticketId, success: false, message: 'Erro de conexão' })
    } finally {
      setCheckingIn(null)
    }
  }

  async function handleCheckinAll(inscription: InscriptionData) {
    const activeTickets = inscription.tickets.filter((t) => t.status === 'active')
    for (const ticket of activeTickets) {
      await handleCheckin(ticket.id)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F5F5FA] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple animate-spin" />
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#F5F5FA] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-dark mb-2">Check-in indisponível</h1>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </main>
    )
  }

  const inscriptions = data.type === 'group' ? (data.inscriptions ?? []) : data.inscription ? [data.inscription] : []

  return (
    <main className="min-h-screen bg-[#F5F5FA] py-8">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple to-purple-dark rounded-2xl p-5 mb-6 text-white">
          <p className="text-xs uppercase tracking-wider opacity-70 mb-1">Check-in</p>
          <div className="flex items-center gap-3 mb-3">
            <User size={20} />
            <div>
              <p className="font-bold text-lg">{data.participant.nome}</p>
              <p className="text-xs opacity-70">{data.participant.email}</p>
            </div>
          </div>
          <p className="text-xs opacity-50">
            {data.type === 'group' ? `Grupo ${data.purchase_group}` : `Pedido ${inscriptions[0]?.order_number}`}
            {' · '}
            {inscriptions.length} {inscriptions.length === 1 ? 'evento' : 'eventos'}
          </p>
        </div>

        {/* Feedback global */}
        {feedback && (
          <div className={`mb-4 flex items-center gap-3 rounded-xl p-4 ${
            feedback.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {feedback.success ? <CheckCircle size={20} /> : <XCircle size={20} />}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
        )}

        {/* Event cards */}
        <div className="space-y-4">
          {inscriptions.map((ins) => {
            const event = ins.event
            const activeTickets = ins.tickets.filter((t) => t.status === 'active')
            const usedTickets = ins.tickets.filter((t) => t.status === 'used')
            const allCheckedIn = activeTickets.length === 0 && usedTickets.length > 0

            return (
              <div key={ins.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Event header */}
                <div className={`p-4 ${allCheckedIn ? 'bg-green-500' : 'bg-gray-800'} text-white`}>
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-sm">{event?.title || 'Evento'}</h2>
                    {allCheckedIn && (
                      <span className="flex items-center gap-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
                        <CheckCircle size={12} />
                        Concluído
                      </span>
                    )}
                  </div>
                  {event && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-80 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {formatDate(event.event_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {formatTime(event.start_time)}
                        {event.end_time ? ` - ${formatTime(event.end_time)}` : ''}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />
                          {event.location}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4">
                  {/* Summary */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Ticket size={12} />
                      {ins.tickets.length} ingresso{ins.tickets.length > 1 ? 's' : ''}
                      {ins.is_half_price ? ' (meia)' : ''}
                    </span>
                    <span>
                      {usedTickets.length}/{ins.tickets.length} check-in{usedTickets.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Check-in all button */}
                  {activeTickets.length > 0 && (
                    <button
                      onClick={() => handleCheckinAll(ins)}
                      disabled={checkingIn !== null}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {checkingIn ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      Confirmar presença ({activeTickets.length} ingresso{activeTickets.length > 1 ? 's' : ''})
                    </button>
                  )}

                  {/* All done */}
                  {allCheckedIn && (
                    <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-semibold py-2">
                      <CheckCircle size={16} />
                      Todos os ingressos já utilizados
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
