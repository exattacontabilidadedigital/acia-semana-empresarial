'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState, useCallback } from 'react'
import type { Event } from '@/types/database'
import EventCard from './EventCard'

const EVENTS_PER_PAGE = 9

interface EventWithSpots extends Event {
  confirmedCount: number
}

interface Category {
  value: string
  label: string
}

interface EventsListClientProps {
  events: EventWithSpots[]
  categories: Category[]
  totalCount: number
  currentPage: number
  category?: string
  search?: string
}

function EventsListInner({
  events,
  categories,
  totalCount,
  currentPage,
  category,
  search,
}: EventsListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState(search ?? '')

  const totalPages = Math.ceil(totalCount / EVENTS_PER_PAGE)

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      })

      if (!('page' in updates)) {
        params.delete('page')
      }

      router.push(`/eventos?${params.toString()}`)
    },
    [router, searchParams]
  )

  const handleCategoryFilter = (cat: string | undefined) => {
    updateParams({ category: cat })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateParams({ search: searchInput || undefined })
  }

  const handlePageChange = (page: number) => {
    updateParams({ page: page > 1 ? String(page) : undefined })
  }

  return (
    <section className="max-w-7xl mx-auto px-6 py-12">
      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCategoryFilter(undefined)}
            className={`px-5 py-2.5 rounded-md font-montserrat font-semibold text-sm transition-all duration-300 ${
              !category
                ? 'bg-orange text-white'
                : 'bg-purple text-white hover:opacity-85 hover:-translate-y-0.5'
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => handleCategoryFilter(cat.value)}
              className={`px-5 py-2.5 rounded-md font-montserrat font-semibold text-sm transition-all duration-300 ${
                category === cat.value
                  ? 'bg-orange text-white'
                  : 'bg-purple text-white hover:opacity-85 hover:-translate-y-0.5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 min-w-0">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar evento..."
            className="w-full md:w-64 px-4 py-2.5 border-2 border-gray-200 rounded-xl font-montserrat text-sm text-dark bg-white transition-colors duration-300 focus:outline-none focus:border-purple"
          />
          <button
            type="submit"
            className="px-6 py-2.5 bg-orange text-white rounded-xl font-semibold font-montserrat text-sm hover:bg-orange-dark transition-all duration-300"
          >
            Buscar
          </button>
        </form>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        {totalCount} {totalCount === 1 ? 'evento encontrado' : 'eventos encontrados'}
      </p>

      {events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              availableSpots={event.capacity - event.confirmedCount}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">
            Nenhum evento encontrado.
          </p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-12">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="w-9 h-9 rounded-md bg-transparent text-gray-500 text-sm transition-all hover:bg-purple hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            &lsaquo;
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`w-9 h-9 rounded-md text-sm font-montserrat transition-all duration-300 ${
                page === currentPage
                  ? 'font-bold text-dark text-lg'
                  : 'text-gray-500 hover:bg-purple hover:text-white'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="w-9 h-9 rounded-md bg-transparent text-gray-500 text-sm transition-all hover:bg-purple hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            &rsaquo;
          </button>
        </div>
      )}
    </section>
  )
}

export default function EventsListClient(props: EventsListClientProps) {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">Carregando...</div>}>
      <EventsListInner {...props} />
    </Suspense>
  )
}
