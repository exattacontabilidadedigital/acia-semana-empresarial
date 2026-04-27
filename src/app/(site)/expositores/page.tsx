'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight, Calendar, Check, ChevronLeft, ChevronRight, Download, Loader2,
  MapPin, MessageCircle, Phone, Send, Tag, X,
} from 'lucide-react'
import ModalPortal from '@/components/ui/ModalPortal'

type StandType = 'blue' | 'premium' | 'gastro' | 'external'
type StandStatus = 'available' | 'reserved' | 'sold' | 'blocked'

interface Stand {
  id: number
  number: string
  type: StandType
  size: string
  price: number
  status: StandStatus
  pos_x: number
  pos_y: number
}

const SEGMENTS = [
  'Alimentício', 'Vestuário', 'Tecnologia', 'Saúde', 'Serviços',
  'Indústria', 'Agronegócio', 'Educação', 'Outro',
]

interface PastExhibitor {
  id: number
  name: string
  category: string | null
  logo_url: string | null
  color: string | null
}

const INFO_BLOCKS = [
  {
    t: 'O que inclui',
    items: [
      'Espaço construído e montado',
      'Energia 220v · iluminação',
      'Identificação frontal',
      '1 mesa · 4 cadeiras',
      'Wi-fi · limpeza',
      '4 credenciais expositor',
    ],
    c: 'var(--laranja)',
  },
  {
    t: 'Como reservar',
    items: [
      '1. Selecione o stand no mapa',
      '2. Preencha dados da empresa',
      '3. Aguarde contato comercial',
      '4. Pagamento em até 5x',
      '5. Receba contrato digital',
      '6. Confirmação em 24h',
    ],
    c: 'var(--laranja)',
  },
  {
    t: 'Prazos',
    items: [
      'Pré-reserva: até 20.07',
      'Pagamento: até 31.07',
      'Montagem: 18 e 19.08',
      'Abertura: 20.08 · 14h',
      'Desmontagem: 23.08',
      'Suporte 24h durante evento',
    ],
    c: 'var(--verde)',
  },
]

// Canvas da planta (baseado no HTML de referência)
const CANVAS_W = 1000
const CANVAS_H = 820

// Coordenadas em pixels (canto superior-esquerdo de cada stand) dentro do canvas 1000x820.
const STAND_COORDS: Record<string, { top: number; left: number }> = {
  // Coluna vertical esquerda (01-04, abaixo da entrada)
  '01': { top: 625, left: 280 }, '02': { top: 580, left: 280 },
  '03': { top: 535, left: 280 }, '04': { top: 490, left: 280 },
  // Coluna vertical esquerda (29-31, acima da entrada)
  '29': { top: 230, left: 280 }, '30': { top: 185, left: 280 }, '31': { top: 140, left: 280 },

  // Linha inferior esquerda (05-08)
  '05': { top: 680, left: 340 }, '06': { top: 680, left: 385 },
  '07': { top: 680, left: 430 }, '08': { top: 680, left: 475 },

  // Ilha L1 inferior — 14-16 (norte) + 09-11 (sul)
  '14': { top: 580, left: 340 }, '15': { top: 580, left: 385 }, '16': { top: 580, left: 430 },
  '09': { top: 625, left: 340 }, '10': { top: 625, left: 385 }, '11': { top: 625, left: 430 },

  // Ilha L2 — 22-24 (norte) + 18-20 (sul)
  '22': { top: 490, left: 340 }, '23': { top: 490, left: 385 }, '24': { top: 490, left: 430 },
  '18': { top: 535, left: 340 }, '19': { top: 535, left: 385 }, '20': { top: 535, left: 430 },

  // Coluna vertical externa esquerda (12, 13, 17, 21)
  '21': { top: 490, left: 495 }, '17': { top: 535, left: 495 },
  '13': { top: 580, left: 495 }, '12': { top: 625, left: 495 },

  // Coluna vertical interna esquerda (51, 52, 53, 54)
  '54': { top: 490, left: 540 }, '53': { top: 535, left: 540 },
  '52': { top: 580, left: 540 }, '51': { top: 625, left: 540 },

  // Premium 25-28 (destaque, 55x55)
  '26': { top: 370, left: 340 }, '28': { top: 370, left: 400 },
  '25': { top: 425, left: 340 }, '27': { top: 425, left: 400 },

  // Ilha L3 — 36-38 (norte) + 32-34 (sul)
  '36': { top: 265, left: 340 }, '37': { top: 265, left: 385 }, '38': { top: 265, left: 430 },
  '32': { top: 310, left: 340 }, '33': { top: 310, left: 385 }, '34': { top: 310, left: 430 },

  // Ilha L4 — 44-46 (norte) + 40-42 (sul)
  '44': { top: 170, left: 340 }, '45': { top: 170, left: 385 }, '46': { top: 170, left: 430 },
  '40': { top: 215, left: 340 }, '41': { top: 215, left: 385 }, '42': { top: 215, left: 430 },

  // Coluna vertical externa esquerda superior (43, 39, 35)
  '43': { top: 170, left: 495 }, '39': { top: 215, left: 495 }, '35': { top: 260, left: 495 },

  // Coluna vertical interna esquerda superior (87, 88, 89)
  '89': { top: 170, left: 540 }, '88': { top: 215, left: 540 }, '87': { top: 260, left: 540 },

  // Linha superior esquerda (47-50)
  '47': { top: 120, left: 340 }, '48': { top: 120, left: 385 },
  '49': { top: 120, left: 430 }, '50': { top: 120, left: 475 },

  // Linha superior direita (96-99)
  '96': { top: 120, left: 590 }, '97': { top: 120, left: 635 },
  '98': { top: 120, left: 680 }, '99': { top: 120, left: 725 },

  // Ilha superior direita — 91, 93, 95 (norte) + 90, 92, 94 (sul)
  '91': { top: 170, left: 590 }, '93': { top: 170, left: 635 }, '95': { top: 170, left: 680 },
  '90': { top: 215, left: 590 }, '92': { top: 215, left: 635 }, '94': { top: 215, left: 680 },

  // Ilha R4 — 84-86 (norte) + 81-83 (sul)
  '84': { top: 265, left: 590 }, '85': { top: 265, left: 635 }, '86': { top: 265, left: 680 },
  '81': { top: 310, left: 590 }, '82': { top: 310, left: 635 }, '83': { top: 310, left: 680 },

  // Ilha R3 (altura do palco) — 78-80 (norte) + 75-77 (sul)
  '78': { top: 380, left: 635 }, '79': { top: 380, left: 680 }, '80': { top: 380, left: 725 },
  '75': { top: 425, left: 635 }, '76': { top: 425, left: 680 }, '77': { top: 425, left: 725 },

  // Ilha R2 — 72-74 (norte) + 69-71 (sul)
  '72': { top: 490, left: 590 }, '73': { top: 490, left: 635 }, '74': { top: 490, left: 680 },
  '69': { top: 535, left: 590 }, '70': { top: 535, left: 635 }, '71': { top: 535, left: 680 },

  // Ilha R1 — 66-68 (norte) + 63-65 (sul)
  '66': { top: 580, left: 590 }, '67': { top: 580, left: 635 }, '68': { top: 580, left: 680 },
  '63': { top: 625, left: 590 }, '64': { top: 625, left: 635 }, '65': { top: 625, left: 680 },

  // Linha inferior direita (55-58)
  '55': { top: 680, left: 555 }, '56': { top: 680, left: 600 },
  '57': { top: 680, left: 645 }, '58': { top: 680, left: 690 },

  // Coluna vertical direita-extrema inferior (59-62)
  '62': { top: 490, left: 745 }, '61': { top: 535, left: 745 },
  '60': { top: 580, left: 745 }, '59': { top: 625, left: 745 },

  // Coluna vertical direita-extrema superior (100-103)
  '103': { top: 170, left: 745 }, '102': { top: 215, left: 745 },
  '101': { top: 260, left: 745 }, '100': { top: 305, left: 745 },

  // Espaço Gastronômico — 8 stands roxos em 4 pares
  'P07': { top: 150, left: 850 }, 'P08': { top: 200, left: 850 },
  'P05': { top: 265, left: 850 }, 'P06': { top: 315, left: 850 },
  'P03': { top: 380, left: 850 }, 'P04': { top: 430, left: 850 },
  'P01': { top: 495, left: 850 }, 'P02': { top: 545, left: 850 },
}

// Tamanhos por tipo (em pixels dentro do canvas)
const STAND_SIZES: Record<StandType, { w: number; h: number; fontSize: number }> = {
  blue: { w: 40, h: 40, fontSize: 12 },
  premium: { w: 55, h: 55, fontSize: 14 },
  gastro: { w: 40, h: 30, fontSize: 12 },
  external: { w: 40, h: 40, fontSize: 12 },
}

// Cores conforme o HTML de referência
const STAND_TYPE_STYLES: Record<StandType, { bg: string; border: string; color: string; label: string }> = {
  blue: { bg: '#2c4a9b', border: '#1a2e5c', color: '#ffffff', label: 'Padrão' },
  premium: { bg: '#ff5722', border: '#c41000', color: '#ffffff', label: 'Destaque' },
  gastro: { bg: '#8b5a9f', border: '#5e3670', color: '#ffffff', label: 'Lateral' },
  external: { bg: '#94a3b8', border: '#64748b', color: '#ffffff', label: 'Externo' },
}

// Número exibido no botão (remove prefixo P dos stands gastro — '01'..'08')
function displayStandNumber(n: string): string {
  return n.startsWith('P') ? n.slice(1) : n
}

const STAND_STATUS_STYLES: Record<StandStatus, { overlay: string; label: string; disabled: boolean }> = {
  available: { overlay: 'transparent', label: 'Disponível', disabled: false },
  reserved: { overlay: 'rgba(248,130,30,0.7)', label: 'Reservado', disabled: true },
  sold: { overlay: 'rgba(0,0,0,0.55)', label: 'Vendido', disabled: true },
  blocked: { overlay: 'rgba(0,0,0,0.8)', label: 'Indisponível', disabled: true },
}

function formatCNPJ(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (digits.length >= 7) return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  if (digits.length >= 3) return digits.replace(/(\d{2})(\d{0,5})/, '($1) $2')
  return digits
}

function formatPrice(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'var(--paper)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
}

export default function ExpositoresPage() {
  const [cat, setCat] = useState('Todos')
  const [stands, setStands] = useState<Stand[]>([])
  const [loadingStands, setLoadingStands] = useState(true)
  const [selectedStand, setSelectedStand] = useState<Stand | null>(null)
  const [filterType, setFilterType] = useState<'all' | StandType>('all')
  const [pastExhibitors, setPastExhibitors] = useState<PastExhibitor[]>([])

  const [form, setForm] = useState({
    company_name: '',
    cnpj: '',
    responsible_name: '',
    responsible_role: '',
    email: '',
    phone: '',
    segment: '',
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  // Prompt de confirmação quando já existe stand reservado para o mesmo email/CNPJ
  const [duplicatePrompt, setDuplicatePrompt] = useState<string | null>(null)

  // Carrossel "Quem já expôs"
  const carouselRef = useRef<HTMLDivElement>(null)
  const [carouselAuto, setCarouselAuto] = useState(true)

  function scrollCarousel(dir: -1 | 1) {
    const el = carouselRef.current
    if (!el) return
    const step = Math.max(240, el.clientWidth * 0.7)
    el.scrollBy({ left: step * dir, behavior: 'smooth' })
  }

  // Scale responsivo do canvas da planta (1000x820 → largura disponível)
  const floorWrapperRef = useRef<HTMLDivElement>(null)
  const [floorScale, setFloorScale] = useState(1)

  useEffect(() => {
    const el = floorWrapperRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth
      setFloorScale(Math.min(1, w / CANVAS_W))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  async function fetchStands() {
    setLoadingStands(true)
    try {
      const res = await fetch('/api/stands')
      const data = await res.json()
      setStands(data.stands || [])
    } catch {
      setStands([])
    } finally {
      setLoadingStands(false)
    }
  }

  useEffect(() => {
    fetchStands()
  }, [])

  useEffect(() => {
    fetch('/api/past-exhibitors')
      .then((r) => r.json())
      .then((d) => setPastExhibitors(d.exhibitors || []))
      .catch(() => setPastExhibitors([]))
  }, [])

  // Trava o scroll do body quando o modal estiver aberto (foco no modal)
  useEffect(() => {
    if (!selectedStand) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [selectedStand])

  // Fecha o modal ao pressionar Escape
  useEffect(() => {
    if (!selectedStand) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeReservation()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStand])

  const stats = useMemo(() => {
    const total = stands.length
    const available = stands.filter((s) => s.status === 'available').length
    const reserved = stands.filter((s) => s.status === 'reserved').length
    const sold = stands.filter((s) => s.status === 'sold').length
    return { total, available, reserved, sold }
  }, [stands])

  const carouselCategories = useMemo(() => {
    const set = new Set<string>()
    pastExhibitors.forEach((e) => {
      if (e.category) set.add(e.category)
    })
    return ['Todos', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'pt'))]
  }, [pastExhibitors])

  const filteredExhibitors = pastExhibitors.filter(
    (e) => cat === 'Todos' || e.category === cat,
  )

  // Auto-scroll do carrossel (pausa no hover ou quando filtro muda)
  useEffect(() => {
    if (!carouselAuto) return
    const el = carouselRef.current
    if (!el) return
    const id = setInterval(() => {
      if (!carouselRef.current) return
      const node = carouselRef.current
      const max = node.scrollWidth - node.clientWidth - 2
      if (node.scrollLeft >= max) {
        node.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        node.scrollBy({ left: 260, behavior: 'smooth' })
      }
    }, 3200)
    return () => clearInterval(id)
  }, [carouselAuto, cat])

  const visibleStands = useMemo(() => {
    if (filterType === 'all') return stands
    return stands.filter((s) => s.type === filterType)
  }, [stands, filterType])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function openReservation(stand: Stand) {
    if (STAND_STATUS_STYLES[stand.status].disabled) return
    setSelectedStand(stand)
    setError('')
    setSuccess(false)
    setDuplicatePrompt(null)
  }

  function closeReservation() {
    setSelectedStand(null)
    setSuccess(false)
    setError('')
    setDuplicatePrompt(null)
  }

  async function submitReservation(confirmDuplicate: boolean) {
    if (!selectedStand) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/exhibitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          phone: form.phone.replace(/\D/g, ''),
          cnpj: form.cnpj.replace(/\D/g, '') || undefined,
          stand_number: selectedStand.number,
          stand_size: selectedStand.size,
          confirm_duplicate: confirmDuplicate || undefined,
        }),
      })
      const data = await res.json()

      // 409 + DUPLICATE_EXHIBITOR → pedir confirmação ao usuário
      if (res.status === 409 && data?.error === 'DUPLICATE_EXHIBITOR') {
        setDuplicatePrompt(data.message || 'Já existe um cadastro. Deseja reservar outro stand?')
        return
      }

      if (!res.ok) {
        setError(data.error === 'DUPLICATE_EXHIBITOR' ? data.message : data.error || 'Erro ao enviar reserva')
        return
      }
      setDuplicatePrompt(null)
      setSuccess(true)
      fetchStands()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await submitReservation(false)
  }

  return (
    <div className="page-enter">
      {/* HERO */}
      <section style={{ padding: '64px 0 40px' }}>
        <div className="container-site">
          <div className="eyebrow mb-6">
            <span className="dot" />
            FEIRA MULTISSETORIAL · 2026
          </div>
          <h1
            className="display mb-8"
            style={{ fontSize: 80, maxWidth: 1100 }}
          >
            Escolha seu stand na maior{' '}
            <span style={{ color: 'var(--verde)' }}>feira empresarial</span> da região.
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: 'var(--ink-70)', maxWidth: 700 }}>
            Reserve seu espaço direto no mapa. Mais de {stats.total || 100} stands disponíveis em
            6.000 m² no Espaço Cultural José Carlos Brandão.
          </p>
        </div>
      </section>

      {/* INFO BAR */}
      <section style={{ padding: '0 0 56px' }}>
        <div className="container-site">
          <div
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 rounded-2xl"
            style={{ background: 'white', border: '1px solid var(--line)', padding: 24 }}
          >
            <InfoTile icon={<Tag size={18} />} label="STAND 3x2m" value="R$ 1.710" accent="var(--azul)" />
            <InfoTile icon={<Tag size={18} />} label="DESCONTO CEA/SEBRAE" value="25% OFF" accent="var(--laranja)" />
            <InfoTile icon={<Calendar size={18} />} label="DATA" value="20 a 22 · Ago" accent="var(--verde)" />
            <InfoTile icon={<MapPin size={18} />} label="LOCAL" value="Esp. Cult. J. C. Brandão" accent="var(--ciano)" />
          </div>
        </div>
      </section>

      {/* MAPA INTERATIVO */}
      <section id="mapa" style={{ background: 'var(--paper-2)', padding: '80px 0' }}>
        <div className="container-site">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <div className="eyebrow mb-4">
                <span className="dot" />
                MAPA DE STANDS
              </div>
              <h2 className="display" style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}>
                Escolha sua posição.
              </h2>
            </div>

            <a
              href="/docs/planta-stands-2026.pdf"
              target="_blank"
              rel="noreferrer"
              className="btn"
              style={{ background: 'white', border: '1px solid var(--line)' }}
            >
              <Download size={14} /> Baixar planta em PDF
            </a>
          </div>

          {/* Legenda + filtros */}
          <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
            <div className="flex flex-wrap gap-3">
              {[
                { st: 'available', bg: '#2c4a9b', border: '#1a2e5c', label: `Disponível · ${stats.available}` },
                { st: 'reserved', bg: 'rgba(248,130,30,0.7)', border: 'var(--laranja)', label: `Reservado · ${stats.reserved}` },
                { st: 'sold', bg: 'rgba(0,0,0,0.55)', border: '#333', label: `Vendido · ${stats.sold}` },
              ].map((it) => (
                <div key={it.st} className="flex items-center gap-2">
                  <span
                    style={{
                      width: 14, height: 14, borderRadius: 3,
                      background: it.bg, border: `1.5px solid ${it.border}`,
                    }}
                  />
                  <span className="mono text-[11px] tracking-[0.1em]" style={{ color: 'var(--ink-70)' }}>
                    {it.label.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {([
                { v: 'all', label: 'Todos' },
                { v: 'blue', label: 'Padrão' },
                { v: 'premium', label: 'Premium' },
                { v: 'gastro', label: 'Gastronomia' },
              ] as const).map((f) => {
                const active = filterType === f.v
                return (
                  <button
                    key={f.v}
                    onClick={() => setFilterType(f.v as any)}
                    className="rounded-full text-xs font-medium"
                    style={{
                      padding: '8px 14px',
                      border: active ? '1px solid var(--ink)' : '1px solid var(--line)',
                      background: active ? 'var(--ink)' : 'white',
                      color: active ? 'white' : 'var(--ink-70)',
                    }}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Canvas da planta — HTML puro renderizando o painel 1000x820 */}
          <div
            className="rounded-2xl"
            style={{ background: 'white', border: '1px solid var(--line)', padding: 16 }}
          >
            {loadingStands ? (
              <div className="flex items-center justify-center" style={{ minHeight: 420 }}>
                <Loader2 className="animate-spin" size={32} style={{ color: 'var(--azul)' }} />
              </div>
            ) : (
              <div
                ref={floorWrapperRef}
                style={{
                  width: '100%',
                  maxWidth: CANVAS_W,
                  margin: '0 auto',
                  position: 'relative',
                  aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
                  overflow: 'hidden',
                  background: '#f5f5f5',
                  border: '2px solid #333',
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: CANVAS_W,
                    height: CANVAS_H,
                    background: '#ffffff',
                    transformOrigin: '0 0',
                    transform: `scale(${floorScale})`,
                  }}
                >
                  {/* ========== LANDMARKS ========== */}
                  {/* Área de Exposição Externa */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 30, left: 20, width: 200, height: 160,
                      background: '#cccccc',
                      border: '1px solid #888',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      textAlign: 'center',
                      fontSize: 13, fontWeight: 'bold', color: '#333',
                      padding: 10, lineHeight: 1.3,
                    }}
                  >
                    Área de Exposição<br />Externa 100m²
                  </div>

                  {/* Credenciamento */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 20, left: 20, width: 190, height: 70,
                      background: '#c9a876',
                      border: '1px solid #8b6f3f',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 'bold', color: '#3d2d10',
                    }}
                  >
                    Credenciamento
                  </div>

                  {/* Palco Principal */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 370, left: 500, width: 110, height: 110,
                      background: '#a3d155',
                      border: '1px solid #6b9130',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      textAlign: 'center',
                      fontSize: 14, fontWeight: 'bold', color: '#2c3e12', lineHeight: 1.3,
                    }}
                  >
                    Palco<br />Principal
                  </div>

                  {/* Entrada Principal — faixa azul */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 250, left: 230, width: 20, height: 240,
                      background: '#3b5cb8', zIndex: 10,
                    }}
                  />
                  {/* Entrada Principal — label vertical */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 260, left: 210,
                      fontSize: 11, fontWeight: 'bold', color: '#333',
                      writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                      zIndex: 15, whiteSpace: 'nowrap',
                    }}
                  >
                    Entrada Principal
                  </div>
                  {/* Entrada Principal — seta verde */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 355, left: 205,
                      width: 0, height: 0,
                      borderTop: '12px solid transparent',
                      borderBottom: '12px solid transparent',
                      borderLeft: '22px solid #7cb342',
                      zIndex: 20,
                    }}
                  />

                  {/* Espaço Gastronômico — faixa azul */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 350, left: 790, width: 15, height: 135,
                      background: '#3b5cb8', zIndex: 10,
                    }}
                  />
                  {/* Espaço Gastronômico — label vertical */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 370, left: 775,
                      fontSize: 11, fontWeight: 'bold', color: '#333',
                      writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                      zIndex: 15, whiteSpace: 'nowrap',
                    }}
                  >
                    Espaço Gastronômico
                  </div>

                  {/* Áreas tracejadas com X (fundo dos stands roxos) */}
                  {[140, 255, 370, 485].map((top) => (
                    <div
                      key={top}
                      style={{
                        position: 'absolute',
                        top, left: 810, width: 120, height: 100,
                        border: '1px dashed #999',
                        backgroundImage: `
                          linear-gradient(to top right, transparent calc(50% - 1px), #ccc 50%, transparent calc(50% + 1px)),
                          linear-gradient(to top left, transparent calc(50% - 1px), #ccc 50%, transparent calc(50% + 1px))
                        `,
                      }}
                    />
                  ))}

                  {/* ========== STANDS (botões clicáveis) ========== */}
                  {visibleStands.map((stand) => {
                    const coords = STAND_COORDS[stand.number]
                    if (!coords) return null
                    const size = STAND_SIZES[stand.type]
                    const typeStyle = STAND_TYPE_STYLES[stand.type]
                    const statusStyle = STAND_STATUS_STYLES[stand.status]
                    const isAvailable = !statusStyle.disabled
                    const label = displayStandNumber(stand.number)

                    return (
                      <button
                        key={stand.id}
                        onClick={() => openReservation(stand)}
                        disabled={statusStyle.disabled}
                        title={`Stand ${label} · ${formatPrice(stand.price)} · ${statusStyle.label}`}
                        style={{
                          position: 'absolute',
                          top: coords.top,
                          left: coords.left,
                          width: size.w,
                          height: size.h,
                          background: typeStyle.bg,
                          border: `1px solid ${typeStyle.border}`,
                          borderRadius: 3,
                          color: typeStyle.color,
                          fontSize: size.fontSize,
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          cursor: isAvailable ? 'pointer' : 'not-allowed',
                          transition: 'transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease',
                          zIndex: 3,
                          overflow: 'hidden',
                        }}
                        onMouseEnter={(e) => {
                          if (isAvailable) {
                            e.currentTarget.style.transform = 'scale(1.18)'
                            e.currentTarget.style.zIndex = '20'
                            e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.4)'
                            e.currentTarget.style.filter = 'brightness(1.15)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)'
                          e.currentTarget.style.zIndex = '3'
                          e.currentTarget.style.boxShadow = 'none'
                          e.currentTarget.style.filter = 'none'
                        }}
                      >
                        <span style={{ position: 'relative', zIndex: 2 }}>{label}</span>
                        {statusStyle.overlay !== 'transparent' && (
                          <span
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: statusStyle.overlay,
                              zIndex: 1,
                              backgroundImage:
                                stand.status === 'sold'
                                  ? 'repeating-linear-gradient(45deg, rgba(255,255,255,0.25) 0 2px, transparent 2px 5px)'
                                  : undefined,
                            }}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <p className="mono text-[11px] mt-4 tracking-[0.1em]" style={{ color: 'var(--ink-50)' }}>
              PASSE O MOUSE SOBRE UM STAND DISPONÍVEL PARA DESTACÁ-LO · CLIQUE PARA RESERVAR.
            </p>
          </div>
        </div>
      </section>

      {/* PAST EXHIBITORS */}
      <section style={{ padding: '96px 0 64px' }}>
        <div className="container-site">
          <div className="flex justify-between items-end flex-wrap gap-4 mb-8">
            <div>
              <div className="eyebrow mb-4">
                <span className="dot" />
                QUEM JÁ EXPÔS
              </div>
              <h2 className="display" style={{ fontSize: 'clamp(28px, 3.5vw, 44px)' }}>
                +80 marcas nas últimas edições
              </h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {carouselCategories.map((c) => {
                const isActive = cat === c
                return (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className="rounded-full text-xs font-medium"
                    style={{
                      padding: '8px 14px',
                      border: isActive ? '1px solid var(--ink)' : '1px solid var(--line)',
                      background: isActive ? 'var(--ink)' : 'white',
                      color: isActive ? 'white' : 'var(--ink-70)',
                    }}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Carrossel de marcas */}
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setCarouselAuto(false)}
            onMouseLeave={() => setCarouselAuto(true)}
          >
            {/* Setas */}
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => scrollCarousel(-1)}
              style={{
                position: 'absolute',
                top: '50%',
                left: -18,
                transform: 'translateY(-50%)',
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'white',
                border: '1px solid var(--line)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--ink)',
                cursor: 'pointer',
                zIndex: 3,
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              aria-label="Próximo"
              onClick={() => scrollCarousel(1)}
              style={{
                position: 'absolute',
                top: '50%',
                right: -18,
                transform: 'translateY(-50%)',
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'white',
                border: '1px solid var(--line)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--ink)',
                cursor: 'pointer',
                zIndex: 3,
              }}
            >
              <ChevronRight size={20} />
            </button>

            {/* Trilho */}
            <div
              ref={carouselRef}
              style={{
                display: 'flex',
                gap: 12,
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                scrollBehavior: 'smooth',
                paddingBottom: 8,
                // Esconde a scrollbar (cross-browser)
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
              className="no-scrollbar"
            >
              {filteredExhibitors.map((e) => (
                <div
                  key={e.id}
                  className="bg-white border border-line rounded-[10px] flex flex-col gap-3 shrink-0"
                  style={{
                    padding: '20px 18px',
                    minHeight: 180,
                    width: 220,
                    scrollSnapAlign: 'start',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2 h-2 rounded-full block"
                      style={{ background: e.color || 'var(--ink-50)' }}
                    />
                    <span className="mono text-[10px] text-ink-50 tracking-[0.1em] truncate">
                      {(e.category || 'MARCA').toUpperCase()}
                    </span>
                  </div>
                  {e.logo_url ? (
                    <div
                      className="flex-1 flex items-center justify-center"
                      style={{ minHeight: 80 }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={e.logo_url}
                        alt={e.name}
                        className="max-h-20 max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div
                      className="display flex-1 flex items-end"
                      style={{ fontSize: 22, letterSpacing: '-.02em' }}
                    >
                      {e.name}
                    </div>
                  )}
                  {e.logo_url && (
                    <div
                      className="mono text-[11px] text-ink-70 truncate"
                      title={e.name}
                    >
                      {e.name}
                    </div>
                  )}
                </div>
              ))}
              {filteredExhibitors.length === 0 && (
                <div
                  className="mono text-[11px] tracking-[0.14em]"
                  style={{ color: 'var(--ink-50)', padding: 24 }}
                >
                  NENHUMA MARCA NESTA CATEGORIA
                </div>
              )}
            </div>
          </div>
          <style jsx>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
          `}</style>
        </div>
      </section>

      {/* INFO BLOCKS */}
      <section style={{ padding: '0 0 64px' }}>
        <div className="container-site">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {INFO_BLOCKS.map((b, i) => (
              <div
                key={i}
                className="bg-white border border-line rounded-2xl"
                style={{ padding: 32 }}
              >
                <div className="flex items-center gap-2.5 mb-5">
                  <span className="w-2 h-2 rounded-full block" style={{ background: b.c }} />
                  <span className="mono text-[11px] text-ink-50 tracking-[0.1em]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="display mb-5" style={{ fontSize: 24, letterSpacing: '-.02em' }}>
                  {b.t}
                </h3>
                <ul className="flex flex-col gap-2">
                  {b.items.map((it, j) => (
                    <li
                      key={j}
                      className="flex items-start gap-2"
                      style={{ fontSize: 14, color: 'var(--ink-70)' }}
                    >
                      <span style={{ color: b.c, marginTop: 2 }}>
                        <Check size={14} />
                      </span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA CONTATO */}
      <section style={{ padding: '32px 0 96px' }}>
        <div className="container-site">
          <div
            className="rounded-2xl flex flex-wrap items-center justify-between gap-4"
            style={{ background: 'var(--azul)', color: 'white', padding: 32 }}
          >
            <div>
              <div className="mono text-[11px] tracking-[0.14em] opacity-70 mb-2">
                DÚVIDAS OU QUER VISITAR A PLANTA?
              </div>
              <h3 className="display" style={{ fontSize: 'clamp(24px, 3vw, 36px)' }}>
                Fale com nosso time comercial
              </h3>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <a
                href="tel:+5599988334432"
                className="btn"
                style={{ background: 'white', color: 'var(--azul)' }}
              >
                <Phone size={14} /> (99) 98833-4432
              </a>
              <a
                href="https://wa.me/5599988334432?text=Ol%C3%A1%21%20Tenho%20interesse%20em%20reservar%20um%20stand%20na%20Feira%20Multisetorial%20da%20Semana%20Empresarial%202026."
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{ background: '#25D366', color: 'white' }}
              >
                <MessageCircle size={14} /> WhatsApp
              </a>
              <a
                href="mailto:acia.aca@gmail.com"
                className="btn"
                style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.4)' }}
              >
                acia.aca@gmail.com <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* RESERVATION MODAL — renderizado via portal para escapar do transform do canvas */}
      {selectedStand && (
        <ModalPortal>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              zIndex: 1000,
              overscrollBehavior: 'contain',
            }}
            onClick={closeReservation}
          >
          <div
            className="rounded-2xl bg-white"
            style={{
              width: '100%',
              maxWidth: 560,
              maxHeight: 'min(92vh, 900px)',
              overflowY: 'auto',
              border: '1px solid var(--line)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
              overscrollBehavior: 'contain',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {success ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div
                  className="mx-auto mb-5 rounded-full grid place-items-center"
                  style={{ width: 64, height: 64, background: 'var(--verde)' }}
                >
                  <Check size={32} strokeWidth={2.5} />
                </div>
                <div className="eyebrow mb-3 justify-center">
                  <span className="dot" style={{ background: 'var(--verde)' }} />
                  RESERVA ENVIADA
                </div>
                <h3 className="display mb-3" style={{ fontSize: 28 }}>
                  Stand {selectedStand.number} pré-reservado!
                </h3>
                <p className="mb-6" style={{ color: 'var(--ink-70)', fontSize: 15, lineHeight: 1.5 }}>
                  Nossa equipe comercial entrará em contato pelo email{' '}
                  <strong>{form.email}</strong> em até 24h para confirmar a reserva e enviar o
                  contrato.
                </p>
                <button onClick={closeReservation} className="btn btn-primary">
                  Fechar <ArrowRight size={14} />
                </button>
              </div>
            ) : duplicatePrompt ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div
                  className="mx-auto mb-5 rounded-full grid place-items-center"
                  style={{ width: 64, height: 64, background: 'rgba(248,130,30,0.15)', color: 'var(--laranja)' }}
                >
                  <Tag size={30} strokeWidth={2.2} />
                </div>
                <div className="eyebrow mb-3 justify-center">
                  <span className="dot" style={{ background: 'var(--laranja)' }} />
                  CONFIRMAÇÃO NECESSÁRIA
                </div>
                <h3 className="display mb-4" style={{ fontSize: 24, letterSpacing: '-0.02em' }}>
                  Já existe um stand para esta empresa
                </h3>
                <p
                  className="mb-6 mx-auto"
                  style={{ color: 'var(--ink-70)', fontSize: 15, lineHeight: 1.5, maxWidth: 420 }}
                >
                  {duplicatePrompt}
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => setDuplicatePrompt(null)}
                    className="btn"
                    style={{ background: 'white', border: '1px solid var(--line)' }}
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => submitReservation(true)}
                    className="btn btn-orange"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    {submitting ? 'Reservando...' : `Sim, reservar stand ${selectedStand.number}`}
                  </button>
                </div>
                <p
                  className="text-xs mt-4"
                  style={{ color: 'var(--ink-50)' }}
                >
                  Ao confirmar, uma nova reserva será criada mesmo com stand já existente para o mesmo email/CNPJ.
                </p>
              </div>
            ) : (
              <>
                {/* Header modal */}
                <div
                  className="flex items-start justify-between gap-4"
                  style={{ padding: '28px 32px 20px', borderBottom: '1px solid var(--line)' }}
                >
                  <div className="min-w-0">
                    <div className="eyebrow mb-2">
                      <span
                        className="dot"
                        style={{ background: STAND_TYPE_STYLES[selectedStand.type].bg }}
                      />
                      {STAND_TYPE_STYLES[selectedStand.type].label.toUpperCase()} ·{' '}
                      {selectedStand.size}
                    </div>
                    <h3 className="display" style={{ fontSize: 32 }}>
                      Stand {selectedStand.number}
                    </h3>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="display" style={{ fontSize: 24, color: 'var(--laranja)' }}>
                        {formatPrice(selectedStand.price)}
                      </span>
                      <span className="mono text-[11px]" style={{ color: 'var(--ink-50)' }}>
                        · até 5x sem juros
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={closeReservation}
                    className="rounded p-2 hover:bg-[var(--paper-2)]"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '24px 32px 32px' }}>
                  {error && (
                    <div
                      className="mb-4 p-3 rounded-lg text-sm"
                      style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
                    >
                      {error}
                    </div>
                  )}

                  <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-3">
                    DADOS DA EMPRESA
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <label className="block sm:col-span-2">
                      <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2">
                        NOME DA EMPRESA *
                      </div>
                      <input
                        type="text"
                        name="company_name"
                        value={form.company_name}
                        onChange={handleChange}
                        required
                        placeholder="Razão social ou nome fantasia"
                        style={inputStyle}
                      />
                    </label>
                    <label className="block">
                      <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2">CNPJ</div>
                      <input
                        type="text"
                        name="cnpj"
                        value={form.cnpj}
                        onChange={(e) => setForm((p) => ({ ...p, cnpj: formatCNPJ(e.target.value) }))}
                        placeholder="00.000.000/0000-00"
                        style={inputStyle}
                      />
                    </label>
                    <label className="block">
                      <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2">
                        SEGMENTO *
                      </div>
                      <select
                        name="segment"
                        value={form.segment}
                        onChange={handleChange}
                        required
                        style={inputStyle}
                      >
                        <option value="">Selecione...</option>
                        {SEGMENTS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-3 mt-5">
                    RESPONSÁVEL
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                    <label className="block">
                      <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2">NOME *</div>
                      <input
                        type="text"
                        name="responsible_name"
                        value={form.responsible_name}
                        onChange={handleChange}
                        required
                        placeholder="Nome completo"
                        style={inputStyle}
                      />
                    </label>
                    <label className="block">
                      <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2">CARGO</div>
                      <input
                        type="text"
                        name="responsible_role"
                        value={form.responsible_role}
                        onChange={handleChange}
                        placeholder="Diretor, Gerente..."
                        style={inputStyle}
                      />
                    </label>
                    <label className="block">
                      <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2">E-MAIL *</div>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        placeholder="contato@empresa.com"
                        style={inputStyle}
                      />
                    </label>
                    <label className="block">
                      <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2">
                        TELEFONE / WHATSAPP *
                      </div>
                      <input
                        type="text"
                        name="phone"
                        value={form.phone}
                        onChange={(e) => setForm((p) => ({ ...p, phone: formatPhone(e.target.value) }))}
                        required
                        placeholder="(00) 00000-0000"
                        style={inputStyle}
                      />
                    </label>
                  </div>

                  <label className="block mb-6">
                    <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2">
                      DESCRIÇÃO (opcional)
                    </div>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={3}
                      placeholder="O que sua empresa pretende expor?"
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-orange btn-lg w-full justify-center disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    {submitting
                      ? 'Enviando reserva...'
                      : `Reservar stand ${selectedStand.number}`}
                  </button>

                  <p className="text-xs text-center mt-3" style={{ color: 'var(--ink-50)' }}>
                    Reserva pré-confirmada. Nossa equipe contata em até 24h para finalizar.
                  </p>
                </form>
              </>
            )}
          </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}

function InfoTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="shrink-0 rounded-xl grid place-items-center"
        style={{
          width: 44,
          height: 44,
          background: `color-mix(in srgb, ${accent} 12%, white)`,
          color: accent,
        }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="mono text-[10px] tracking-[0.14em]" style={{ color: 'var(--ink-50)' }}>
          {label}
        </div>
        <div
          className="display truncate"
          style={{ fontSize: 20, letterSpacing: '-0.02em', color: 'var(--ink)' }}
        >
          {value}
        </div>
      </div>
    </div>
  )
}
