import Link from 'next/link'
import { Calendar, Clock, MapPin, Users, Tag } from 'lucide-react'
import type { Event } from '@/types/database'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import AddToCartButton from './AddToCartButton'

interface EventCardProps {
  event: Event
  availableSpots: number
  halfPriceAvailable?: number
}

export default function EventCard({ event, availableSpots, halfPriceAvailable = 0 }: EventCardProps) {
  return (
    <Link
      href={`/evento/${event.id}`}
      className="group block bg-white rounded-2xl overflow-hidden shadow-[0_2px_15px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(91,45,142,0.15)]"
    >
      {/* Image / Placeholder */}
      <div className="relative h-48 overflow-hidden">
        {event.image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple to-cyan" />
        )}

        {/* Category badge */}
        <span className="absolute top-3 right-3 px-3 py-1 bg-white/90 backdrop-blur-sm text-purple text-xs font-semibold font-montserrat rounded-full flex items-center gap-1">
          <Tag className="w-3 h-3" />
          {event.category}
        </span>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-dark text-lg font-bold font-montserrat mb-3 line-clamp-2 group-hover:text-purple transition-colors duration-300">
          {event.title}
        </h3>

        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-2 text-dark/60 text-sm font-montserrat">
            <Calendar className="w-4 h-4 text-orange" />
            <span>{formatDate(event.event_date)}</span>
          </div>

          <div className="flex items-center gap-2 text-dark/60 text-sm font-montserrat">
            <Clock className="w-4 h-4 text-orange" />
            <span>
              {formatTime(event.start_time)}
              {event.end_time ? ` - ${formatTime(event.end_time)}` : ''}
            </span>
          </div>

          {event.location && (
            <div className="flex items-center gap-2 text-dark/60 text-sm font-montserrat">
              <MapPin className="w-4 h-4 text-orange" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-purple font-bold font-montserrat text-lg">
            {event.price === 0 ? 'Gratuito' : formatCurrency(event.price)}
          </span>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-montserrat">
              <Users className="w-4 h-4 text-cyan" />
              <span
                className={`font-semibold ${
                  availableSpots <= 0
                    ? 'text-red-500'
                    : availableSpots <= 10
                      ? 'text-orange'
                      : 'text-cyan'
                }`}
              >
                {availableSpots <= 0
                  ? 'Esgotado'
                  : `${availableSpots} ${availableSpots === 1 ? 'vaga' : 'vagas'}`}
              </span>
            </div>

            <AddToCartButton
              event={event}
              availableSpots={availableSpots}
              halfPriceAvailable={halfPriceAvailable}
            />
          </div>
        </div>
      </div>
    </Link>
  )
}
