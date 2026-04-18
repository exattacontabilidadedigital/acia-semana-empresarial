'use client'

import { useEffect, useState } from 'react'
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
  ShoppingCart,
  Loader2,
  RefreshCw,
} from 'lucide-react'

interface InscriptionData {
  id: number
  order_number: string
  nome: string
  email: string
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
  const group = params.group as string

  const [inscriptions, setInscriptions] = useState<InscriptionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

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
        // Recarregar dados
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

  // QR code único do grupo (pega de qualquer inscrição confirmada)
  const confirmedInscription = inscriptions.find(
    (i) => (i.payment_status === 'confirmed' || i.payment_status === 'free') && i.qr_code
  )
  const groupQrCode = confirmedInscription?.qr_code

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
              <ShoppingCart className="w-16 h-16 text-purple mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-dark">Suas Inscrições</h1>
            </>
          )}
          <p className="text-gray-500 text-sm mt-1">
            Grupo <span className="font-semibold text-dark">{group}</span>
            <span className="ml-2 text-gray-400">
              {inscriptions.length} {inscriptions.length === 1 ? 'evento' : 'eventos'}
            </span>
          </p>
        </div>

        {/* QR Code único do grupo */}
        {allConfirmed && groupQrCode && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={groupQrCode}
              alt="QR Code"
              width={200}
              height={200}
              className="mx-auto rounded-lg"
            />
            <p className="text-xs text-gray-400 mt-2">Apresente este QR Code na entrada dos eventos</p>
            <p className="text-[10px] text-gray-300 mt-1">Válido para todos os eventos abaixo</p>
          </div>
        )}

        {/* Inscription cards */}
        <div className="space-y-4 mb-6">
          {inscriptions.map((inscription) => {
            const event = inscription.event
            const tickets = inscription.tickets
            const isPending = inscription.payment_status === 'pending'
            const isConfirmed = inscription.payment_status === 'confirmed' || inscription.payment_status === 'free'

            return (
              <div key={inscription.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Event info bar */}
                <div className={`p-4 text-white ${
                  isPending
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                    : 'bg-gradient-to-r from-purple to-purple-dark'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider opacity-80 mb-0.5">
                        Semana Empresarial 2026
                      </p>
                      <h2 className="text-base font-bold">{event?.title}</h2>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/20">
                      {isPending ? 'Pendente' : inscription.payment_status === 'free' ? 'Gratuito' : 'Confirmado'}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  {/* Event details */}
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

                  {/* Participant */}
                  <div className="flex items-center gap-2 text-xs text-gray-700 mb-3 pb-3 border-b border-dashed border-gray-200">
                    <User size={12} className="text-purple" />
                    <span className="font-medium">{inscription.nome}</span>
                    <span className="text-gray-400 text-[10px] ml-auto">
                      {inscription.quantity}x {inscription.is_half_price ? 'meia' : 'inteira'}
                    </span>
                  </div>

                  {/* Pending payment */}
                  {isPending && (
                    <div className="text-center py-4 bg-yellow-50 rounded-xl">
                      <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-1" />
                      <p className="text-xs font-semibold text-yellow-800 mb-1">Aguardando pagamento</p>
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

                  {/* Tickets count */}
                  {isConfirmed && tickets.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                        <TicketIcon size={10} />
                        {tickets.length} ingresso{tickets.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  )}

                  {/* Link to individual confirmation */}
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
              </div>
            )
          })}
        </div>

        {/* Sync button for pending payments */}
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

        {/* Actions */}
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
