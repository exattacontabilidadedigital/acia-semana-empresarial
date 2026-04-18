'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCPF, formatDateShort } from '@/lib/utils'
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
        <Loader2 className="animate-spin text-purple" size={32} />
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 font-montserrat">Check-in</h1>

      {/* Event selector */}
      <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
        <label className="mb-1 block text-sm font-medium text-gray-700">Selecione o Evento</label>
        <select
          value={selectedEvent}
          onChange={(e) => {
            setSelectedEvent(e.target.value)
            setResult(null)
            setTickets([])
            setScannedData(null)
          }}
          className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
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
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <Users size={16} />
                <span className="text-xs font-medium uppercase">Total</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle size={16} />
                <span className="text-xs font-medium uppercase">Presentes</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-green-600">{stats.checkedIn}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-yellow-600">
                <XCircle size={16} />
                <span className="text-xs font-medium uppercase">Restantes</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.remaining}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-purple">
                <BarChart3 size={16} />
                <span className="text-xs font-medium uppercase">Progresso</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-purple">{stats.percentage}%</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progresso do Check-in</span>
              <span>{stats.checkedIn} de {stats.total} ({stats.percentage}%)</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple to-green-500 transition-all duration-500"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => {
                setActiveTab('qr')
                setResult(null)
                setScannedData(null)
                stopScanner()
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'qr'
                  ? 'bg-purple text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <QrCode size={18} />
              QR Code Scanner
            </button>
            <button
              onClick={() => {
                setActiveTab('cpf')
                setResult(null)
                setScannedData(null)
                stopScanner()
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'cpf'
                  ? 'bg-purple text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Search size={18} />
              Busca por CPF
            </button>
          </div>

          {/* Result banner */}
          {result && (
            <div
              className={`mb-4 flex items-center gap-3 rounded-lg p-4 ${
                result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              {result.success ? <CheckCircle size={20} /> : <XCircle size={20} />}
              <span className="text-sm font-medium">{result.message}</span>
            </div>
          )}

          {/* QR Tab */}
          {activeTab === 'qr' && (
            <div className="rounded-lg bg-white p-6 shadow-sm">
              {/* Camera scanner area */}
              <div className="mb-4">
                {!scannerActive && !scannedData && (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6">
                    <Camera size={48} className="mb-3 text-gray-400" />
                    <p className="mb-3 text-sm text-gray-500">Clique para ativar a camera e escanear o QR Code</p>
                    <button
                      onClick={startScanner}
                      className="inline-flex items-center gap-2 rounded-lg bg-purple px-6 py-2 text-sm font-medium text-white hover:bg-purple-dark"
                    >
                      <Camera size={16} />
                      Ativar Camera
                    </button>
                  </div>
                )}

                {/* Scanner container - always in DOM but hidden when not scanning */}
                <div
                  id={scannerContainerId}
                  className={scannerActive ? 'rounded-lg overflow-hidden' : 'hidden'}
                />

                {scannerActive && (
                  <button
                    onClick={stopScanner}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
                  >
                    <CameraOff size={16} />
                    Parar Camera
                  </button>
                )}
              </div>

              {/* Loading indicator when processing QR */}
              {validating && (
                <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-purple/5 p-4">
                  <Loader2 className="animate-spin text-purple" size={20} />
                  <span className="text-sm text-purple font-medium">Processando QR Code...</span>
                </div>
              )}

              {/* Scanned data display */}
              {scannedData && (
                <div className="mb-4 rounded-lg border border-purple/20 bg-purple/5 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      {scannedData.type === 'group' ? 'Grupo' : 'Inscricao Individual'}
                      {scannedData.purchase_group && (
                        <span className="ml-2 text-sm font-normal text-purple">
                          ({scannedData.purchase_group})
                        </span>
                      )}
                    </h3>
                    <button
                      onClick={clearScannedData}
                      className="text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      Limpar
                    </button>
                  </div>

                  {/* Participant info */}
                  <div className="mb-4 rounded bg-white p-3 text-sm">
                    <p><span className="font-medium text-gray-600">Nome:</span> {scannedData.participant.nome}</p>
                    <p><span className="font-medium text-gray-600">Email:</span> {scannedData.participant.email}</p>
                    <p><span className="font-medium text-gray-600">CPF:</span> {formatCPF(scannedData.participant.cpf)}</p>
                  </div>

                  {/* Inscriptions / Events */}
                  <div className="space-y-3">
                    {getScannedInscriptions().map((ins) => {
                      const isSelectedEvent = ins.event?.id === Number(selectedEvent)
                      const eventTitle = ins.event?.title ?? 'Evento desconhecido'

                      return (
                        <div
                          key={ins.id}
                          className={`rounded-lg border p-3 ${
                            isSelectedEvent
                              ? 'border-purple/30 bg-white'
                              : 'border-gray-200 bg-gray-50 opacity-70'
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{eventTitle}</p>
                              {ins.event && (
                                <p className="text-xs text-gray-500">
                                  {ins.event.event_date} - {ins.event.start_time} a {ins.event.end_time}
                                </p>
                              )}
                            </div>
                            {isSelectedEvent && (
                              <span className="rounded-full bg-purple/10 px-2 py-0.5 text-xs font-medium text-purple">
                                Evento selecionado
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-gray-500 mb-2">
                            {ins.tickets_used} de {ins.tickets_total} check-ins realizados
                          </div>

                          {/* Tickets for this inscription */}
                          <div className="space-y-1">
                            {ins.tickets.map((ticket) => (
                              <div
                                key={ticket.id}
                                className="flex items-center justify-between rounded bg-gray-50 px-2 py-1.5 text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  {ticket.status === 'used' ? (
                                    <CheckCircle size={14} className="text-green-500" />
                                  ) : (
                                    <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300" />
                                  )}
                                  <span className="text-xs text-gray-500 font-mono">
                                    {ticket.id.slice(0, 8)}...
                                  </span>
                                  {ticket.checked_in_at && (
                                    <span className="text-xs text-green-600">
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
                                    className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                  >
                                    {processingTicket === ticket.id ? (
                                      <Loader2 className="animate-spin" size={12} />
                                    ) : (
                                      'Check-in'
                                    )}
                                  </button>
                                )}
                                {ticket.status === 'used' && (
                                  <span className="text-xs text-green-600 font-medium">Presente</span>
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
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple px-4 py-2 text-sm font-medium text-white hover:bg-purple-dark"
                  >
                    <QrCode size={16} />
                    Escanear outro QR Code
                  </button>
                </div>
              )}

              {/* Manual ticket ID input */}
              <div className="border-t border-gray-100 pt-4">
                <p className="mb-2 text-xs text-gray-500">Ou digite o ID do ticket manualmente:</p>
                <form onSubmit={handleValidateTicket} className="flex gap-3">
                  <input
                    type="text"
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value)}
                    placeholder="ID do ticket..."
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
                  />
                  <button
                    type="submit"
                    disabled={validating}
                    className="rounded-lg bg-purple px-6 py-2 text-sm font-medium text-white hover:bg-purple-dark disabled:opacity-50"
                  >
                    {validating ? 'Validando...' : 'Validar'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* CPF Tab */}
          {activeTab === 'cpf' && (
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <form onSubmit={handleSearchCPF} className="mb-6 flex gap-3">
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="Digite o CPF..."
                  className="flex-1 max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple px-4 py-2 text-sm font-medium text-white hover:bg-purple-dark disabled:opacity-50"
                >
                  <Search size={16} />
                  {searching ? 'Buscando...' : 'Buscar'}
                </button>
              </form>

              {tickets.length > 0 && (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="pb-3 font-medium">Participante</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Acao</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {tickets.map((ticket) => (
                      <tr key={ticket.id} className="text-gray-700">
                        <td className="py-3">{ticket.participant_name}</td>
                        <td className="py-3">
                          {ticket.checked_in_at ? (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <CheckCircle size={14} />
                              Check-in realizado
                            </span>
                          ) : (
                            <span className="text-yellow-600">Pendente</span>
                          )}
                        </td>
                        <td className="py-3">
                          {!ticket.checked_in_at && (
                            <button
                              onClick={() => handleConfirmPresence(ticket.id)}
                              className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                            >
                              Confirmar Presenca
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Recent check-ins */}
          {recentCheckins.length > 0 && (
            <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Check-ins Recentes</h2>
              <ul className="divide-y">
                {recentCheckins.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium text-gray-700">{c.participant_name}</span>
                    <span className="text-gray-400">
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
