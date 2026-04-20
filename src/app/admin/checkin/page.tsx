'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCPF } from '@/lib/utils'
import { QrCode, Search, CheckCircle, XCircle, Loader2, Camera, CameraOff, Users, BarChart3 } from 'lucide-react'
import type { Event } from '@/types/database'

type CheckinResult = {
  success: boolean
  message: string
}

type TicketRow = {
  id: string
  participant_name: string
  status: string
  checked_in_at: string | null
  inscription_id: number
}

type RecentCheckin = {
  id: string
  participant_name: string
  checked_in_at: string
}

type CheckinStats = {
  total: number
  checkedIn: number
  remaining: number
  percentage: number
}

type ScannedTicket = {
  id: string
  status: string
  checked_in_at: string | null
}

type ScannedInscription = {
  id: number
  order_number: string
  event: {
    id: number
    title: string
    event_date: string
    start_time: string
    end_time: string
    location: string
  } | null
  quantity: number
  is_half_price: boolean
  payment_status: string
  tickets_total: number
  tickets_active: number
  tickets_used: number
  tickets: ScannedTicket[]
}

type ScannedData = {
  success: boolean
  type: 'group' | 'order'
  purchase_group?: string
  participant: {
    nome: string
    email: string
    cpf: string
  }
  inscriptions?: ScannedInscription[]
  inscription?: ScannedInscription
  message?: string
}

export default function AdminCheckinPage() {
  const supabase = createClient()
  const [events, setEvents] = useState<Pick<Event, 'id' | 'title'>[]>([])
  const [selectedEvent, setSelectedEvent] = useState('')
  const [activeTab, setActiveTab] = useState<'qr' | 'cpf'>('qr')
  const [loading, setLoading] = useState(true)

  // QR Scanner
  const [scannerActive, setScannerActive] = useState(false)
  const scannerRef = useRef<any>(null)
  const scannerContainerId = 'qr-reader'

  // QR / manual ticket input
  const [ticketId, setTicketId] = useState('')
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<CheckinResult | null>(null)

  // Scanned data (from QR)
  const [scannedData, setScannedData] = useState<ScannedData | null>(null)
  const [processingTicket, setProcessingTicket] = useState<string | null>(null)

  // CPF search
  const [cpf, setCpf] = useState('')
  const [searching, setSearching] = useState(false)
  const [tickets, setTickets] = useState<TicketRow[]>([])

  // Recent check-ins
  const [recentCheckins, setRecentCheckins] = useState<RecentCheckin[]>([])

  // Stats
  const [stats, setStats] = useState<CheckinStats>({ total: 0, checkedIn: 0, remaining: 0, percentage: 0 })

  useEffect(() => {
    async function init() {
      const { data } = await supabase
        .from('events')
        .select('id, title')
        .order('event_date', { ascending: false })
      setEvents(data ?? [])
      setLoading(false)
    }
    init()
  }, [])

  // Fetch stats for selected event
  const fetchStats = useCallback(async () => {
    if (!selectedEvent) return

    const { count: total } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', Number(selectedEvent))

    const { count: checkedIn } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', Number(selectedEvent))
      .eq('status', 'used')

    const t = total ?? 0
    const c = checkedIn ?? 0
    const r = t - c

    setStats({
      total: t,
      checkedIn: c,
      remaining: r,
      percentage: t > 0 ? Math.round((c / t) * 100) : 0,
    })
  }, [selectedEvent])

  useEffect(() => {
    if (selectedEvent) {
      fetchRecentCheckins()
      fetchStats()
    }
  }, [selectedEvent, fetchStats])

  // Auto-refresh stats every 10 seconds
  useEffect(() => {
    if (!selectedEvent) return

    const interval = setInterval(() => {
      fetchStats()
      fetchRecentCheckins()
    }, 10000)

    return () => clearInterval(interval)
  }, [selectedEvent, fetchStats])

  // Cleanup scanner on unmount or tab change
  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  async function startScanner() {
    try {
      const { Html5Qrcode } = await import('html5-qrcode')

      // Small delay to ensure DOM element exists
      await new Promise((resolve) => setTimeout(resolve, 100))

      const container = document.getElementById(scannerContainerId)
      if (!container) return

      const scanner = new Html5Qrcode(scannerContainerId)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          handleQrScanned(decodedText)
        },
        () => {
          // ignore scan failures (no QR in frame)
        }
      )

      setScannerActive(true)
    } catch (err) {
      console.error('Erro ao iniciar scanner:', err)
      setResult({ success: false, message: 'Erro ao acessar a camera. Verifique as permissoes do navegador.' })
    }
  }

  async function stopScanner() {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState()
        // state 2 = scanning
        if (state === 2) {
          await scannerRef.current.stop()
        }
        scannerRef.current.clear()
        scannerRef.current = null
      }
    } catch {
      // ignore cleanup errors
    }
    setScannerActive(false)
  }

  async function handleQrScanned(decodedText: string) {
    // Stop scanner after successful scan
    await stopScanner()

    setResult(null)
    setScannedData(null)
    setValidating(true)

    // Parse URL to extract identifier
    // Formats: https://site/checkin/PG-XXXXX or https://site/checkin/SE-XXXXX
    let identifier = decodedText.trim()

    // Try to extract from URL
    const urlMatch = identifier.match(/\/checkin\/((?:PG|SE)-[A-Za-z0-9]+)/)
    if (urlMatch) {
      identifier = urlMatch[1]
    }

    // If it's not a PG/SE format, check if it's a raw identifier
    if (!identifier.match(/^(PG|SE)-/i)) {
      // Try as ticket ID directly
      setTicketId(identifier)
      setValidating(false)
      return
    }

    // Determine param type
    const paramKey = identifier.toUpperCase().startsWith('PG-') ? 'group' : 'order'

    try {
      const res = await fetch(`/api/checkin/validate?${paramKey}=${identifier}`)
      const data = await res.json()

      if (!res.ok || !data.success) {
        setResult({ success: false, message: data.message || 'Inscricao nao encontrada' })
        setValidating(false)
        return
      }

      setScannedData(data as ScannedData)
    } catch {
      setResult({ success: false, message: 'Erro de conexao ao validar QR code' })
    } finally {
      setValidating(false)
    }
  }

  async function handleCheckinTicket(ticketId: string) {
    setProcessingTicket(ticketId)
    setResult(null)

    try {
      const res = await fetch('/api/checkin/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId }),
      })
      const data = await res.json()
      setResult({
        success: res.ok,
        message: data.message || (res.ok ? 'Check-in realizado com sucesso!' : 'Erro no check-in'),
      })
      if (res.ok) {
        // Update scanned data to reflect check-in
        setScannedData((prev) => {
          if (!prev) return prev
          const updateTickets = (tickets: ScannedTicket[]) =>
            tickets.map((t) =>
              t.id === ticketId ? { ...t, status: 'used', checked_in_at: new Date().toISOString() } : t
            )

          if (prev.type === 'group' && prev.inscriptions) {
            return {
              ...prev,
              inscriptions: prev.inscriptions.map((ins) => ({
                ...ins,
                tickets: updateTickets(ins.tickets),
                tickets_active: ins.tickets.filter((t) => t.id !== ticketId && t.status === 'active').length,
                tickets_used: ins.tickets.filter((t) => t.id === ticketId || t.status === 'used').length,
              })),
            }
          }

          if (prev.type === 'order' && prev.inscription) {
            return {
              ...prev,
              inscription: {
                ...prev.inscription,
                tickets: updateTickets(prev.inscription.tickets),
                tickets_active: prev.inscription.tickets.filter((t) => t.id !== ticketId && t.status === 'active').length,
                tickets_used: prev.inscription.tickets.filter((t) => t.id === ticketId || t.status === 'used').length,
              },
            }
          }

          return prev
        })
        fetchRecentCheckins()
        fetchStats()
      }
    } catch {
      setResult({ success: false, message: 'Erro de conexao' })
    } finally {
      setProcessingTicket(null)
    }
  }

  async function fetchRecentCheckins() {
    const { data } = await supabase
      .from('tickets')
      .select('id, participant_name, checked_in_at')
      .eq('event_id', Number(selectedEvent))
      .not('checked_in_at', 'is', null)
      .order('checked_in_at', { ascending: false })
      .limit(10)

    setRecentCheckins((data as RecentCheckin[]) ?? [])
  }

  async function handleValidateTicket(e: React.FormEvent) {
    e.preventDefault()
    if (!ticketId.trim()) return
    setValidating(true)
    setResult(null)

    try {
      const res = await fetch('/api/checkin/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId.trim() }),
      })
      const data = await res.json()
      setResult({
        success: res.ok,
        message: data.message || (res.ok ? 'Check-in realizado com sucesso!' : 'Erro no check-in'),
      })
      if (res.ok) {
        setTicketId('')
        fetchRecentCheckins()
        fetchStats()
      }
    } catch {
      setResult({ success: false, message: 'Erro de conexao' })
    } finally {
      setValidating(false)
    }
  }

  async function handleSearchCPF(e: React.FormEvent) {
    e.preventDefault()
    if (!cpf.trim() || !selectedEvent) return
    setSearching(true)
    setTickets([])
    setResult(null)

    const cleanCPF = cpf.replace(/\D/g, '')

    const { data: inscriptions } = await supabase
      .from('inscriptions')
      .select('id')
      .eq('event_id', Number(selectedEvent))
      .eq('cpf', cleanCPF)

    if (!inscriptions || inscriptions.length === 0) {
      setResult({ success: false, message: 'Nenhuma inscricao encontrada para este CPF neste evento.' })
      setSearching(false)
      return
    }

    const inscriptionIds = inscriptions.map((i) => i.id)

    const { data: ticketsData } = await supabase
      .from('tickets')
      .select('id, participant_name, status, checked_in_at, inscription_id')
      .in('inscription_id', inscriptionIds)

    setTickets((ticketsData as TicketRow[]) ?? [])
    setSearching(false)
  }

  async function handleConfirmPresence(ticketId: string) {
    try {
      const res = await fetch('/api/checkin/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId }),
      })
      const data = await res.json()
      setResult({
        success: res.ok,
        message: data.message || (res.ok ? 'Presenca confirmada!' : 'Erro ao confirmar presenca'),
      })
      if (res.ok) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId ? { ...t, checked_in_at: new Date().toISOString() } : t
          )
        )
        fetchRecentCheckins()
        fetchStats()
      }
    } catch {
      setResult({ success: false, message: 'Erro de conexao' })
    }
  }

  function clearScannedData() {
    setScannedData(null)
    setResult(null)
  }

  // Get inscriptions relevant to the selected event from scanned data
  function getScannedInscriptions(): ScannedInscription[] {
    if (!scannedData) return []

    if (scannedData.type === 'group' && scannedData.inscriptions) {
      return scannedData.inscriptions
    }

    if (scannedData.type === 'order' && scannedData.inscription) {
      return [scannedData.inscription]
    }

    return []
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--azul)' }} />
      </div>
    )
  }

  return (
    <div className="page-enter" style={{ color: 'var(--ink)' }}>

      {/* Header */}
      <div className="mb-10">
        <div className="eyebrow mb-4">
          <span className="dot" />
          OPERAÇÃO · CONTROLE DE ACESSO
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
          Check-in
        </h1>
        <p
          className="mt-3"
          style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
        >
          Escaneie QR codes ou busque por CPF para registrar a presença dos
          participantes em tempo real.
        </p>
      </div>

      {/* Event selector */}
      <div
        className="mb-6 rounded-[20px] bg-white p-7"
        style={{ border: '1px solid var(--line)' }}
      >
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="min-w-0">
            <div
              className="mono text-[10px] tracking-[0.14em]"
              style={{ color: 'var(--ink-50)' }}
            >
              EVENTO ATIVO
            </div>
            <h2
              className="display mt-1"
              style={{ fontSize: 22, letterSpacing: '-0.02em' }}
            >
              Selecione o evento
            </h2>
          </div>
        </div>
        <select
          value={selectedEvent}
          onChange={(e) => {
            setSelectedEvent(e.target.value)
            setResult(null)
            setTickets([])
            setScannedData(null)
          }}
          className="admin-input w-full max-w-md px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors"
          style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
        >
          <option value="">-- Selecione --</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
            </option>
          ))}
        </select>
      </div>

      {selectedEvent && (
        <>
          {/* Stats Dashboard */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="TOTAL"
              value={stats.total}
              icon={<Users size={18} />}
              accent="var(--azul)"
              accentBg="var(--azul-50)"
            />
            <StatTile
              label="PRESENTES"
              value={stats.checkedIn}
              icon={<CheckCircle size={18} />}
              accent="var(--verde-600)"
              accentBg="rgba(166,206,58,0.18)"
              valueColor="var(--verde-600)"
            />
            <StatTile
              label="RESTANTES"
              value={stats.remaining}
              icon={<XCircle size={18} />}
              accent="var(--laranja)"
              accentBg="rgba(248,130,30,0.12)"
              valueColor="var(--laranja-600)"
            />
            <StatTile
              label="PROGRESSO"
              value={`${stats.percentage}%`}
              icon={<BarChart3 size={18} />}
              accent="var(--ciano)"
              accentBg="rgba(86,198,208,0.18)"
              valueColor="var(--ciano-600)"
            />
          </div>

          {/* Progress bar */}
          <div
            className="mb-8 rounded-[20px] bg-white p-7"
            style={{ border: '1px solid var(--line)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="mono text-[10px] tracking-[0.14em]"
                style={{ color: 'var(--ink-50)' }}
              >
                PROGRESSO DO CHECK-IN
              </div>
              <div
                className="mono text-[11px]"
                style={{ color: 'var(--ink-70)' }}
              >
                {stats.checkedIn} / {stats.total} ({stats.percentage}%)
              </div>
            </div>
            <div
              className="h-2.5 w-full overflow-hidden rounded-full"
              style={{ background: 'var(--paper-2)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${stats.percentage}%`,
                  background:
                    'linear-gradient(90deg, var(--azul), var(--verde))',
                }}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-2 flex-wrap">
            <button
              onClick={() => {
                setActiveTab('qr')
                setResult(null)
                setScannedData(null)
                stopScanner()
              }}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all"
              style={
                activeTab === 'qr'
                  ? { background: 'var(--azul)', color: 'white' }
                  : {
                      background: 'white',
                      color: 'var(--ink-70)',
                      border: '1px solid var(--line)',
                    }
              }
            >
              <QrCode size={16} />
              QR Code Scanner
            </button>
            <button
              onClick={() => {
                setActiveTab('cpf')
                setResult(null)
                setScannedData(null)
                stopScanner()
              }}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all"
              style={
                activeTab === 'cpf'
                  ? { background: 'var(--azul)', color: 'white' }
                  : {
                      background: 'white',
                      color: 'var(--ink-70)',
                      border: '1px solid var(--line)',
                    }
              }
            >
              <Search size={16} />
              Busca por CPF
            </button>
          </div>

          {/* Result banner */}
          {result && (
            <div
              className="mb-6 flex items-center gap-3 rounded-2xl p-4"
              style={
                result.success
                  ? {
                      background: 'rgba(166,206,58,0.08)',
                      border: '1px solid rgba(166,206,58,0.4)',
                      color: '#3d5a0a',
                    }
                  : {
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#991b1b',
                    }
              }
            >
              {result.success ? (
                <CheckCircle size={20} className="shrink-0" />
              ) : (
                <XCircle size={20} className="shrink-0" />
              )}
              <span className="text-sm font-medium min-w-0">
                {result.message}
              </span>
            </div>
          )}

          {/* QR Tab */}
          {activeTab === 'qr' && (
            <div
              className="rounded-[20px] bg-white p-7"
              style={{ border: '1px solid var(--line)' }}
            >
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="min-w-0">
                  <div
                    className="mono text-[10px] tracking-[0.14em]"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    SCANNER
                  </div>
                  <h2
                    className="display mt-1"
                    style={{ fontSize: 22, letterSpacing: '-0.02em' }}
                  >
                    Leitura de QR Code
                  </h2>
                </div>
              </div>

              {/* Camera scanner area */}
              <div className="mb-5">
                {!scannerActive && !scannedData && (
                  <div
                    className="flex flex-col items-center justify-center rounded-2xl p-10"
                    style={{
                      background: 'var(--paper-2)',
                      border: '1px dashed var(--line)',
                    }}
                  >
                    <div
                      className="rounded-2xl p-4 mb-4"
                      style={{ background: 'var(--azul-50)' }}
                    >
                      <Camera size={36} style={{ color: 'var(--azul)' }} />
                    </div>
                    <p
                      className="mono text-[11px] tracking-[0.14em] mb-5 text-center"
                      style={{ color: 'var(--ink-50)' }}
                    >
                      ATIVE A CÂMERA PARA INICIAR O SCAN
                    </p>
                    <button
                      onClick={startScanner}
                      className="btn btn-orange btn-lg"
                    >
                      <Camera size={16} />
                      Ativar Câmera
                    </button>
                  </div>
                )}

                {/* Scanner container - always in DOM but hidden when not scanning */}
                <div
                  id={scannerContainerId}
                  className={
                    scannerActive ? 'rounded-2xl overflow-hidden' : 'hidden'
                  }
                  style={
                    scannerActive ? { border: '1px solid var(--line)' } : undefined
                  }
                />

                {scannerActive && (
                  <button
                    onClick={stopScanner}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-all"
                    style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}
                  >
                    <CameraOff size={16} />
                    Parar Câmera
                  </button>
                )}
              </div>

              {/* Loading indicator when processing QR */}
              {validating && (
                <div
                  className="mb-5 flex items-center justify-center gap-2 rounded-2xl p-4"
                  style={{ background: 'var(--azul-50)' }}
                >
                  <Loader2
                    className="animate-spin"
                    size={18}
                    style={{ color: 'var(--azul)' }}
                  />
                  <span
                    className="mono text-[11px] tracking-[0.14em]"
                    style={{ color: 'var(--azul)' }}
                  >
                    PROCESSANDO QR CODE...
                  </span>
                </div>
              )}

              {/* Scanned data display */}
              {scannedData && (
                <div
                  className="mb-5 rounded-2xl p-5"
                  style={{
                    background: 'var(--azul-50)',
                    border: '1px solid rgba(43,46,141,0.18)',
                  }}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div
                        className="mono text-[10px] tracking-[0.14em]"
                        style={{ color: 'var(--ink-50)' }}
                      >
                        {scannedData.type === 'group'
                          ? 'GRUPO DETECTADO'
                          : 'INSCRIÇÃO INDIVIDUAL'}
                      </div>
                      <h3
                        className="display mt-1 truncate"
                        style={{ fontSize: 18, letterSpacing: '-0.02em' }}
                      >
                        {scannedData.purchase_group ?? 'Inscrição'}
                      </h3>
                    </div>
                    <button
                      onClick={clearScannedData}
                      className="mono text-[10px] tracking-[0.1em] hover:opacity-70 transition-opacity shrink-0 whitespace-nowrap"
                      style={{ color: 'var(--ink-70)' }}
                    >
                      LIMPAR
                    </button>
                  </div>

                  {/* Participant info */}
                  <div
                    className="mb-4 rounded-xl bg-white p-4 text-sm space-y-1.5"
                    style={{ border: '1px solid var(--line)' }}
                  >
                    <p className="min-w-0">
                      <span
                        className="mono text-[10px] tracking-[0.1em]"
                        style={{ color: 'var(--ink-50)' }}
                      >
                        NOME
                      </span>
                      <span
                        className="ml-2 font-medium"
                        style={{ color: 'var(--ink)' }}
                      >
                        {scannedData.participant.nome}
                      </span>
                    </p>
                    <p className="min-w-0 break-all">
                      <span
                        className="mono text-[10px] tracking-[0.1em]"
                        style={{ color: 'var(--ink-50)' }}
                      >
                        EMAIL
                      </span>
                      <span
                        className="ml-2"
                        style={{ color: 'var(--ink-70)' }}
                      >
                        {scannedData.participant.email}
                      </span>
                    </p>
                    <p>
                      <span
                        className="mono text-[10px] tracking-[0.1em]"
                        style={{ color: 'var(--ink-50)' }}
                      >
                        CPF
                      </span>
                      <span
                        className="mono ml-2"
                        style={{ color: 'var(--ink-70)' }}
                      >
                        {formatCPF(scannedData.participant.cpf)}
                      </span>
                    </p>
                  </div>

                  {/* Inscriptions / Events */}
                  <div className="space-y-3">
                    {getScannedInscriptions().map((ins) => {
                      const isSelectedEvent = ins.event?.id === Number(selectedEvent)
                      const eventTitle = ins.event?.title ?? 'Evento desconhecido'

                      return (
                        <div
                          key={ins.id}
                          className="rounded-xl p-4"
                          style={{
                            background: 'white',
                            border: isSelectedEvent
                              ? '1px solid rgba(43,46,141,0.3)'
                              : '1px solid var(--line)',
                            opacity: isSelectedEvent ? 1 : 0.65,
                          }}
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p
                                className="text-sm font-semibold truncate"
                                style={{ color: 'var(--ink)' }}
                                title={eventTitle}
                              >
                                {eventTitle}
                              </p>
                              {ins.event && (
                                <p
                                  className="mono text-[10px] tracking-[0.06em] mt-1"
                                  style={{ color: 'var(--ink-50)' }}
                                >
                                  {ins.event.event_date} · {ins.event.start_time} - {ins.event.end_time}
                                </p>
                              )}
                            </div>
                            {isSelectedEvent && (
                              <span
                                className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap shrink-0"
                                style={{
                                  background: 'var(--azul-50)',
                                  color: 'var(--azul)',
                                }}
                              >
                                ATIVO
                              </span>
                            )}
                          </div>

                          <div
                            className="mono text-[10px] tracking-[0.1em] mb-3"
                            style={{ color: 'var(--ink-50)' }}
                          >
                            {ins.tickets_used} DE {ins.tickets_total} CHECK-INS
                          </div>

                          {/* Tickets for this inscription */}
                          <div className="space-y-1.5">
                            {ins.tickets.map((ticket) => (
                              <div
                                key={ticket.id}
                                className="flex items-center justify-between rounded-lg px-3 py-2 gap-2"
                                style={{ background: 'var(--paper-2)' }}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {ticket.status === 'used' ? (
                                    <CheckCircle
                                      size={14}
                                      className="shrink-0"
                                      style={{ color: 'var(--verde-600)' }}
                                    />
                                  ) : (
                                    <div
                                      className="h-3.5 w-3.5 rounded-full shrink-0"
                                      style={{
                                        border: '2px solid var(--ink-50)',
                                      }}
                                    />
                                  )}
                                  <span
                                    className="mono text-[10px] tracking-[0.06em] truncate"
                                    style={{ color: 'var(--ink-70)' }}
                                  >
                                    {ticket.id.slice(0, 8)}...
                                  </span>
                                  {ticket.checked_in_at && (
                                    <span
                                      className="mono text-[10px] whitespace-nowrap"
                                      style={{ color: 'var(--verde-600)' }}
                                    >
                                      {new Date(ticket.checked_in_at).toLocaleTimeString('pt-BR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  )}
                                </div>
                                {ticket.status === 'active' && isSelectedEvent && (
                                  <button
                                    onClick={() => handleCheckinTicket(ticket.id)}
                                    disabled={processingTicket === ticket.id}
                                    className="mono shrink-0 rounded-full px-3 py-1.5 text-[10px] tracking-[0.08em] font-medium transition-all disabled:opacity-50"
                                    style={{
                                      background: 'var(--verde)',
                                      color: '#3d5a0a',
                                    }}
                                  >
                                    {processingTicket === ticket.id ? (
                                      <Loader2 className="animate-spin" size={12} />
                                    ) : (
                                      'CHECK-IN'
                                    )}
                                  </button>
                                )}
                                {ticket.status === 'used' && (
                                  <span
                                    className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap shrink-0"
                                    style={{
                                      background: 'rgba(166,206,58,0.18)',
                                      color: '#3d5a0a',
                                    }}
                                  >
                                    PRESENTE
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Button to scan another */}
                  <button
                    onClick={() => {
                      clearScannedData()
                      startScanner()
                    }}
                    className="btn btn-orange mt-5 w-full justify-center"
                  >
                    <QrCode size={16} />
                    Escanear outro QR Code
                  </button>
                </div>
              )}

              {/* Manual ticket ID input */}
              <div
                className="pt-5"
                style={{ borderTop: '1px solid var(--line)' }}
              >
                <div
                  className="mono text-[10px] tracking-[0.14em] mb-3"
                  style={{ color: 'var(--ink-50)' }}
                >
                  OU DIGITE O ID DO TICKET
                </div>
                <form onSubmit={handleValidateTicket} className="flex gap-3 flex-wrap sm:flex-nowrap">
                  <input
                    type="text"
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value)}
                    placeholder="ID do ticket..."
                    className="admin-input flex-1 min-w-0 px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors"
                    style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
                  />
                  <button
                    type="submit"
                    disabled={validating}
                    className="btn btn-orange disabled:opacity-50"
                  >
                    {validating ? 'Validando...' : 'Validar'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* CPF Tab */}
          {activeTab === 'cpf' && (
            <div
              className="rounded-[20px] bg-white p-7"
              style={{ border: '1px solid var(--line)' }}
            >
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="min-w-0">
                  <div
                    className="mono text-[10px] tracking-[0.14em]"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    BUSCA MANUAL
                  </div>
                  <h2
                    className="display mt-1"
                    style={{ fontSize: 22, letterSpacing: '-0.02em' }}
                  >
                    Buscar por CPF
                  </h2>
                </div>
              </div>

              <form
                onSubmit={handleSearchCPF}
                className="mb-6 flex gap-3 flex-wrap sm:flex-nowrap"
              >
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="Digite o CPF..."
                  className="admin-input flex-1 min-w-0 sm:max-w-xs px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors"
                  style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="btn btn-orange disabled:opacity-50"
                >
                  <Search size={16} />
                  {searching ? 'Buscando...' : 'Buscar'}
                </button>
              </form>

              {tickets.length > 0 && (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--line)' }}>
                        {['Participante', 'Status', 'Ação'].map((h) => (
                          <th
                            key={h}
                            className="mono text-[10px] tracking-[0.1em] py-3 px-2 font-medium uppercase"
                            style={{ color: 'var(--ink-50)' }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((ticket) => (
                        <tr
                          key={ticket.id}
                          style={{ borderBottom: '1px solid var(--line)' }}
                        >
                          <td
                            className="py-4 px-2 font-medium max-w-[260px] truncate"
                            style={{ color: 'var(--ink)' }}
                            title={ticket.participant_name}
                          >
                            {ticket.participant_name}
                          </td>
                          <td className="py-4 px-2">
                            {ticket.checked_in_at ? (
                              <span
                                className="mono inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap"
                                style={{
                                  background: 'rgba(166,206,58,0.18)',
                                  color: '#3d5a0a',
                                }}
                              >
                                <CheckCircle size={10} />
                                PRESENTE
                              </span>
                            ) : (
                              <span
                                className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap"
                                style={{
                                  background: 'rgba(248,130,30,0.15)',
                                  color: '#b85d00',
                                }}
                              >
                                PENDENTE
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-2">
                            {!ticket.checked_in_at && (
                              <button
                                onClick={() => handleConfirmPresence(ticket.id)}
                                className="mono rounded-full px-3 py-1.5 text-[10px] tracking-[0.08em] font-medium transition-all"
                                style={{
                                  background: 'var(--verde)',
                                  color: '#3d5a0a',
                                }}
                              >
                                CONFIRMAR
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Recent check-ins */}
          {recentCheckins.length > 0 && (
            <div
              className="mt-8 rounded-[20px] bg-white p-7"
              style={{ border: '1px solid var(--line)' }}
            >
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="min-w-0">
                  <div
                    className="mono text-[10px] tracking-[0.14em]"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    ÚLTIMOS 10
                  </div>
                  <h2
                    className="display mt-1"
                    style={{ fontSize: 22, letterSpacing: '-0.02em' }}
                  >
                    Check-ins recentes
                  </h2>
                </div>
              </div>
              <ul className="space-y-0">
                {recentCheckins.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 py-3"
                    style={{ borderBottom: '1px solid var(--line)' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CheckCircle
                        size={14}
                        className="shrink-0"
                        style={{ color: 'var(--verde-600)' }}
                      />
                      <span
                        className="text-sm font-medium truncate"
                        style={{ color: 'var(--ink)' }}
                        title={c.participant_name}
                      >
                        {c.participant_name}
                      </span>
                    </div>
                    <span
                      className="mono text-[11px] whitespace-nowrap shrink-0"
                      style={{ color: 'var(--ink-50)' }}
                    >
                      {new Date(c.checked_in_at).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatTile({
  label,
  value,
  icon,
  accent,
  accentBg,
  valueColor,
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  accent: string
  accentBg: string
  valueColor?: string
}) {
  return (
    <div
      className="rounded-[20px] bg-white p-5 overflow-hidden"
      style={{
        border: '1px solid var(--line)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div
          className="mono text-[10px] tracking-[0.14em] truncate min-w-0 flex-1"
          style={{ color: 'var(--ink-50)' }}
        >
          {label}
        </div>
        <div
          className="rounded-lg p-2 shrink-0"
          style={{ background: accentBg, color: accent }}
        >
          {icon}
        </div>
      </div>
      <div
        className="display truncate"
        style={{
          fontSize: 'clamp(28px, 3.4vw, 36px)',
          letterSpacing: '-0.03em',
          lineHeight: 1,
          color: valueColor ?? 'var(--ink)',
        }}
      >
        {value}
      </div>
    </div>
  )
}
