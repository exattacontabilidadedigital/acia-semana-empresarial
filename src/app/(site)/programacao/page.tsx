'use client'

import { useState, useCallback, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import MinhasInscricoesPanel from '@/components/carrinho/MinhasInscricoesPanel'

// Code-splitting: estes componentes só carregam quando o usuário escolhe o método
// de pagamento, evitando trazer toda a lógica de checkout no bundle inicial.
const PixPayment = dynamic(() => import('@/components/checkout/PixPayment'), {
  loading: () => null,
})
const BoletoPayment = dynamic(() => import('@/components/checkout/BoletoPayment'), {
  loading: () => null,
})
const CreditCardForm = dynamic(() => import('@/components/checkout/CreditCardForm'), {
  loading: () => null,
})
/* eslint-disable @next/next/no-img-element */
import {
  CalendarCheck2,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Ticket,
  Users,
  UserPlus,
  X,
} from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import {
  formatCurrency,
  formatDate,
  formatTime,
  formatCPF,
  formatPhone,
  formatCNPJ,
} from '@/lib/utils'
import { inscriptionPersonalSchema } from '@/lib/schemas/inscription'

const DRAFT_STORAGE_KEY = 'checkout-form-draft'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'var(--paper)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
}

type Mode = 'single' | 'multiple'

interface ParticipantState {
  nome: string
  email: string
  cpf: string
  telefone: string
  nome_empresa: string
  cargo: string
  cep: string
  rua: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  complemento: string
  accepted_terms: boolean
  eventIds: number[]
}

function emptyParticipant(): ParticipantState {
  return {
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    nome_empresa: '',
    cargo: '',
    cep: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    complemento: '',
    accepted_terms: false,
    eventIds: [],
  }
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2">
        {label.toUpperCase()}
        {required ? ' *' : ''}
      </div>
      {children}
      {error && (
        <p
          className="mt-1 text-[11px] font-medium"
          style={{ color: '#dc2626' }}
        >
          {error}
        </p>
      )}
    </label>
  )
}

export default function CarrinhoPage() {
  return (
    <Suspense fallback={null}>
      <CarrinhoPageInner />
    </Suspense>
  )
}

function CarrinhoPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { cart, removeFromCart, updateCartItem, clearCart, cartCount, cartTotal } = useCart()
  const [step, setStep] = useState<'cart' | 'form' | 'payment'>('cart')
  const [tab, setTab] = useState<'rascunho' | 'confirmadas'>(
    searchParams?.get('aba') === 'confirmadas' ? 'confirmadas' : 'rascunho',
  )

  type PaymentMethod = 'PIX' | 'BOLETO' | 'CREDIT_CARD'
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX')

  type CheckoutResponse = {
    success: true
    purchase_group: string
    payment_url: string | null
    payment_id: string | null
    payment_method: PaymentMethod | null
    has_paid: boolean
    has_free: boolean
    total_amount: number
    pix: { qrCodeImage: string; payload: string; expiresAt: string | null } | null
    boleto: { bankSlipUrl: string; identificationField: string | null; dueDate: string } | null
  }
  const [checkoutResponse, setCheckoutResponse] = useState<CheckoutResponse | null>(null)

  useEffect(() => {
    const aba = searchParams?.get('aba')
    if (aba === 'confirmadas') setTab('confirmadas')
    else if (aba === 'rascunho') setTab('rascunho')
  }, [searchParams])

  const [mode, setMode] = useState<Mode>('single')
  const [participants, setParticipants] = useState<ParticipantState[]>([emptyParticipant()])
  const [participantErrors, setParticipantErrors] = useState<Record<number, Record<string, string>>>({})
  const [formError, setFormError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cpfState, setCpfState] = useState<Record<number, { loaded: boolean; loading: boolean }>>({})
  const [cepState, setCepState] = useState<Record<number, { loading: boolean; filled: boolean }>>({})

  const [cnpj, setCnpj] = useState('')
  const [cnpjRequired, setCnpjRequired] = useState(false)
  const [cnpjLoading, setCnpjLoading] = useState(false)
  const [cnpjCompanyName, setCnpjCompanyName] = useState('')
  const [cnpjError, setCnpjError] = useState('')
  const [couponErrors, setCouponErrors] = useState<Record<number, string>>({})
  const [draftHydrated, setDraftHydrated] = useState(false)

  const totalSlots = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart])
  // Modo múltiplos só faz sentido quando há mais de 1 evento selecionado.
  const allowMultipleMode = cart.length >= 2

  // Hidrata rascunho do localStorage com migração leve do formato antigo
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, unknown>
        if (Array.isArray(saved.participants)) {
          // formato novo
          setMode((saved.mode as Mode) || 'single')
          setParticipants(
            (saved.participants as Partial<ParticipantState>[]).map((p) => ({
              ...emptyParticipant(),
              ...p,
              accepted_terms: false,
              eventIds: Array.isArray(p.eventIds) ? p.eventIds : [],
            })),
          )
          if (saved.cnpj) setCnpj(saved.cnpj as string)
        } else {
          // formato antigo (objeto único) → embrulhar
          const { accepted_terms: _omit, cnpj: savedCnpj, ...rest } = saved as Record<string, unknown>
          setParticipants([
            {
              ...emptyParticipant(),
              ...(rest as Partial<ParticipantState>),
              accepted_terms: false,
              eventIds: [],
            },
          ])
          if (savedCnpj) setCnpj(savedCnpj as string)
        }
      }
    } catch {
      /* ignore corrupted draft */
    } finally {
      setDraftHydrated(true)
    }
  }, [])

  // Persiste rascunho a cada mudança (depois de hidratar)
  useEffect(() => {
    if (!draftHydrated) return
    try {
      const sanitized = participants.map((p) => {
        const { accepted_terms: _o, ...rest } = p
        return rest
      })
      const payload = { mode, participants: sanitized, cnpj }
      const hasContent = sanitized.some((p) =>
        Object.values(p).some((v) => v && (typeof v === 'string' ? v.length > 0 : true)),
      )
      if (hasContent) {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload))
      } else {
        localStorage.removeItem(DRAFT_STORAGE_KEY)
      }
    } catch {
      /* quota — ignora */
    }
  }, [mode, participants, cnpj, draftHydrated])

  // Quando o carrinho muda, ajusta eventIds dos participantes para não referenciar eventos removidos
  useEffect(() => {
    if (!draftHydrated) return
    const cartEventIds = new Set(cart.map((c) => c.eventId))
    setParticipants((prev) =>
      prev.map((p) => ({
        ...p,
        eventIds: p.eventIds.filter((id) => cartEventIds.has(id)),
      })),
    )
  }, [cart, draftHydrated])

  // Se o carrinho tem só 1 evento, força modo single e mantém apenas o titular.
  useEffect(() => {
    if (!allowMultipleMode && (mode === 'multiple' || participants.length > 1)) {
      setMode('single')
      setParticipants((prev) => [{ ...prev[0], eventIds: [] }])
      setParticipantErrors({})
    }
  }, [allowMultipleMode, mode, participants.length])

  const updateParticipant = (index: number, patch: Partial<ParticipantState>) => {
    setParticipants((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)))
    // limpa erros dos campos editados
    if (patch) {
      setParticipantErrors((prev) => {
        const next = { ...prev }
        const errsForP = { ...(next[index] ?? {}) }
        for (const key of Object.keys(patch)) {
          delete errsForP[key]
        }
        next[index] = errsForP
        return next
      })
    }
  }

  const handleAddParticipant = () => {
    setParticipants((prev) => [...prev, emptyParticipant()])
  }

  const handleRemoveParticipant = (index: number) => {
    if (index === 0) return
    setParticipants((prev) => prev.filter((_, i) => i !== index))
    setParticipantErrors((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
    setCpfState((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
    setCepState((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }

  const handleModeChange = (newMode: Mode) => {
    if (mode === newMode) return
    if (newMode === 'single' && participants.length > 1) {
      const ok = window.confirm(
        `Voltar para "Único participante" vai apagar os dados dos outros ${participants.length - 1} cadastro(s). Continuar?`,
      )
      if (!ok) return
      setParticipants([{ ...participants[0], eventIds: [] }])
      setParticipantErrors({})
    }
    // Em qualquer transição, limpa eventIds (no modo single eles são ignorados; no multiple
    // o usuário atribui explicitamente)
    setParticipants((prev) => prev.map((p) => ({ ...p, eventIds: [] })))
    setMode(newMode)
  }

  const lookupCPF = useCallback(async (index: number, cpfDigits: string) => {
    if (cpfDigits.length !== 11) return
    let alreadyLoaded = false
    setCpfState((prev) => {
      if (prev[index]?.loaded) {
        alreadyLoaded = true
        return prev
      }
      return { ...prev, [index]: { loaded: false, loading: true } }
    })
    if (alreadyLoaded) return
    try {
      const res = await fetch(`/api/inscriptions/lookup?cpf=${cpfDigits}`)
      const data = await res.json()
      if (data.found) {
        // IMPORTANTE: preserva valores que o usuário já digitou. Em fluxo multi-participante
        // o lookup pode retornar dados de uma inscrição antiga que não corresponde ao
        // participante real (ex.: CPF reutilizado de uma compra passada com outro nome).
        setParticipants((prev) =>
          prev.map((p, i) => {
            if (i !== index) return p
            return {
              ...p,
              nome: p.nome || data.data.nome || '',
              email: p.email || data.data.email || '',
              telefone:
                p.telefone ||
                (data.data.telefone ? formatPhone(data.data.telefone) : ''),
              nome_empresa: p.nome_empresa || data.data.nome_empresa || '',
              cargo: p.cargo || data.data.cargo || '',
              cep: p.cep || data.data.cep || '',
              rua: p.rua || data.data.rua || '',
              numero: p.numero || data.data.numero || '',
              bairro: p.bairro || data.data.bairro || '',
              cidade: p.cidade || data.data.cidade || '',
              estado: p.estado || data.data.estado || '',
              complemento: p.complemento || data.data.complemento || '',
            }
          }),
        )
        setCpfState((prev) => ({ ...prev, [index]: { loaded: true, loading: false } }))
        return
      }
      setCpfState((prev) => ({ ...prev, [index]: { loaded: false, loading: false } }))
    } catch {
      setCpfState((prev) => ({ ...prev, [index]: { loaded: false, loading: false } }))
    }
  }, [])

  const handleCPFChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    updateParticipant(index, { cpf: formatCPF(digits) })
    if (digits.length === 11) lookupCPF(index, digits)
    else setCpfState((prev) => ({ ...prev, [index]: { loaded: false, loading: false } }))
  }

  const handlePhoneChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    updateParticipant(index, { telefone: formatPhone(digits) })
  }

  const handleCEPChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
    updateParticipant(index, { cep: formatted })
    if (digits.length < 8) setCepState((prev) => ({ ...prev, [index]: { loading: false, filled: false } }))
  }

  const lookupCEP = useCallback(
    async (index: number) => {
      const cep = participants[index]?.cep ?? ''
      const digits = cep.replace(/\D/g, '')
      if (digits.length !== 8) return
      setCepState((prev) => ({ ...prev, [index]: { loading: true, filled: false } }))
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
          signal: controller.signal,
        })
        const data = await res.json()
        if (data.erro) {
          setCepState((prev) => ({ ...prev, [index]: { loading: false, filled: false } }))
          return
        }
        updateParticipant(index, {
          rua: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
          complemento: data.complemento || '',
        })
        setCepState((prev) => ({ ...prev, [index]: { loading: false, filled: true } }))
      } catch (err) {
        const aborted = err instanceof Error && err.name === 'AbortError'
        if (aborted) {
          console.warn('[CEP] Timeout em ViaCEP — preencher manualmente')
        }
        setCepState((prev) => ({ ...prev, [index]: { loading: false, filled: false } }))
      } finally {
        clearTimeout(timeoutId)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [participants],
  )

  const lookupCNPJ = useCallback(async (cnpjDigits: string) => {
    if (cnpjDigits.length !== 14) return
    setCnpjLoading(true)
    setCnpjError('')
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    try {
      const res = await fetch(`/api/cnpj/${cnpjDigits}`, { signal: controller.signal })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setCnpjCompanyName('')
        if (res.status !== 404) {
          setCnpjError(err.error || 'Não foi possível consultar CNPJ.')
        }
        return
      }
      const data = await res.json()
      const name = data.nome_fantasia || data.razao_social || ''
      setCnpjCompanyName(name)
      if (name) {
        setParticipants((prev) =>
          prev.map((p, i) => (i === 0 && !p.nome_empresa ? { ...p, nome_empresa: name } : p)),
        )
      }
    } catch (err) {
      const aborted = err instanceof Error && err.name === 'AbortError'
      setCnpjCompanyName('')
      setCnpjError(
        aborted
          ? 'A consulta está demorando — preencha os campos da empresa manualmente.'
          : 'Não foi possível consultar CNPJ. Preencha manualmente.',
      )
    } finally {
      clearTimeout(timeoutId)
      setCnpjLoading(false)
    }
  }, [])

  const handleCnpjChange = (value: string) => {
    const formatted = formatCNPJ(value)
    setCnpj(formatted)
    setCnpjError('')
    const digits = formatted.replace(/\D/g, '')
    if (digits.length < 14) {
      setCnpjCompanyName('')
    } else {
      lookupCNPJ(digits)
    }
  }

  // Revalida cupons quando CNPJ muda
  useEffect(() => {
    const digits = cnpj.replace(/\D/g, '')
    if (digits.length !== 0 && digits.length !== 14) return

    const timer = setTimeout(() => {
      const itemsToRecheck = cart.filter(
        (item) => item.couponCode || couponErrors[item.eventId],
      )
      if (itemsToRecheck.length === 0) {
        if (digits.length === 14) setCnpjRequired(false)
        return
      }
      setCnpjRequired(false)
      for (const item of itemsToRecheck) {
        const code = item.couponCode
        if (code) validateCoupon(item.eventId, code)
      }
    }, 500)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cnpj])

  const validateCoupon = async (eventId: number, couponCode: string) => {
    setCouponErrors((prev) => {
      const next = { ...prev }
      delete next[eventId]
      return next
    })
    if (!couponCode.trim()) return
    try {
      const cnpjDigits = cnpj.replace(/\D/g, '')
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode,
          event_id: eventId,
          cnpj: cnpjDigits || null,
        }),
      })
      const data = await res.json()

      if (!data.valid) {
        if (data.requires_cnpj) {
          setCnpjRequired(true)
        }
        setCouponErrors((prev) => ({
          ...prev,
          [eventId]: data.message ?? 'Cupom inválido.',
        }))
        updateCartItem(eventId, { couponCode: null, couponDiscount: 0 })
        return
      }

      const item = cart.find((c) => c.eventId === eventId)
      const unit = item?.isHalfPrice ? (item.price ?? 0) / 2 : item?.price ?? 0
      const discountPerUnit =
        data.discount_type === 'percentage'
          ? unit * (Number(data.discount_value) / 100)
          : Number(data.discount_value)

      updateCartItem(eventId, {
        couponCode,
        couponDiscount: discountPerUnit,
      })
    } catch {
      setCouponErrors((prev) => ({
        ...prev,
        [eventId]: 'Erro ao validar cupom.',
      }))
    }
  }

  // Distribuição de slots por evento (multiple mode)
  const eventAssignmentCounts = useMemo(() => {
    const map = new Map<number, number>()
    for (const p of participants) {
      for (const eid of p.eventIds) {
        map.set(eid, (map.get(eid) ?? 0) + 1)
      }
    }
    return map
  }, [participants])

  const totalAssignedSlots = useMemo(
    () => participants.reduce((s, p) => s + p.eventIds.length, 0),
    [participants],
  )

  const slotsRemaining = totalSlots - totalAssignedSlots

  const allSlotsFilled = mode === 'multiple' ? slotsRemaining === 0 : true
  const canAddParticipant = mode === 'multiple' && participants.length < totalSlots

  // Toggle de evento para um participante (em modo multiple)
  const toggleEventForParticipant = (participantIndex: number, eventId: number) => {
    setParticipants((prev) =>
      prev.map((p, i) => {
        if (i !== participantIndex) return p
        const has = p.eventIds.includes(eventId)
        if (has) {
          // remover apenas a primeira ocorrência (caso seja qty>1, ainda permite outra alocação)
          const idx = p.eventIds.indexOf(eventId)
          const next = [...p.eventIds]
          next.splice(idx, 1)
          return { ...p, eventIds: next }
        }
        // verificar se ainda há slot disponível para esse evento
        const cartItem = cart.find((c) => c.eventId === eventId)
        if (!cartItem) return p
        const used = eventAssignmentCounts.get(eventId) ?? 0
        if (used >= cartItem.quantity) return p
        return { ...p, eventIds: [...p.eventIds, eventId] }
      }),
    )
  }

  // Valida os dados dos participantes; se ok e há pagamento devido, avança para step payment.
  // Se for tudo grátis, submete direto.
  const handleAdvanceToPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const newErrors: Record<number, Record<string, string>> = {}
    const cpfsSeen = new Set<string>()
    let firstError = ''

    for (let i = 0; i < participants.length; i++) {
      const p = participants[i]
      const result = inscriptionPersonalSchema.safeParse(p)
      const fieldErrors: Record<string, string> = {}
      if (!result.success) {
        result.error.errors.forEach((err) => {
          const field = err.path[0] as string
          if (!fieldErrors[field]) fieldErrors[field] = err.message
        })
      }
      const digits = p.cpf.replace(/\D/g, '')
      if (digits.length === 11) {
        if (cpfsSeen.has(digits)) {
          fieldErrors.cpf = 'CPF duplicado entre participantes'
        }
        cpfsSeen.add(digits)
      }
      if (mode === 'multiple' && p.eventIds.length === 0) {
        fieldErrors.eventIds = 'Vincule pelo menos 1 evento a este participante'
      }
      if (Object.keys(fieldErrors).length > 0) {
        newErrors[i] = fieldErrors
        if (!firstError) firstError = `Participante ${i + 1}: revise os campos destacados`
      }
    }

    if (mode === 'multiple') {
      for (const item of cart) {
        const allocated = eventAssignmentCounts.get(item.eventId) ?? 0
        if (allocated !== item.quantity) {
          firstError = firstError || 'Distribua todos os ingressos entre os participantes'
          break
        }
      }
    }

    if (Object.keys(newErrors).length > 0 || firstError) {
      setParticipantErrors(newErrors)
      setFormError(firstError || 'Revise os dados do formulário')
      return
    }

    if (cartTotal === 0) {
      // Tudo gratuito — submete direto, sem step de pagamento
      await submitCheckout(null)
      return
    }

    setStep('payment')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submitCheckout = async (method: PaymentMethod | null) => {
    setIsSubmitting(true)
    setFormError('')
    try {
      const cnpjDigits = cnpj.replace(/\D/g, '')
      const payload = {
        items: cart.map((item) => ({
          event_id: item.eventId,
          quantity: item.quantity,
          is_half_price: item.isHalfPrice,
          coupon_code: item.couponCode || undefined,
        })),
        cnpj: cnpjDigits || null,
        mode,
        participants: participants.map((p) => ({
          nome: p.nome,
          email: p.email,
          cpf: p.cpf.replace(/\D/g, ''),
          telefone: p.telefone.replace(/\D/g, ''),
          nome_empresa: p.nome_empresa || null,
          cargo: p.cargo || null,
          cep: p.cep.replace(/\D/g, ''),
          rua: p.rua,
          numero: p.numero,
          bairro: p.bairro,
          cidade: p.cidade,
          estado: p.estado,
          complemento: p.complemento || null,
          accepted_terms: true as const,
          ...(mode === 'multiple' ? { event_ids: p.eventIds } : {}),
        })),
        payment_method: method,
      }

      const res = await fetch('/api/cart/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await res.json()) as CheckoutResponse | { error: string }
      if (!res.ok || !('success' in data)) {
        const msg = ('error' in data ? data.error : '') || 'Erro ao processar checkout'
        setFormError(msg)
        return
      }

      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY)
      } catch {
        /* ignore */
      }
      clearCart()

      // Tudo grátis vai direto para confirmação. Caso contrário, mantém na página
      // (PIX/Boleto/Cartão são todos inline agora).
      if (!data.has_paid) {
        router.push(`/confirmacao/grupo/${data.purchase_group}`)
        return
      }
      setCheckoutResponse(data)
    } catch {
      setFormError('Erro de conexão. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const rascunhoVazio = cart.length === 0

  // RESUMO (sidebar)
  const OrderSidebar = ({ showEditButton = false }: { showEditButton?: boolean }) => (
    <div
      className="rounded-2xl overflow-hidden lg:sticky lg:top-24"
      style={{ background: 'var(--ink)', color: 'white' }}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-1.5">
          <div className="mono text-[10px] tracking-[0.1em]" style={{ opacity: 0.6 }}>
            RESUMO DO PEDIDO
          </div>
          <div className="mono text-[10px] tracking-[0.1em]" style={{ color: 'var(--verde)' }}>
            ● PRÉ-RESERVA
          </div>
        </div>
        <p className="text-xs" style={{ color: '#a0a2c2' }}>
          {cart.length} {cart.length === 1 ? 'evento' : 'eventos'} · {cartCount}{' '}
          {cartCount === 1 ? 'ingresso' : 'ingressos'}
        </p>
      </div>

      <div className="px-6 pb-6 flex flex-col gap-3">
        {cart.map((item) => {
          const unitPrice = item.isHalfPrice ? item.price / 2 : item.price
          const discount = item.couponDiscount * item.quantity
          const itemTotal = Math.max(0, unitPrice * item.quantity - discount)
          return (
            <div
              key={item.eventId}
              className="rounded-lg p-3"
              style={{ background: '#2a2b52' }}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{item.eventTitle}</div>
                  <div
                    className="mono text-[10px] mt-1"
                    style={{ color: '#a0a2c2', letterSpacing: '0.05em' }}
                  >
                    {formatDate(item.eventDate)} · {formatTime(item.eventTime)}
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: '#a0a2c2' }}>
                    {item.quantity}x{' '}
                    {item.isHalfPrice
                      ? 'meia'
                      : item.price === 0
                        ? 'gratuito'
                        : 'inteira'}
                    {item.couponCode && ` + cupom ${item.couponCode}`}
                  </div>
                </div>
                <div className="mono text-[13px] whitespace-nowrap">
                  {item.price === 0 ? 'Grátis' : formatCurrency(itemTotal)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div
        className="px-6 py-5 flex justify-between items-baseline"
        style={{ borderTop: '1px solid #2a2b52' }}
      >
        <div>
          <div className="mono text-[10px] tracking-[0.1em]" style={{ opacity: 0.6 }}>
            TOTAL
          </div>
        </div>
        <div className="display text-[28px]" style={{ letterSpacing: '-.02em' }}>
          {cartTotal === 0 ? 'Gratuito' : formatCurrency(cartTotal)}
        </div>
      </div>

      {showEditButton && (
        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={() => {
              setStep('cart')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="w-full text-xs font-semibold underline-offset-4 hover:underline"
            style={{ color: 'var(--verde)' }}
          >
            Editar programação
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="page-enter">
      <section style={{ padding: '64px 0 32px' }}>
        <div className="container-site">
          <div className="eyebrow mb-6">
            <span className="dot" />
            {step === 'cart'
              ? 'MINHA PROGRAMAÇÃO'
              : step === 'form'
                ? 'DADOS DOS PARTICIPANTES'
                : 'PAGAMENTO'}
          </div>
          <h1
            className="display mb-6"
            style={{ fontSize: 'clamp(40px, 6vw, 80px)' }}
          >
            {step === 'cart' ? (
              tab === 'confirmadas' ? (
                <>
                  Suas <span style={{ color: 'var(--laranja)' }}>inscrições</span>.
                </>
              ) : (
                <>
                  Sua <span style={{ color: 'var(--laranja)' }}>programação</span>.
                </>
              )
            ) : step === 'form' ? (
              <>
                Seus <span style={{ color: 'var(--laranja)' }}>dados</span>.
              </>
            ) : (
              <>
                Hora do <span style={{ color: 'var(--laranja)' }}>pagamento</span>.
              </>
            )}
          </h1>

          {step === 'cart' && (
            <div
              className="flex gap-1 mt-10 pt-8 p-1 rounded-full w-full sm:w-auto sm:inline-flex"
              style={{
                borderTop: '1px solid var(--line)',
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
              }}
            >
              <div
                className="flex gap-1 p-1 rounded-full"
                style={{ background: 'var(--paper-2)' }}
              >
                <button
                  type="button"
                  onClick={() => setTab('rascunho')}
                  className="px-4 py-2 rounded-full text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                  style={{
                    background: tab === 'rascunho' ? 'var(--ink)' : 'transparent',
                    color: tab === 'rascunho' ? 'white' : 'var(--ink-70)',
                  }}
                >
                  <CalendarCheck2 size={14} />
                  Rascunho
                  {cartCount > 0 && (
                    <span
                      className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background:
                          tab === 'rascunho' ? 'var(--laranja)' : 'var(--ink)',
                        color: 'white',
                      }}
                    >
                      {cartCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setTab('confirmadas')}
                  className="px-4 py-2 rounded-full text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                  style={{
                    background: tab === 'confirmadas' ? 'var(--ink)' : 'transparent',
                    color: tab === 'confirmadas' ? 'white' : 'var(--ink-70)',
                  }}
                >
                  <Ticket size={14} />
                  Já sou inscrito
                </button>
              </div>
            </div>
          )}

          {(step === 'form' || step === 'payment') && (
            <div className="flex gap-2 mt-6">
              {[
                { l: 'Programação', i: 1 },
                { l: 'Dados', i: 2 },
                { l: 'Pagamento', i: 3 },
              ].map((s) => {
                const current = step === 'form' ? 2 : 3
                const isActive = current === s.i
                const isDone = current > s.i
                return (
                  <div
                    key={s.i}
                    className="flex-1 rounded-lg"
                    style={{
                      padding: '14px 16px',
                      background: isActive
                        ? 'var(--ink)'
                        : isDone
                          ? 'var(--verde)'
                          : 'var(--paper-2)',
                      color: isActive || isDone ? 'white' : 'var(--ink-70)',
                    }}
                  >
                    <div
                      className="mono text-[10px] tracking-[0.1em]"
                      style={{ opacity: 0.7 }}
                    >
                      ETAPA {s.i}
                    </div>
                    <div className="text-sm font-semibold mt-1">{s.l}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <section style={{ padding: '24px 0 96px' }}>
        <div className="container-site">
          {step === 'cart' && tab === 'confirmadas' && <MinhasInscricoesPanel />}

          {step === 'cart' && tab === 'rascunho' && rascunhoVazio && (
            <div
              className="bg-white border border-line rounded-2xl text-center"
              style={{ padding: '64px 32px', maxWidth: 560, margin: '0 auto' }}
            >
              <div
                className="mx-auto mb-6 rounded-full grid place-items-center"
                style={{ width: 72, height: 72, background: 'var(--paper-2)' }}
              >
                <CalendarCheck2 size={28} />
              </div>
              <h2
                className="display mb-3"
                style={{ fontSize: 28, letterSpacing: '-.02em' }}
              >
                Sua programação está{' '}
                <span style={{ color: 'var(--laranja)' }}>vazia</span>.
              </h2>
              <p
                className="mb-6"
                style={{ fontSize: 15, color: 'var(--ink-70)', lineHeight: 1.6 }}
              >
                Escolha os eventos que você quer participar e monte sua agenda da semana.
              </p>
              <Link href="/inscricoes" className="btn btn-primary btn-lg">
                Ver eventos <ArrowRight size={16} />
              </Link>
            </div>
          )}

          {step === 'cart' && tab === 'rascunho' && !rascunhoVazio && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 flex flex-col gap-3">
                {cart.map((item) => {
                  const unitPrice = item.isHalfPrice ? item.price / 2 : item.price
                  const discount = item.couponDiscount * item.quantity
                  const itemTotal = Math.max(0, unitPrice * item.quantity - discount)
                  return (
                    <div
                      key={item.eventId}
                      className="bg-white border border-line rounded-2xl"
                      style={{ padding: 24 }}
                    >
                      <div className="flex gap-4">
                        <div
                          className="rounded-xl overflow-hidden flex-shrink-0"
                          style={{ width: 80, height: 80 }}
                        >
                          {item.eventImageUrl ? (
                            <img
                              src={item.eventImageUrl}
                              alt={item.eventTitle}
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
                        <div className="flex-1 min-w-0">
                          <h3
                            className="display mb-1.5 truncate"
                            style={{ fontSize: 18, letterSpacing: '-.02em' }}
                          >
                            {item.eventTitle}
                          </h3>
                          <div
                            className="flex flex-wrap gap-x-4 gap-y-1 text-xs"
                            style={{ color: 'var(--ink-70)' }}
                          >
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {formatDate(item.eventDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {formatTime(item.eventTime)}
                            </span>
                            {item.eventLocation && (
                              <span className="flex items-center gap-1">
                                <MapPin size={12} />
                                {item.eventLocation}
                              </span>
                            )}
                          </div>
                          {item.price > 0 && (
                            <p
                              className="text-xs mt-1.5 mono"
                              style={{ color: 'var(--ink-50)' }}
                            >
                              {item.isHalfPrice ? 'Meia-entrada' : 'Inteira'}:{' '}
                              {formatCurrency(unitPrice)}/un
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.eventId)}
                          className="p-1.5 self-start transition-colors"
                          style={{ color: 'var(--ink-50)' }}
                          aria-label="Remover"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div
                        className="mt-5 pt-5 flex flex-wrap items-center gap-4"
                        style={{ borderTop: '1px solid var(--line)' }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="mono text-[11px] text-ink-50 tracking-[0.1em]">
                            QTD
                          </span>
                          <button
                            onClick={() =>
                              item.quantity <= 1
                                ? removeFromCart(item.eventId)
                                : updateCartItem(item.eventId, {
                                    quantity: item.quantity - 1,
                                  })
                            }
                            className="w-7 h-7 rounded-lg border border-line grid place-items-center hover:border-ink"
                            aria-label={`Diminuir quantidade de ${item.eventTitle}`}
                          >
                            <Minus size={14} aria-hidden="true" />
                          </button>
                          <span
                            className="text-sm font-bold w-6 text-center"
                            aria-label={`Quantidade: ${item.quantity}`}
                          >
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateCartItem(item.eventId, {
                                quantity: Math.min(10, item.quantity + 1),
                              })
                            }
                            className="w-7 h-7 rounded-lg border border-line grid place-items-center hover:border-ink disabled:opacity-40"
                            disabled={item.quantity >= 10}
                            aria-label={`Aumentar quantidade de ${item.eventTitle}`}
                          >
                            <Plus size={14} aria-hidden="true" />
                          </button>
                        </div>

                        {item.price > 0 && item.halfPriceSlots > 0 && (
                          <button
                            onClick={() =>
                              updateCartItem(item.eventId, {
                                isHalfPrice: !item.isHalfPrice,
                              })
                            }
                            className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                            style={{
                              borderColor: item.isHalfPrice
                                ? 'var(--verde-600)'
                                : 'var(--line)',
                              background: item.isHalfPrice
                                ? 'rgba(166,206,58,0.15)'
                                : 'white',
                              color: item.isHalfPrice ? 'var(--verde-600)' : 'var(--ink-50)',
                            }}
                          >
                            {item.isHalfPrice ? 'Meia ✓' : 'Meia-entrada'}
                          </button>
                        )}

                        {item.price > 0 && (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              {item.couponCode ? (
                                <span
                                  className="text-xs font-medium"
                                  style={{ color: 'var(--verde-600)' }}
                                >
                                  Cupom: {item.couponCode} (-
                                  {formatCurrency(item.couponDiscount)}/un)
                                </span>
                              ) : (
                                <CouponInput
                                  eventId={item.eventId}
                                  onApply={validateCoupon}
                                />
                              )}
                            </div>
                            {couponErrors[item.eventId] && (
                              <span
                                className="text-[11px] font-medium"
                                style={{ color: '#dc2626' }}
                              >
                                {couponErrors[item.eventId]}
                              </span>
                            )}
                          </div>
                        )}

                        <span
                          className="ml-auto display"
                          style={{
                            fontSize: 22,
                            letterSpacing: '-.02em',
                            color: 'var(--azul)',
                          }}
                        >
                          {item.price === 0 ? 'Gratuito' : formatCurrency(itemTotal)}
                        </span>
                      </div>
                    </div>
                  )
                })}

                {/* CNPJ de associado */}
                <div
                  className="bg-white border rounded-2xl p-5"
                  style={{ borderColor: 'var(--line)' }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1">
                      <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-1">
                        É ASSOCIADO ACIA?
                      </div>
                      <p className="text-sm" style={{ color: 'var(--ink-70)' }}>
                        Informe o CNPJ para aplicar cupons exclusivos de associado.
                        <span className="text-xs block mt-1" style={{ color: 'var(--ink-50)' }}>
                          Opcional — deixe em branco se usar um cupom público.
                        </span>
                      </p>
                    </div>
                    <div className="sm:w-72">
                      <input
                        type="text"
                        value={cnpj}
                        onChange={(e) => handleCnpjChange(e.target.value)}
                        placeholder="00.000.000/0000-00"
                        className="w-full"
                        style={{
                          ...inputStyle,
                          borderColor:
                            cnpjRequired && !cnpj
                              ? 'var(--laranja)'
                              : 'var(--line)',
                        }}
                      />
                      {cnpjLoading && (
                        <p className="mt-1 text-[11px]" style={{ color: 'var(--azul)' }}>
                          Buscando empresa...
                        </p>
                      )}
                      {!cnpjLoading && cnpjCompanyName && (
                        <p className="mt-1 text-[11px]" style={{ color: 'var(--verde-600)' }}>
                          {cnpjCompanyName}
                        </p>
                      )}
                      {!cnpjLoading && cnpjError && (
                        <p className="mt-1 text-[11px]" style={{ color: '#dc2626' }}>
                          {cnpjError}
                        </p>
                      )}
                      {cnpjRequired && !cnpj && !cnpjLoading && !cnpjError && (
                        <p className="mt-1 text-[11px]" style={{ color: '#b85d00' }}>
                          Cupom aplicado exige CNPJ de associado.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Link href="/" className="btn btn-ghost">
                    <Plus size={16} />
                    Adicionar mais eventos
                  </Link>
                  <button
                    type="button"
                    className="btn btn-orange btn-lg flex-1 justify-center"
                    onClick={() => {
                      setStep('form')
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  >
                    Continuar <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              <div className="hidden lg:block">
                <OrderSidebar />
              </div>

              <div className="lg:hidden">
                <div
                  className="rounded-2xl p-5"
                  style={{ background: 'var(--ink)', color: 'white' }}
                >
                  <div
                    className="flex justify-between items-baseline"
                    style={{ borderBottom: '1px solid #2a2b52', paddingBottom: 12 }}
                  >
                    <span className="text-sm" style={{ color: '#a0a2c2' }}>
                      {cartCount} ingresso{cartCount > 1 ? 's' : ''}
                    </span>
                    <span className="mono text-sm">{formatCurrency(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-3">
                    <span className="text-sm font-semibold">Total a pagar</span>
                    <span
                      className="display"
                      style={{ fontSize: 24, letterSpacing: '-.02em' }}
                    >
                      {cartTotal === 0 ? 'Gratuito' : formatCurrency(cartTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'form' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <form onSubmit={handleAdvanceToPayment} noValidate>
                  {formError && (
                    <div
                      className="mb-6 p-4 rounded-xl text-sm font-medium"
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                      }}
                      role="alert"
                    >
                      {formError}
                    </div>
                  )}

                  {/* Toggle de modo: só faz sentido com 2+ eventos no carrinho */}
                  {allowMultipleMode && (
                    <div
                      className="bg-white border border-line rounded-2xl mb-6"
                      style={{ padding: 24 }}
                    >
                      <div className="mono text-[11px] text-ink-50 tracking-[0.1em] mb-3">
                        QUANTAS PESSOAS VÃO PARTICIPAR?
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          type="button"
                          onClick={() => handleModeChange('single')}
                          className="flex-1 text-left rounded-xl p-4 border-2 transition-colors"
                          style={{
                            borderColor: mode === 'single' ? 'var(--azul)' : 'var(--line)',
                            background:
                              mode === 'single' ? 'var(--azul-50)' : 'var(--paper)',
                          }}
                        >
                          <div className="flex items-center gap-3 mb-1">
                            <div
                              className="rounded-full grid place-items-center"
                              style={{
                                width: 32,
                                height: 32,
                                background: mode === 'single' ? 'var(--azul)' : 'var(--paper-2)',
                                color: mode === 'single' ? 'white' : 'var(--ink-70)',
                              }}
                            >
                              <Users size={16} />
                            </div>
                            <span className="font-semibold text-sm">Único participante</span>
                          </div>
                          <p className="text-xs" style={{ color: 'var(--ink-70)' }}>
                            Eu vou comparecer a todos os eventos selecionados ({totalSlots} ingresso
                            {totalSlots > 1 ? 's' : ''}).
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleModeChange('multiple')}
                          disabled={totalSlots < 2}
                          className="flex-1 text-left rounded-xl p-4 border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            borderColor: mode === 'multiple' ? 'var(--azul)' : 'var(--line)',
                            background:
                              mode === 'multiple' ? 'var(--azul-50)' : 'var(--paper)',
                          }}
                        >
                          <div className="flex items-center gap-3 mb-1">
                            <div
                              className="rounded-full grid place-items-center"
                              style={{
                                width: 32,
                                height: 32,
                                background: mode === 'multiple' ? 'var(--azul)' : 'var(--paper-2)',
                                color: mode === 'multiple' ? 'white' : 'var(--ink-70)',
                              }}
                            >
                              <UserPlus size={16} />
                            </div>
                            <span className="font-semibold text-sm">Múltiplos participantes</span>
                          </div>
                          <p className="text-xs" style={{ color: 'var(--ink-70)' }}>
                            {totalSlots < 2
                              ? 'Adicione mais ingressos no carrinho para usar este modo.'
                              : `Vou indicar quem participa de cada evento (até ${totalSlots} pessoas).`}
                          </p>
                        </button>
                      </div>

                      {mode === 'multiple' && (
                        <div
                          className="mt-4 p-3 rounded-lg text-xs flex items-center justify-between gap-2"
                          style={{
                            background: allSlotsFilled
                              ? 'rgba(166,206,58,0.15)'
                              : 'rgba(248,130,30,0.10)',
                            color: allSlotsFilled ? 'var(--verde-600)' : '#b85d00',
                          }}
                        >
                          <span className="font-semibold">
                            {allSlotsFilled
                              ? `Todos os ${totalSlots} ingresso${totalSlots > 1 ? 's' : ''} atribuído${totalSlots > 1 ? 's' : ''} ✓`
                              : `${totalAssignedSlots} de ${totalSlots} ingresso(s) atribuído(s) — falta(m) ${slotsRemaining}`}
                          </span>
                          <span>
                            {participants.length} participante{participants.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cards de participantes */}
                  {participants.map((p, idx) => {
                    const errs = participantErrors[idx] ?? {}
                    const cpfS = cpfState[idx] ?? { loaded: false, loading: false }
                    const cepS = cepState[idx] ?? { loading: false, filled: false }

                    return (
                      <div
                        key={idx}
                        className="bg-white border border-line rounded-2xl mb-6"
                        style={{ padding: 32 }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="mono text-[11px] text-ink-50 tracking-[0.1em]">
                            PARTICIPANTE {idx + 1}
                            {p.nome ? ` · ${p.nome.split(' ')[0]}` : ''}
                          </div>
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveParticipant(idx)}
                              className="text-xs font-semibold inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-paper-2"
                              style={{ color: '#dc2626' }}
                            >
                              <X size={14} />
                              Remover
                            </button>
                          )}
                        </div>
                        <h2 className="display mb-7" style={{ fontSize: 24 }}>
                          {idx === 0
                            ? mode === 'multiple'
                              ? 'Dados do titular'
                              : 'Quem está se inscrevendo?'
                            : 'Dados deste participante'}
                        </h2>

                        <div className="flex flex-col gap-5">
                          <Field label="Nome completo" required error={errs.nome}>
                            <input
                              type="text"
                              value={p.nome}
                              onChange={(e) => updateParticipant(idx, { nome: e.target.value })}
                              placeholder="Nome completo"
                              style={inputStyle}
                            />
                          </Field>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <Field label="E-mail" required error={errs.email}>
                              <input
                                type="email"
                                value={p.email}
                                onChange={(e) => updateParticipant(idx, { email: e.target.value })}
                                placeholder="email@exemplo.com"
                                style={inputStyle}
                              />
                            </Field>
                            <div>
                              <Field label="CPF" required error={errs.cpf}>
                                <input
                                  type="text"
                                  value={p.cpf}
                                  onChange={(e) => handleCPFChange(idx, e.target.value)}
                                  placeholder="000.000.000-00"
                                  style={inputStyle}
                                />
                              </Field>
                              {cpfS.loading && (
                                <p className="text-[11px] mt-1" style={{ color: 'var(--azul)' }}>
                                  Buscando dados...
                                </p>
                              )}
                              {cpfS.loaded && (
                                <p className="text-[11px] mt-1" style={{ color: 'var(--verde-600)' }}>
                                  Campos vazios preenchidos com cadastro existente — confira antes de continuar.
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <Field label="Telefone" required error={errs.telefone}>
                              <input
                                type="text"
                                value={p.telefone}
                                onChange={(e) => handlePhoneChange(idx, e.target.value)}
                                placeholder="(00) 00000-0000"
                                style={inputStyle}
                              />
                            </Field>
                            <Field label="Empresa">
                              <input
                                type="text"
                                value={p.nome_empresa}
                                onChange={(e) =>
                                  updateParticipant(idx, { nome_empresa: e.target.value })
                                }
                                placeholder="Opcional"
                                style={inputStyle}
                              />
                            </Field>
                          </div>
                          <Field label="Cargo">
                            <input
                              type="text"
                              value={p.cargo}
                              onChange={(e) => updateParticipant(idx, { cargo: e.target.value })}
                              placeholder="Opcional"
                              style={inputStyle}
                            />
                          </Field>

                          {idx === 0 && cnpjRequired && (
                            <div
                              className="rounded-xl p-4 mt-2"
                              style={{
                                background: 'rgba(248,130,30,0.06)',
                                border: '1px solid rgba(248,130,30,0.3)',
                              }}
                            >
                              <p className="text-xs mb-3" style={{ color: '#b85d00' }}>
                                Você aplicou um cupom exclusivo de associado. Informe o CNPJ para validar.
                              </p>
                              <Field label="CNPJ da empresa associada" required>
                                <input
                                  type="text"
                                  value={cnpj}
                                  onChange={(e) => handleCnpjChange(e.target.value)}
                                  placeholder="00.000.000/0000-00"
                                  style={inputStyle}
                                  autoFocus
                                />
                              </Field>
                              {cnpjLoading && (
                                <p className="mt-2 text-[11px]" style={{ color: 'var(--azul)' }}>
                                  Buscando empresa...
                                </p>
                              )}
                              {!cnpjLoading && cnpjCompanyName && (
                                <p className="mt-2 text-[11px]" style={{ color: 'var(--verde-600)' }}>
                                  {cnpjCompanyName} — cupom revalidado automaticamente.
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mono text-[11px] text-ink-50 tracking-[0.1em] mb-4 mt-9">
                          ENDEREÇO
                        </div>
                        <div className="flex flex-col gap-5">
                          <div>
                            <Field label="CEP" required error={errs.cep}>
                              <input
                                type="text"
                                value={p.cep}
                                onChange={(e) => handleCEPChange(idx, e.target.value)}
                                onBlur={() => lookupCEP(idx)}
                                placeholder="00000-000"
                                style={inputStyle}
                              />
                            </Field>
                            {cepS.loading && (
                              <p className="text-[11px] mt-1" style={{ color: 'var(--azul)' }}>
                                Buscando endereço...
                              </p>
                            )}
                            {!cepS.loading && cepS.filled && (
                              <p className="text-[11px] mt-1" style={{ color: 'var(--verde-600)' }}>
                                Endereço preenchido automaticamente
                              </p>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            <div className="sm:col-span-2">
                              <Field label="Rua" required error={errs.rua}>
                                <input
                                  type="text"
                                  value={p.rua}
                                  onChange={(e) => updateParticipant(idx, { rua: e.target.value })}
                                  placeholder="Rua"
                                  style={inputStyle}
                                />
                              </Field>
                            </div>
                            <Field label="Número" required error={errs.numero}>
                              <input
                                type="text"
                                value={p.numero}
                                onChange={(e) => updateParticipant(idx, { numero: e.target.value })}
                                placeholder="Nº"
                                style={inputStyle}
                              />
                            </Field>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            <Field label="Bairro" required error={errs.bairro}>
                              <input
                                type="text"
                                value={p.bairro}
                                onChange={(e) => updateParticipant(idx, { bairro: e.target.value })}
                                placeholder="Bairro"
                                style={inputStyle}
                              />
                            </Field>
                            <Field label="Cidade" required error={errs.cidade}>
                              <input
                                type="text"
                                value={p.cidade}
                                onChange={(e) => updateParticipant(idx, { cidade: e.target.value })}
                                placeholder="Cidade"
                                style={inputStyle}
                              />
                            </Field>
                            <Field label="Estado" required error={errs.estado}>
                              <input
                                type="text"
                                value={p.estado}
                                onChange={(e) =>
                                  updateParticipant(idx, { estado: e.target.value.toUpperCase() })
                                }
                                placeholder="UF"
                                maxLength={2}
                                style={inputStyle}
                              />
                            </Field>
                          </div>
                          <Field label="Complemento">
                            <input
                              type="text"
                              value={p.complemento}
                              onChange={(e) =>
                                updateParticipant(idx, { complemento: e.target.value })
                              }
                              placeholder="Opcional"
                              style={inputStyle}
                            />
                          </Field>
                        </div>

                        {/* Eventos deste participante (só em modo multiple) */}
                        {mode === 'multiple' && (
                          <div className="mt-7 pt-7" style={{ borderTop: '1px solid var(--line)' }}>
                            <div className="mono text-[11px] text-ink-50 tracking-[0.1em] mb-3">
                              EVENTOS DESTE PARTICIPANTE
                            </div>
                            <p className="text-xs mb-4" style={{ color: 'var(--ink-70)' }}>
                              Marque os eventos que este participante vai assistir.
                            </p>
                            <div className="flex flex-col gap-2">
                              {cart.map((item) => {
                                const used = eventAssignmentCounts.get(item.eventId) ?? 0
                                const checked = p.eventIds.includes(item.eventId)
                                const eventFull = used >= item.quantity && !checked
                                return (
                                  <label
                                    key={item.eventId}
                                    className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer"
                                    style={{
                                      borderColor: checked ? 'var(--azul)' : 'var(--line)',
                                      background: checked
                                        ? 'var(--azul-50)'
                                        : eventFull
                                          ? 'var(--paper-2)'
                                          : 'white',
                                      opacity: eventFull ? 0.5 : 1,
                                      cursor: eventFull ? 'not-allowed' : 'pointer',
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() =>
                                        toggleEventForParticipant(idx, item.eventId)
                                      }
                                      disabled={eventFull}
                                      className="mt-0.5"
                                      style={{ accentColor: 'var(--azul)' }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-semibold truncate">
                                        {item.eventTitle}
                                      </div>
                                      <div
                                        className="text-[11px] mono mt-0.5"
                                        style={{ color: 'var(--ink-50)' }}
                                      >
                                        {formatDate(item.eventDate)} · {formatTime(item.eventTime)}
                                      </div>
                                    </div>
                                    <span
                                      className="text-[11px] mono whitespace-nowrap"
                                      style={{ color: 'var(--ink-50)' }}
                                    >
                                      {used}/{item.quantity}
                                    </span>
                                  </label>
                                )
                              })}
                            </div>
                            {errs.eventIds && (
                              <p
                                className="mt-2 text-[11px] font-medium"
                                style={{ color: '#dc2626' }}
                              >
                                {errs.eventIds}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="mt-6">
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={p.accepted_terms}
                              onChange={(e) =>
                                updateParticipant(idx, { accepted_terms: e.target.checked })
                              }
                              className="mt-1 w-5 h-5"
                              style={{ accentColor: 'var(--azul)' }}
                            />
                            <span className="text-sm" style={{ color: 'var(--ink-70)' }}>
                              Aceito os{' '}
                              <a
                                href="/termos"
                                target="_blank"
                                className="underline"
                                style={{ color: 'var(--azul)' }}
                              >
                                termos de uso
                              </a>{' '}
                              e a{' '}
                              <a
                                href="/privacidade"
                                target="_blank"
                                className="underline"
                                style={{ color: 'var(--azul)' }}
                              >
                                política de privacidade
                              </a>{' '}
                              *
                            </span>
                          </label>
                          {errs.accepted_terms && (
                            <p
                              className="mt-1 text-xs font-medium"
                              style={{ color: '#dc2626' }}
                            >
                              {errs.accepted_terms}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* Adicionar participante */}
                  {mode === 'multiple' && (
                    <div className="mb-6">
                      <button
                        type="button"
                        onClick={handleAddParticipant}
                        disabled={!canAddParticipant}
                        className="btn btn-ghost w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <UserPlus size={16} />
                        Adicionar participante
                        {!canAddParticipant && ' (todos os ingressos já têm participante)'}
                      </button>
                    </div>
                  )}

                  {/* Mobile order summary */}
                  <div
                    className="lg:hidden rounded-2xl mb-6 p-5"
                    style={{ background: 'var(--ink)', color: 'white' }}
                  >
                    <div className="mono text-[10px] tracking-[0.1em] mb-3" style={{ opacity: 0.6 }}>
                      RESUMO
                    </div>
                    {cart.map((item) => {
                      const unitPrice = item.isHalfPrice ? item.price / 2 : item.price
                      const discount = item.couponDiscount * item.quantity
                      const itemTotal = Math.max(0, unitPrice * item.quantity - discount)
                      return (
                        <div
                          key={item.eventId}
                          className="flex justify-between items-center text-sm mb-1.5"
                        >
                          <span className="truncate mr-2" style={{ color: '#a0a2c2' }}>
                            {item.quantity}x {item.eventTitle}
                          </span>
                          <span className="mono">
                            {item.price === 0 ? 'Grátis' : formatCurrency(itemTotal)}
                          </span>
                        </div>
                      )
                    })}
                    <div
                      className="mt-3 pt-3 flex justify-between font-bold"
                      style={{ borderTop: '1px solid #2a2b52' }}
                    >
                      <span>Total</span>
                      <span
                        className="display"
                        style={{ fontSize: 22, letterSpacing: '-.02em' }}
                      >
                        {cartTotal === 0 ? 'Gratuito' : formatCurrency(cartTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('cart')
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      className="btn btn-ghost"
                    >
                      <ArrowLeft size={16} />
                      Voltar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-orange btn-lg flex-1 justify-center"
                      disabled={isSubmitting || (mode === 'multiple' && !allSlotsFilled)}
                    >
                      {isSubmitting
                        ? 'Processando...'
                        : cartTotal === 0
                          ? 'Confirmar inscrições'
                          : 'Continuar para pagamento'}
                      {!isSubmitting && <ArrowRight size={16} />}
                    </button>
                  </div>
                </form>
              </div>

              <div className="hidden lg:block">
                <OrderSidebar showEditButton />
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {formError && (
                  <div
                    className="mb-6 p-4 rounded-xl text-sm font-medium"
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                    }}
                  >
                    {formError}
                  </div>
                )}

                {!checkoutResponse && (
                  <div
                    className="bg-white border border-line rounded-2xl mb-6"
                    style={{ padding: 32 }}
                  >
                    <div className="mono text-[11px] text-ink-50 tracking-[0.1em] mb-4">
                      MÉTODO DE PAGAMENTO
                    </div>
                    <h2 className="display mb-7" style={{ fontSize: 28 }}>
                      Como você quer pagar?
                    </h2>

                    <div className="flex flex-col gap-3">
                      {(
                        [
                          {
                            id: 'PIX' as PaymentMethod,
                            title: 'PIX',
                            desc: 'Confirmação imediata · Pague no app do seu banco',
                            badge: 'Recomendado',
                          },
                          {
                            id: 'CREDIT_CARD' as PaymentMethod,
                            title: 'Cartão de crédito',
                            desc: 'Em até 12x · Você será redirecionado ao gateway seguro',
                            badge: null,
                          },
                          {
                            id: 'BOLETO' as PaymentMethod,
                            title: 'Boleto bancário',
                            desc: 'Compensação em 1-2 dias úteis · Pague em qualquer banco',
                            badge: null,
                          },
                        ] as const
                      ).map((opt) => {
                        const selected = paymentMethod === opt.id
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setPaymentMethod(opt.id)}
                            className="text-left rounded-xl p-4 border-2 transition-colors"
                            style={{
                              borderColor: selected ? 'var(--azul)' : 'var(--line)',
                              background: selected ? 'var(--azul-50)' : 'var(--paper)',
                            }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-base">{opt.title}</span>
                                  {opt.badge && (
                                    <span
                                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                      style={{
                                        background: 'var(--verde-600)',
                                        color: 'white',
                                      }}
                                    >
                                      {opt.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs" style={{ color: 'var(--ink-70)' }}>
                                  {opt.desc}
                                </p>
                              </div>
                              <div
                                className="rounded-full grid place-items-center shrink-0"
                                style={{
                                  width: 24,
                                  height: 24,
                                  border: '2px solid',
                                  borderColor: selected ? 'var(--azul)' : 'var(--line)',
                                  background: selected ? 'var(--azul)' : 'transparent',
                                }}
                              >
                                {selected && (
                                  <div
                                    style={{
                                      width: 10,
                                      height: 10,
                                      borderRadius: '50%',
                                      background: 'white',
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mt-7">
                      <button
                        type="button"
                        onClick={() => {
                          setStep('form')
                          setFormError('')
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        className="btn btn-ghost"
                        disabled={isSubmitting}
                      >
                        <ArrowLeft size={16} />
                        Voltar
                      </button>
                      <button
                        type="button"
                        onClick={() => submitCheckout(paymentMethod)}
                        disabled={isSubmitting}
                        className="btn btn-orange btn-lg flex-1 justify-center"
                      >
                        {isSubmitting
                          ? 'Processando...'
                          : `Pagar — ${formatCurrency(cartTotal)}`}
                        {!isSubmitting && <ArrowRight size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {checkoutResponse?.payment_method === 'PIX' && checkoutResponse.pix && (
                  <PixPayment
                    pix={checkoutResponse.pix}
                    purchaseGroup={checkoutResponse.purchase_group}
                    amount={checkoutResponse.total_amount}
                    onConfirmed={() =>
                      router.push(`/confirmacao/grupo/${checkoutResponse.purchase_group}`)
                    }
                  />
                )}

                {checkoutResponse?.payment_method === 'BOLETO' && checkoutResponse.boleto && (
                  <BoletoPayment
                    boleto={checkoutResponse.boleto}
                    purchaseGroup={checkoutResponse.purchase_group}
                    amount={checkoutResponse.total_amount}
                    onConfirmed={() =>
                      router.push(`/confirmacao/grupo/${checkoutResponse.purchase_group}`)
                    }
                  />
                )}

                {checkoutResponse?.payment_method === 'CREDIT_CARD' && (
                  <CreditCardForm
                    purchaseGroup={checkoutResponse.purchase_group}
                    amount={checkoutResponse.total_amount}
                    titularCpf={participants[0]?.cpf.replace(/\D/g, '') ?? ''}
                    onSuccess={() =>
                      router.push(`/confirmacao/grupo/${checkoutResponse.purchase_group}`)
                    }
                  />
                )}
              </div>

              {!checkoutResponse && (
                <div className="hidden lg:block">
                  <OrderSidebar />
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}


function CouponInput({
  eventId,
  onApply,
}: {
  eventId: number
  onApply: (eventId: number, code: string) => Promise<void>
}) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleApply = async () => {
    if (!code.trim()) return
    setLoading(true)
    await onApply(eventId, code.toUpperCase())
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        className="px-2 py-1 border border-line rounded-lg text-xs"
        style={{ width: 96 }}
        placeholder="Cupom"
      />
      <button
        type="button"
        onClick={handleApply}
        disabled={loading || !code.trim()}
        className="px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-40"
        style={{ background: 'var(--azul)', color: 'white' }}
      >
        {loading ? '...' : 'OK'}
      </button>
    </div>
  )
}
