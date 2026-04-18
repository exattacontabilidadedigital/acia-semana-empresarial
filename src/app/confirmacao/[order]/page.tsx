export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate, formatTime, formatCurrency } from '@/lib/utils'
import type { Ticket } from '@/types/database'
import { CheckCircle, Calendar, Clock, MapPin, User, Ticket as TicketIcon, Download, Mail, Printer, AlertCircle, ExternalLink } from 'lucide-react'
import ConfirmacaoActions from './actions'

interface ConfirmacaoPageProps {
  params: { order: string }
}

export default async function ConfirmacaoPage({ params }: ConfirmacaoPageProps) {
  const supabase = createAdminClient()

  const { data: inscription } = await supabase
    .from('inscriptions')
    .select('*')
    .eq('order_number', params.order)
    .single()

  if (!inscription) {
    return (
      <main className="min-h-screen bg-[#F5F5FA] flex items-center justify-center py-12 px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-500 text-3xl font-bold">!</span>
          </div>
          <h1 className="text-2xl font-bold text-dark mb-2">Inscrição não encontrada</h1>
          <p className="text-gray-600 mb-6">Não encontramos uma inscrição com este número de pedido.</p>
          <Link href="/eventos" className="btn btn-purple">Voltar para Eventos</Link>
        </div>
      </main>
    )
  }

  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('inscription_id', inscription.id)
    .order('created_at', { ascending: true })

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', inscription.event_id)
    .single()

  const pdfUrl = `/api/tickets/pdf?order=${inscription.order_number}`
  const isPending = inscription.payment_status === 'pending'

  return (
    <main className="min-h-screen bg-[#F5F5FA] py-8 md:py-12">
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          {isPending ? (
            <>
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-dark">Pagamento Pendente</h1>
            </>
          ) : (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-dark">Inscrição Confirmada!</h1>
            </>
          )}
          <p className="text-gray-500 text-sm mt-1">
            Pedido <span className="font-semibold text-dark">{inscription.order_number}</span>
          </p>
        </div>

        {/* Ticket card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
          {/* Event info bar */}
          <div className="bg-gradient-to-r from-purple to-purple-dark p-5 text-white">
            <p className="text-xs uppercase tracking-wider opacity-80 mb-1">Semana Empresarial 2026</p>
            <h2 className="text-lg font-bold">{event?.title}</h2>
          </div>

          <div className="p-5">
            {/* Event details */}
            {event && (
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 mb-4">
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-purple" />
                  {formatDate(event.event_date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-purple" />
                  {formatTime(event.start_time)}{event.end_time ? ` - ${formatTime(event.end_time)}` : ''}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-purple" />
                    {event.location}
                  </span>
                )}
              </div>
            )}

            {/* Participant */}
            <div className="flex items-center gap-2 text-sm text-gray-700 mb-4 pb-4 border-b border-dashed border-gray-200">
              <User size={14} className="text-purple" />
              <span className="font-medium">{inscription.nome}</span>
              <span className="text-gray-400 text-xs ml-auto">{inscription.email}</span>
            </div>

            {/* QR Code or Pending */}
            {isPending ? (
              <div className="text-center py-6 bg-yellow-50 rounded-xl my-2">
                <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-yellow-800 mb-1">Aguardando pagamento</p>
                <p className="text-xs text-yellow-600 mb-4">
                  Valor: {formatCurrency(inscription.total_amount)}
                </p>
                {inscription.payment_url && (
                  <a
                    href={inscription.payment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-orange text-sm inline-flex items-center gap-1.5"
                  >
                    <ExternalLink size={14} />
                    Pagar agora
                  </a>
                )}
                <p className="text-xs text-gray-400 mt-3">
                  Após o pagamento, seu ingresso será liberado automaticamente.
                </p>
              </div>
            ) : inscription.qr_code ? (
              <div className="text-center py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={inscription.qr_code}
                  alt="QR Code"
                  width={180}
                  height={180}
                  className="mx-auto rounded-lg"
                />
                <p className="text-xs text-gray-400 mt-2">Apresente na entrada do evento</p>
              </div>
            ) : null}

            {/* Tickets */}
            {!isPending && tickets && tickets.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <TicketIcon size={12} />
                  {tickets.length} ingresso{tickets.length > 1 ? 's' : ''}
                </p>
                <div className="space-y-1.5">
                  {tickets.map((ticket: Ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
                      <span className="text-gray-700">{ticket.participant_name}</span>
                      <span className="text-gray-400 font-mono">{ticket.id.slice(0, 8)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="no-print">
          {isPending ? (
            <div className="text-center mt-4 space-y-3">
              <Link href="/inscricoes" className="btn btn-purple inline-block">
                Minhas Inscrições
              </Link>
              <br />
              <Link href="/eventos" className="btn btn-orange inline-block">
                Ver mais eventos
              </Link>
            </div>
          ) : (
            <>
              <ConfirmacaoActions
                pdfUrl={pdfUrl}
                orderNumber={inscription.order_number}
                email={inscription.email}
                eventTitle={event?.title || 'Evento'}
              />

              <div className="text-center mt-4">
                <Link href="/eventos" className="btn btn-orange">
                  Ver mais eventos
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
