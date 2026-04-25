'use client'

import { useMemo, useState } from 'react'
import { Search, Filter, Calendar as CalendarIcon, X } from 'lucide-react'
import InscricaoEventCard from '@/components/eventos/InscricaoEventCard'
import type { Event } from '@/types/database'

type EventWithCounts = Event & {
  inscriptionsCount: number
  halfPriceUsed: number
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'var(--paper)',
  border: '1px solid var(--line)',
  borderRadius: 10,
  fontSize: 14,
  fontFamily: 'inherit',
}

function formatDayShort(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${dateStr}T12:00:00`))
}

function dayOfWeek(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(
    new Date(`${dateStr}T12:00:00`),
  )
}

export default function InscricoesListClient({
  events,
}: {
  events: EventWithCounts[]
}) {
  const [search, setSearch] = useState('')
  const [dayFilter, setDayFilter] = useState<string | null>(null)

  // Datas únicas presentes na programação (em ordem)
  const availableDays = useMemo(() => {
    const set = new Set<string>()
    for (const ev of events) set.add(ev.event_date)
    return Array.from(set).sort()
  }, [events])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return events.filter((ev) => {
      if (dayFilter && ev.event_date !== dayFilter) return false
      if (!term) return true
      const haystack = [
        ev.title,
        ev.description ?? '',
        ev.location ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [events, search, dayFilter])

  const hasFilters = search.length > 0 || dayFilter !== null

  return (
    <>
      {/* Toolbar de busca/filtro */}
      <div
        className="bg-white border border-line rounded-2xl mb-6"
        style={{ padding: 16 }}
      >
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--ink-50)' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome do evento, descrição ou local..."
              style={{ ...inputStyle, paddingLeft: 36 }}
              aria-label="Buscar eventos"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--ink-50)' }}
                aria-label="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {availableDays.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={14} style={{ color: 'var(--ink-50)' }} />
              <button
                type="button"
                onClick={() => setDayFilter(null)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                style={{
                  background: dayFilter === null ? 'var(--ink)' : 'var(--paper-2)',
                  color: dayFilter === null ? 'white' : 'var(--ink-70)',
                }}
              >
                Todos
              </button>
              {availableDays.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setDayFilter(day)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                  style={{
                    background: dayFilter === day ? 'var(--azul)' : 'var(--paper-2)',
                    color: dayFilter === day ? 'white' : 'var(--ink-70)',
                  }}
                >
                  <CalendarIcon size={12} />
                  {dayOfWeek(day)} · {formatDayShort(day)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lista filtrada */}
      {filtered.length === 0 ? (
        <div
          className="bg-white border border-line rounded-2xl text-center"
          style={{ padding: '48px 32px' }}
        >
          <Search
            size={32}
            className="mx-auto mb-3"
            style={{ color: 'var(--ink-50)', opacity: 0.5 }}
          />
          <h3 className="display mb-2" style={{ fontSize: 20, letterSpacing: '-.02em' }}>
            Nenhum evento encontrado
          </h3>
          <p className="text-sm" style={{ color: 'var(--ink-70)' }}>
            {hasFilters
              ? 'Tente outros termos ou limpe os filtros.'
              : 'A programação completa será divulgada em breve.'}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setDayFilter(null)
              }}
              className="btn btn-ghost mt-4"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="mono text-[11px] tracking-[0.1em] uppercase mb-4" style={{ color: 'var(--ink-50)' }}>
            {filtered.length} {filtered.length === 1 ? 'evento' : 'eventos'}
            {hasFilters ? ' encontrado' + (filtered.length === 1 ? '' : 's') : ''}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((event) => {
              const availableSpots = Math.max(
                0,
                event.capacity - event.inscriptionsCount,
              )
              const halfPriceAvailable = Math.max(
                0,
                (event.half_price || 0) - event.halfPriceUsed,
              )
              return (
                <InscricaoEventCard
                  key={event.id}
                  event={event}
                  availableSpots={availableSpots}
                  halfPriceAvailable={halfPriceAvailable}
                />
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
