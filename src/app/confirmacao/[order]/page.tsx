export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate, formatTime, formatCurrency, formatCPF } from '@/lib/utils'
import { EDITION_CONFIG } from '@/lib/edition-config'
import {
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Info,
} from 'lucide-react'
import { DownloadPdfButton } from './actions'
import CollapsibleEvent from './CollapsibleEvent'

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
          <p className="text-gray-600 mb-6">
            Não encontramos uma inscrição com este número de pedido.
          </p>
          <Link href="/eventos" className="btn btn-purple">
            Voltar para Eventos
          </Link>
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
  const isFree = inscription.payment_status === 'free'
  const isConfirmed = inscription.payment_status === 'confirmed' || isFree
  const totalTickets = tickets?.length ?? 0

  return (
    <main className="min-h-screen bg-[#F5F5FA] py-8 md:py-12">
      <div className="max-w-xl mx-auto px-4">
        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
          {/* Header gradiente */}
          <div className="bg-gradient-to-br from-[#5B2D8E] to-[#3D1A6E] text-white px-6 py-7 text-center">
            <p className="text-[11px] tracking-[2px] font-semibold opacity-80">
              SEMANA EMPRESARIAL DE AÇAILÂNDIA 2026
            </p>
            <h1 className="text-xl md:text-2xl font-extrabold mt-1.5">
              Comprovante de Inscrição
            </h1>
            <p className="text-[11px] opacity-75 mt-1.5">
              Pedido: <span className="font-semibold">{inscription.order_number}</span>
            </p>
          </div>

          <div className="p-6">
            {/* Badge de status */}
            <div className="mb-4">
              {isPending ? (
                <span className="inline-flex items-center gap-1.5 bg-yellow-500 text-white px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  <AlertCircle size={12} />
                  Pagamento Pendente
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-green-500 text-white px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  <CheckCircle size={12} />
                  {isFree ? 'Inscrição gratuita' : 'Inscrição confirmada'}
                </span>
              )}
            </div>

            {/* Dados do participante em grid */}
            <div className="grid grid-cols-2 gap-x-5 gap-y-3 pb-4 mb-4 border-b border-dashed border-gray-200">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">
                  Participante
                </div>
                <div className="text-sm font-semibold text-dark truncate">
                  {inscription.nome}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">
                  E-mail
                </div>
                <div className="text-sm font-semibold text-dark truncate">
                  {inscription.email}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">
                  CPF
                </div>
                <div className="text-sm font-semibold text-dark">
                  {inscription.cpf ? formatCPF(inscription.cpf) : '—'}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">
                  Telefone
                </div>
                <div className="text-sm font-semibold text-dark">
                  {inscription.telefone || '—'}
                </div>
              </div>
            </div>

            {/* Tiles de resumo */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-[#f5f5fa] rounded-xl py-3 text-center">
                <div className="text-lg font-extrabold text-purple">1</div>
                <div className="text-[9px] uppercase tracking-wider text-gray-500 mt-0.5">
                  Evento
                </div>
              </div>
              <div className="bg-[#f5f5fa] rounded-xl py-3 text-center">
                <div className="text-lg font-extrabold text-purple">{totalTickets}</div>
                <div className="text-[9px] uppercase tracking-wider text-gray-500 mt-0.5">
                  {totalTickets === 1 ? 'Ingresso' : 'Ingressos'}
                </div>
              </div>
              <div className="bg-[#f5f5fa] rounded-xl py-3 text-center">
                <div className="text-lg font-extrabold text-purple leading-tight">
                  {formatCurrency(inscription.total_amount)}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-gray-500 mt-0.5">
                  Total
                </div>
              </div>
            </div>

            {/* QR Code ou pendente */}
            {isPending ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-center mb-4">
                <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-yellow-800 mb-1">
                  Aguardando pagamento
                </p>
                <p className="text-xs text-yellow-700 mb-4">
                  Seu ingresso será liberado automaticamente após a confirmação do
                  pagamento.
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
              </div>
            ) : inscription.qr_code ? (
              <div className="bg-[#fafafa] border border-gray-200 rounded-xl p-5 text-center mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={inscription.qr_code}
                  alt="QR Code do ingresso"
                  width={180}
                  height={180}
                  className="mx-auto rounded-lg"
                />
                <p className="text-xs font-semibold text-gray-600 mt-3">
                  Seu QR Code de acesso
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Apresente na entrada do evento
                </p>
                <DownloadPdfButton
                  pdfUrl={pdfUrl}
                  orderNumber={inscription.order_number}
                  variant="compact"
                />
              </div>
            ) : null}

            {/* Instruções */}
            {isConfirmed && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                <h4 className="flex items-center gap-1.5 text-[11px] font-extrabold text-yellow-800 uppercase tracking-wider mb-2">
                  <Info size={13} />
                  Como usar seu ingresso
                </h4>
                <ol className="text-[11px] text-yellow-900 space-y-1 pl-4 list-decimal">
                  <li>
                    Apresente este QR Code no check-in — impresso ou na tela do celular.
                  </li>
                  <li>Chegue com antecedência mínima de 30 minutos. Leve um documento com foto.</li>
                  <li>
                    Cada QR Code pode ser validado 1 vez por evento. Guarde este comprovante.
                  </li>
                  <li>Dúvidas: {EDITION_CONFIG.contact.whatsappDisplay} ou {EDITION_CONFIG.contact.email}.</li>
                </ol>
              </div>
            )}

            {/* Detalhes do evento (colapsável) */}
            {event && (
              <>
                <h3 className="text-sm font-extrabold text-dark mb-2.5">
                  Detalhes do evento
                </h3>
                <CollapsibleEvent
                  title={event.title}
                  date={formatDate(event.event_date)}
                  startTime={formatTime(event.start_time)}
                  endTime={event.end_time ? formatTime(event.end_time) : undefined}
                  location={event.location || undefined}
                  ticketCount={totalTickets}
                  isHalfPrice={inscription.is_half_price}
                  tickets={(tickets ?? []).map((t) => ({
                    id: t.id,
                    participant_name: t.participant_name,
                  }))}
                  defaultOpen={true}
                />
              </>
            )}
          </div>
        </div>

        {/* Navegação */}
        <div className="no-print text-center space-y-3">
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
