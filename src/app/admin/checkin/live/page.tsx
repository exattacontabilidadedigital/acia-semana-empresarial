'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react'

interface EventLiveStat {
  id: number
  title: string
  event_date: string
  start_time: string
  end_time: string | null
  location: string | null
  capacity: number
  total_tickets: number
  checked_in: number
  active: number
  percentage: number
}

interface ApiResponse {
  events: EventLiveStat[]
  generated_at: string
}

const POLL_INTERVAL_MS = 5_000

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${date}T12:00:00`))
}

function formatTime(time: string | null): string {
  if (!time) return ''
  return time.slice(0, 5)
}

function formatRelative(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 5) return 'agora'
  if (seconds < 60) return `há ${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `há ${minutes}min`
  return new Date(iso).toLocaleTimeString('pt-BR')
}

export default function AdminCheckinLivePage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState(Date.now())

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/checkin/live', { cache: 'no-store' })
      if (!res.ok) {
        setError('Erro ao carregar dados')
        return
      }
      const json = (await res.json()) as ApiResponse
      setData(json)
      setError('')
      setLastUpdate(Date.now())
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  // Re-render do "há Xs" a cada 1s
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Agrupa eventos por data
  const byDate = new Map<string, EventLiveStat[]>()
  for (const ev of data?.events ?? []) {
    const arr = byDate.get(ev.event_date) ?? []
    arr.push(ev)
    byDate.set(ev.event_date, arr)
  }

  // Totais consolidados
  const totals = (data?.events ?? []).reduce(
    (acc, ev) => ({
      total: acc.total + ev.total_tickets,
      checkedIn: acc.checkedIn + ev.checked_in,
      events: acc.events + 1,
    }),
    { total: 0, checkedIn: 0, events: 0 },
  )

  return (
    <main className="min-h-screen" style={{ background: 'var(--paper-2)' }}>
      <div className="container-site" style={{ padding: '32px 0' }}>
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <div className="eyebrow mb-2">
              <span className="dot" />
              CHECK-IN AO VIVO
            </div>
            <h1 className="display" style={{ fontSize: 32, letterSpacing: '-.02em' }}>
              Quem entrou{' '}
              <span style={{ color: 'var(--laranja)' }}>agora</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-full"
              style={{ background: 'white', border: '1px solid var(--line)' }}
            >
              {!error ? (
                <>
                  <span
                    className="w-2 h-2 rounded-full block"
                    style={{ background: 'var(--verde-600)', animation: 'pulse 2s infinite' }}
                  />
                  <span className="text-xs font-semibold">Ao vivo</span>
                  <span className="text-[11px]" style={{ color: 'var(--ink-50)' }}>
                    · atualizado {formatRelative(new Date(lastUpdate).toISOString())}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full block bg-red-500" />
                  <span className="text-xs font-semibold text-red-600">Conexão perdida</span>
                </>
              )}
            </div>
            <button
              onClick={fetchData}
              className="btn btn-ghost"
              style={{ padding: '8px 14px', fontSize: 12 }}
              title="Atualizar agora"
            >
              <RefreshCw size={13} />
              Atualizar
            </button>
            <Link
              href="/admin/checkin"
              className="btn btn-primary"
              style={{ padding: '8px 14px', fontSize: 12 }}
            >
              Scanner
            </Link>
          </div>
        </div>

        {/* Totais consolidados */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--ink)', color: 'white' }}
          >
            <div className="mono text-[10px] tracking-[0.1em]" style={{ opacity: 0.6 }}>
              EVENTOS ATIVOS
            </div>
            <div className="display mt-1" style={{ fontSize: 36, letterSpacing: '-.02em' }}>
              {totals.events}
            </div>
          </div>
          <div
            className="rounded-2xl p-5"
            style={{ background: 'white', border: '1px solid var(--line)' }}
          >
            <div className="mono text-[10px] tracking-[0.1em]" style={{ color: 'var(--ink-50)' }}>
              INGRESSOS VENDIDOS
            </div>
            <div className="display mt-1" style={{ fontSize: 36, letterSpacing: '-.02em' }}>
              {totals.total}
            </div>
          </div>
          <div
            className="rounded-2xl p-5"
            style={{ background: 'rgba(166,206,58,0.15)', border: '1px solid var(--verde-600)' }}
          >
            <div className="mono text-[10px] tracking-[0.1em]" style={{ color: 'var(--verde-600)' }}>
              CHECK-IN REALIZADO
            </div>
            <div
              className="display mt-1"
              style={{ fontSize: 36, letterSpacing: '-.02em', color: 'var(--verde-600)' }}
            >
              {totals.checkedIn}
              <span className="text-base ml-2" style={{ color: 'var(--ink-70)' }}>
                {totals.total > 0
                  ? `(${Math.round((totals.checkedIn / totals.total) * 100)}%)`
                  : ''}
              </span>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-16">
            <Loader2 className="animate-spin mx-auto mb-3" />
            <p className="text-sm" style={{ color: 'var(--ink-70)' }}>
              Carregando dados...
            </p>
          </div>
        )}

        {!loading && (data?.events.length ?? 0) === 0 && (
          <div
            className="rounded-2xl text-center"
            style={{ background: 'white', border: '1px solid var(--line)', padding: '64px 32px' }}
          >
            <Activity size={40} className="mx-auto mb-3" style={{ color: 'var(--ink-50)' }} />
            <h3 className="display mb-2" style={{ fontSize: 20 }}>
              Nenhum evento ativo agora
            </h3>
            <p className="text-sm" style={{ color: 'var(--ink-70)' }}>
              Não há eventos agendados para hoje ou os próximos 2 dias.
            </p>
          </div>
        )}

        {!loading && (data?.events.length ?? 0) > 0 && (
          <div className="flex flex-col gap-6">
            {Array.from(byDate.entries()).map(([date, events]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={14} style={{ color: 'var(--ink-50)' }} />
                  <span className="mono text-[11px] tracking-[0.1em] uppercase font-semibold">
                    {formatDate(date)}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {events.map((ev) => {
                    const isFull = ev.checked_in >= ev.total_tickets && ev.total_tickets > 0
                    return (
                      <div
                        key={ev.id}
                        className="rounded-2xl p-5"
                        style={{
                          background: 'white',
                          border: `1px solid ${isFull ? 'var(--verde-600)' : 'var(--line)'}`,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <h3
                            className="display"
                            style={{ fontSize: 17, letterSpacing: '-.02em', lineHeight: 1.2 }}
                          >
                            {ev.title}
                          </h3>
                          {isFull && (
                            <CheckCircle
                              size={18}
                              style={{ color: 'var(--verde-600)', flexShrink: 0 }}
                            />
                          )}
                        </div>

                        <div
                          className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] mb-4"
                          style={{ color: 'var(--ink-70)' }}
                        >
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {formatTime(ev.start_time)}
                            {ev.end_time ? ` – ${formatTime(ev.end_time)}` : ''}
                          </span>
                          {ev.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={11} />
                              {ev.location}
                            </span>
                          )}
                          {ev.capacity > 0 && (
                            <span className="flex items-center gap-1">
                              <Users size={11} />
                              cap. {ev.capacity}
                            </span>
                          )}
                        </div>

                        {/* Barra de progresso */}
                        <div
                          className="rounded-full overflow-hidden mb-2"
                          style={{ background: 'var(--paper-2)', height: 8 }}
                        >
                          <div
                            style={{
                              width: `${ev.percentage}%`,
                              height: '100%',
                              background: isFull
                                ? 'var(--verde-600)'
                                : 'linear-gradient(90deg, var(--azul), var(--ciano-600))',
                              transition: 'width 0.5s ease',
                            }}
                          />
                        </div>

                        <div className="flex justify-between items-baseline">
                          <div>
                            <span
                              className="display"
                              style={{ fontSize: 24, letterSpacing: '-.02em' }}
                            >
                              {ev.checked_in}
                            </span>
                            <span
                              className="text-sm ml-1"
                              style={{ color: 'var(--ink-70)' }}
                            >
                              / {ev.total_tickets}
                            </span>
                          </div>
                          <div
                            className="mono text-xs font-semibold"
                            style={{
                              color: isFull ? 'var(--verde-600)' : 'var(--azul)',
                            }}
                          >
                            {ev.percentage}%
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </main>
  )
}
