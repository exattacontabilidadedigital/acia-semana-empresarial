import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import type { Event } from '@/types/database'
import EventPageActions from './actions'
import { CalendarDays, Clock, MapPin, Tag, Users, ArrowLeft } from 'lucide-react'

interface EventPageProps {
  params: { id: string }
}

export default async function EventPage({ params }: EventPageProps) {
  const supabase = createServerSupabaseClient()

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', Number(params.id))
    .single()

  if (error || !event) {
    notFound()
  }

  const { count: confirmedCount } = await supabase
    .from('inscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .in('payment_status', ['confirmed', 'free'])

  const totalConfirmed = confirmedCount ?? 0
  const availableSpots = event.capacity - totalConfirmed

  // Contar meia-entradas usadas
  const { count: halfPriceUsed } = await supabase
    .from('inscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .eq('is_half_price', true)
    .in('payment_status', ['confirmed', 'free', 'pending'])

  const halfPriceTotal = event.half_price ?? 0
  const halfPriceAvailable = Math.max(0, halfPriceTotal - (halfPriceUsed ?? 0))

  return (
    <main className="min-h-screen bg-[#F5F5FA]">
      {/* Header compacto do evento */}
      <div className="bg-gradient-to-br from-purple to-purple-dark">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Link href="/eventos" className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft size={16} />
            Voltar para eventos
          </Link>
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
            {event.image_url && (
              <div className="relative w-full md:w-48 h-32 md:h-28 rounded-xl overflow-hidden flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.image_url}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white mb-2">
                {event.category}
              </span>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {event.title}
              </h1>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-white/80 text-sm">
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={14} />
                  {formatDate(event.event_date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {formatTime(event.start_time)}{event.end_time ? ` - ${formatTime(event.end_time)}` : ''}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} />
                    {event.location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Tag size={14} />
                  {event.price === 0 ? 'Gratuito' : formatCurrency(event.price)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={14} />
                  {availableSpots > 0 ? `${availableSpots} vagas` : 'Esgotado'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Descrição (coluna menor) */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {event.image_url ? (
                <div className="w-full h-56 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-purple to-cyan" />
              )}
              <div className="p-6">
                <h2 className="text-lg font-bold text-dark mb-3">Sobre o evento</h2>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>

                {event.price > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Valores</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Inteira</span>
                      <span className="font-semibold text-dark">{formatCurrency(event.price)}</span>
                    </div>
                    {halfPriceTotal > 0 && (
                      <>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-gray-600">Meia-entrada (50%)</span>
                          <span className="font-semibold text-dark">{formatCurrency(event.price / 2)}</span>
                        </div>
                        <div className="mt-2 text-xs">
                          {halfPriceAvailable > 0 ? (
                            <span className="text-green-600 font-semibold">
                              {halfPriceAvailable} {halfPriceAvailable === 1 ? 'vaga' : 'vagas'} meia-entrada {halfPriceAvailable === 1 ? 'disponível' : 'disponíveis'}
                            </span>
                          ) : (
                            <span className="text-red-500 font-semibold">Meia-entrada esgotada</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ações (coluna direita - sticky) */}
          <div className="lg:col-span-2">
            <div className="sticky top-24">
              {availableSpots > 0 ? (
                <EventPageActions
                  event={event}
                  availableSpots={availableSpots}
                  halfPriceAvailable={halfPriceAvailable}
                />
              ) : (
                <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                  <p className="text-lg font-semibold text-red-500 mb-4">
                    Este evento está esgotado.
                  </p>
                  <Link href="/eventos" className="btn btn-purple inline-block">
                    Ver outros eventos
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
