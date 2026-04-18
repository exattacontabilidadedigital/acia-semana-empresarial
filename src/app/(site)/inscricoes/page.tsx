import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Calendar, Clock, MapPin, Search } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import AddToCartButton from '@/components/eventos/AddToCartButton'
import type { Event } from '@/types/database'

type EventWithCounts = Event & {
  inscriptionsCount: number
  halfPriceUsed: number
}

async function getEvents(): Promise<EventWithCounts[]> {
  const supabase = createServerSupabaseClient()

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'active')
    .order('event_date', { ascending: true })

  if (!events || events.length === 0) return []

  const ids = events.map((e) => e.id)
  const { data: counts } = await supabase
    .from('inscriptions')
    .select('event_id, quantity, is_half_price, payment_status')
    .in('event_id', ids)
    .in('payment_status', ['confirmed', 'pending', 'free'])

  return events.map((ev) => {
    const evCounts = counts?.filter((c) => c.event_id === ev.id) ?? []
    const inscriptionsCount = evCounts.reduce((acc, c) => acc + (c.quantity || 0), 0)
    const halfPriceUsed = evCounts
      .filter((c) => c.is_half_price)
      .reduce((acc, c) => acc + (c.quantity || 0), 0)
    return { ...ev, inscriptionsCount, halfPriceUsed }
  })
}

export const metadata = {
  title: 'Inscrições · Semana Empresarial de Açailândia',
  description:
    'Garanta sua vaga nas atividades da Semana Empresarial de Açailândia 2026. Palestras, oficinas, rodadas de negócios e mais.',
}

export default async function InscricoesPage() {
  const events = await getEvents()

  return (
    <div className="page-enter">
      <section style={{ padding: '64px 0 32px' }}>
        <div className="container-site">
          <div className="eyebrow mb-6">
            <span className="dot" />
            INSCRIÇÕES · 6ª EDIÇÃO
          </div>
          <h1
            className="display mb-6"
            style={{ fontSize: 'clamp(48px, 8vw, 120px)', maxWidth: 1100 }}
          >
            Garanta sua <span style={{ color: 'var(--laranja)' }}>vaga</span>.
          </h1>
          <p
            className="text-lg leading-relaxed"
            style={{ color: 'var(--ink-70)', maxWidth: 700 }}
          >
            Escolha as atividades que você quer participar. Algumas são gratuitas, outras com valor
            simbólico. Adicione ao carrinho e finalize a inscrição.
          </p>

          <div className="mt-10 pt-8 flex flex-wrap items-center gap-4" style={{ borderTop: '1px solid var(--line)' }}>
            <Link
              href="/inscricoes/minhas"
              className="btn btn-ghost"
            >
              <Search size={14} />
              Já se inscreveu? Ver minhas inscrições
            </Link>
            <Link href="/carrinho" className="btn btn-ghost">
              Ver carrinho <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section style={{ padding: '24px 0 96px' }}>
        <div className="container-site">
          <div className="eyebrow mb-6">
            <span className="dot" />
            ATIVIDADES DISPONÍVEIS · {events.length} {events.length === 1 ? 'evento' : 'eventos'}
          </div>

          {events.length === 0 ? (
            <div
              className="bg-white border border-line rounded-2xl text-center"
              style={{ padding: '64px 32px' }}
            >
              <div
                className="w-14 h-14 rounded-full grid place-items-center mx-auto mb-4"
                style={{ background: 'var(--paper-2)' }}
              >
                <Calendar size={22} />
              </div>
              <h3
                className="display mb-2"
                style={{ fontSize: 22, letterSpacing: '-.02em' }}
              >
                Nenhum evento disponível no momento
              </h3>
              <p className="text-sm" style={{ color: 'var(--ink-70)' }}>
                A programação completa será divulgada em breve. Acompanhe nossas redes.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {events.map((event) => {
                const availableSpots = Math.max(
                  0,
                  event.capacity - event.inscriptionsCount,
                )
                const halfPriceAvailable = Math.max(
                  0,
                  (event.half_price || 0) - event.halfPriceUsed,
                )
                const isFree = event.price === 0
                const isSoldOut = availableSpots === 0

                return (
                  <article
                    key={event.id}
                    className="bg-white border border-line rounded-2xl"
                    style={{ padding: 24 }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[80px_1fr_auto] gap-5 items-start">
                      <div
                        className="rounded-xl overflow-hidden flex-shrink-0"
                        style={{ width: 80, height: 80 }}
                      >
                        {event.image_url ? (
                          <Image
                            src={event.image_url}
                            alt={event.title}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full"
                            style={{
                              background:
                                'linear-gradient(135deg, var(--azul), var(--ciano))',
                            }}
                          />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-2">
                          <span className="mono text-[11px] text-ink-50 tracking-[0.1em] flex items-center gap-1.5">
                            <Calendar size={11} />
                            {formatDate(event.event_date)}
                          </span>
                          <span
                            className="block w-1 h-1 rounded-full"
                            style={{ background: 'var(--ink-50)' }}
                          />
                          <span className="mono text-[11px] text-ink-50 tracking-[0.1em] flex items-center gap-1.5">
                            <Clock size={11} />
                            {formatTime(event.start_time)}
                            {event.end_time ? ` — ${formatTime(event.end_time)}` : ''}
                          </span>
                          {event.location && (
                            <>
                              <span
                                className="block w-1 h-1 rounded-full"
                                style={{ background: 'var(--ink-50)' }}
                              />
                              <span className="mono text-[11px] text-ink-50 tracking-[0.1em] flex items-center gap-1.5">
                                <MapPin size={11} />
                                {event.location}
                              </span>
                            </>
                          )}
                        </div>
                        <h3
                          className="display mb-2"
                          style={{ fontSize: 24, letterSpacing: '-.02em' }}
                        >
                          {event.title}
                        </h3>
                        <p
                          className="line-clamp-2"
                          style={{
                            fontSize: 14,
                            color: 'var(--ink-70)',
                            lineHeight: 1.55,
                          }}
                        >
                          {event.description}
                        </p>
                        <div
                          className="mt-3 mono text-[11px] tracking-[0.05em]"
                          style={{ color: isSoldOut ? 'var(--laranja-600)' : 'var(--ink-50)' }}
                        >
                          {isSoldOut
                            ? 'ESGOTADO'
                            : `${availableSpots} vagas disponíveis`}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 md:min-w-[140px]">
                        {isFree ? (
                          <div
                            className="px-3 py-1.5 rounded-full text-[11px] font-semibold mono tracking-[0.06em]"
                            style={{
                              background: 'var(--verde)',
                              color: '#1a3300',
                            }}
                          >
                            GRATUITO
                          </div>
                        ) : (
                          <div
                            className="display"
                            style={{ fontSize: 28, letterSpacing: '-.02em' }}
                          >
                            {formatCurrency(event.price)}
                          </div>
                        )}
                        {!isSoldOut && (
                          <AddToCartButton
                            event={event}
                            availableSpots={availableSpots}
                            halfPriceAvailable={halfPriceAvailable}
                          />
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {/* Footer CTA */}
          <div
            className="mt-12 rounded-2xl flex justify-between items-center flex-wrap gap-6"
            style={{ background: 'var(--paper-2)', padding: '40px 32px' }}
          >
            <div>
              <div className="eyebrow mb-2">
                <span className="dot" />
                JÁ ESCOLHEU?
              </div>
              <h3 className="display" style={{ fontSize: 24, letterSpacing: '-.02em' }}>
                Finalize sua inscrição no carrinho
              </h3>
            </div>
            <Link href="/carrinho" className="btn btn-primary btn-lg">
              Ir para o carrinho <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
