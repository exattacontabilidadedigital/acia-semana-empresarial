'use client'

import Image from 'next/image'
import { Calendar, Clock, MapPin, Check } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import AddToCartButton from './AddToCartButton'
import type { Event } from '@/types/database'

interface InscricaoEventCardProps {
  event: Event
  availableSpots: number
  halfPriceAvailable: number
}

export default function InscricaoEventCard({
  event,
  availableSpots,
  halfPriceAvailable,
}: InscricaoEventCardProps) {
  const { cart } = useCart()
  const isInCart = cart.some((i) => i.eventId === event.id)
  const isFree = event.price === 0
  const isSoldOut = availableSpots === 0

  return (
    <article
      className="bg-white rounded-2xl transition-all border-2 overflow-hidden"
      style={{
        borderColor: isInCart ? 'var(--verde-600)' : 'var(--line)',
        boxShadow: isInCart
          ? '0 8px 24px rgba(143,180,44,0.18)'
          : undefined,
        background: isInCart ? 'rgba(166,206,58,0.08)' : '#fff',
      }}
    >
      <div
        className="grid grid-cols-1 md:grid-cols-[80px_1fr_auto] gap-5 items-start"
        style={{ padding: 24 }}
      >
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
                background: 'linear-gradient(135deg, var(--azul), var(--ciano))',
              }}
            />
          )}
        </div>

        <div className="min-w-0">
          <h3
            className="display mb-2"
            style={{ fontSize: 24, letterSpacing: '-.02em' }}
          >
            {event.title}
          </h3>
          <div className="flex items-center flex-wrap gap-2 mb-3">
            <span
              className="mono text-[11px] tracking-[0.08em] font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background: 'rgba(248,130,30,0.12)',
                color: 'var(--laranja-600)',
              }}
            >
              <Calendar size={11} />
              {formatDate(event.event_date)}
            </span>
            <span
              className="mono text-[11px] tracking-[0.08em] font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background: 'rgba(86,198,208,0.15)',
                color: 'var(--ciano-600)',
              }}
            >
              <Clock size={11} />
              {formatTime(event.start_time)}
              {event.end_time ? ` — ${formatTime(event.end_time)}` : ''}
            </span>
            {event.location && (
              <span
                className="mono text-[11px] tracking-[0.08em] font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{
                  background: 'rgba(166,206,58,0.18)',
                  color: 'var(--verde-600)',
                }}
              >
                <MapPin size={11} />
                {event.location}
              </span>
            )}
          </div>
          <div
            className="mono text-[11px] tracking-[0.05em]"
            style={{
              color: isSoldOut ? 'var(--laranja-600)' : 'var(--ink-50)',
            }}
          >
            {isSoldOut ? 'ESGOTADO' : `${availableSpots} vagas disponíveis`}
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 md:min-w-[140px]">
          {isFree ? (
            <div
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold mono tracking-[0.06em]"
              style={{ background: 'var(--verde)', color: '#1a3300' }}
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

      {isInCart && (
        <div
          className="flex items-center justify-center gap-1.5 mono text-[10px] font-bold tracking-[0.1em] py-2"
          style={{ background: 'var(--verde-600)', color: '#fff' }}
        >
          <Check size={12} strokeWidth={3} />
          NA PROGRAMAÇÃO
        </div>
      )}
    </article>
  )
}
