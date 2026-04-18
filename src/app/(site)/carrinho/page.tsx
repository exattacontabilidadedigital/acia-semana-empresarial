'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
/* eslint-disable @next/next/no-img-element */
import { z } from 'zod'
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
} from 'lucide-react'
import { useCart } from '@/contexts/CartContext'
import { formatCurrency, formatDate, formatTime, formatCPF, formatPhone } from '@/lib/utils'

const personalSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  cpf: z
    .string()
    .min(11, 'CPF inválido')
    .refine((val) => val.replace(/\D/g, '').length === 11, 'CPF deve ter 11 dígitos'),
  telefone: z
    .string()
    .min(10, 'Telefone inválido')
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, '')
        return digits.length >= 10 && digits.length <= 11
      },
      'Telefone deve ter 10 ou 11 dígitos',
    ),
  nome_empresa: z.string().optional(),
  cargo: z.string().optional(),
  cep: z
    .string()
    .min(8, 'CEP inválido')
    .refine((val) => val.replace(/\D/g, '').length === 8, 'CEP deve ter 8 dígitos'),
  rua: z.string().min(1, 'Rua é obrigatória'),
  numero: z.string().min(1, 'Número é obrigatório'),
  bairro: z.string().min(1, 'Bairro é obrigatório'),
  cidade: z.string().min(1, 'Cidade é obrigatória'),
  estado: z.string().min(2, 'Estado é obrigatório'),
  complemento: z.string().optional(),
  accepted_terms: z.literal(true, {
    errorMap: () => ({ message: 'Você deve aceitar os termos de uso' }),
  }),
})

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'var(--paper)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
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
  const router = useRouter()
  const { cart, removeFromCart, updateCartItem, clearCart, cartCount, cartTotal } = useCart()
  const [step, setStep] = useState<'cart' | 'form'>('cart')

  const [formData, setFormData] = useState({
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
    accepted_terms: false as unknown as true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cpfLoaded, setCpfLoaded] = useState(false)
  const [cpfLoading, setCpfLoading] = useState(false)

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const lookupCPF = useCallback(
    async (cpfDigits: string) => {
      if (cpfDigits.length !== 11 || cpfLoaded) return
      setCpfLoading(true)
      try {
        const res = await fetch(`/api/inscriptions/lookup?cpf=${cpfDigits}`)
        const data = await res.json()
        if (data.found) {
          setFormData((prev) => ({
            ...prev,
            nome: data.data.nome || prev.nome,
            email: data.data.email || prev.email,
            telefone: data.data.telefone ? formatPhone(data.data.telefone) : prev.telefone,
            nome_empresa: data.data.nome_empresa || prev.nome_empresa,
            cargo: data.data.cargo || prev.cargo,
            cep: data.data.cep || prev.cep,
            rua: data.data.rua || prev.rua,
            numero: data.data.numero || prev.numero,
            bairro: data.data.bairro || prev.bairro,
            cidade: data.data.cidade || prev.cidade,
            estado: data.data.estado || prev.estado,
            complemento: data.data.complemento || prev.complemento,
          }))
          setCpfLoaded(true)
        }
      } catch {
        /* silent */
      } finally {
        setCpfLoading(false)
      }
    },
    [cpfLoaded],
  )

  const handleCPFChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    handleChange('cpf', formatCPF(digits))
    if (digits.length === 11) lookupCPF(digits)
    else setCpfLoaded(false)
  }

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    handleChange('telefone', formatPhone(digits))
  }

  const handleCEPChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
    handleChange('cep', formatted)
  }

  const lookupCEP = useCallback(async () => {
    const digits = formData.cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (data.erro) return
      setFormData((prev) => ({
        ...prev,
        rua: data.logradouro || prev.rua,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado,
        complemento: data.complemento || prev.complemento,
      }))
    } catch {
      /* silent */
    }
  }, [formData.cep])

  const validateCoupon = async (eventId: number, couponCode: string) => {
    if (!couponCode.trim()) return
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, event_id: eventId }),
      })
      const data = await res.json()
      if (!res.ok) return
      updateCartItem(eventId, {
        couponCode,
        couponDiscount: data.discount_amount,
      })
    } catch {
      /* silent */
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    const result = personalSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string
        if (!fieldErrors[field]) fieldErrors[field] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        items: cart.map((item) => ({
          event_id: item.eventId,
          quantity: item.quantity,
          is_half_price: item.isHalfPrice,
          coupon_code: item.couponCode || undefined,
        })),
        nome: formData.nome,
        email: formData.email,
        cpf: formData.cpf.replace(/\D/g, ''),
        telefone: formData.telefone.replace(/\D/g, ''),
        nome_empresa: formData.nome_empresa || null,
        cargo: formData.cargo || null,
        cep: formData.cep.replace(/\D/g, ''),
        rua: formData.rua,
        numero: formData.numero,
        bairro: formData.bairro,
        cidade: formData.cidade,
        estado: formData.estado,
        complemento: formData.complemento || null,
        accepted_terms: true,
      }

      const res = await fetch('/api/cart/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrors({ form: data.error || 'Erro ao processar checkout' })
        return
      }

      clearCart()
      if (data.payment_url) {
        window.open(data.payment_url, '_blank')
        router.push(`/pagamento/retorno?group=${data.purchase_group}`)
      } else {
        router.push(`/confirmacao/grupo/${data.purchase_group}`)
      }
    } catch {
      setErrors({ form: 'Erro de conexão. Tente novamente.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // CARRINHO VAZIO
  if (cart.length === 0 && step === 'cart') {
    return (
      <div className="page-enter">
        <section
          style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: '96px 0' }}
        >
          <div className="container-site text-center" style={{ maxWidth: 560 }}>
            <div
              className="mx-auto mb-6 rounded-full grid place-items-center"
              style={{ width: 80, height: 80, background: 'var(--paper-2)' }}
            >
              <ShoppingCart size={32} />
            </div>
            <div className="eyebrow mb-4 justify-center">
              <span className="dot" />
              CARRINHO
            </div>
            <h1
              className="display mb-4"
              style={{ fontSize: 'clamp(40px, 5vw, 64px)' }}
            >
              Seu carrinho está <span style={{ color: 'var(--laranja)' }}>vazio</span>.
            </h1>
            <p
              className="mb-8"
              style={{ fontSize: 17, color: 'var(--ink-70)', lineHeight: 1.6 }}
            >
              Escolha eventos e ingressos pra começar sua agenda da semana.
            </p>
            <Link href="/" className="btn btn-primary btn-lg">
              Ver eventos <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </div>
    )
  }

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
            Editar carrinho
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
            {step === 'cart' ? 'MEU CARRINHO' : 'FINALIZAR COMPRA'}
          </div>
          <h1
            className="display mb-6"
            style={{ fontSize: 'clamp(40px, 6vw, 80px)' }}
          >
            {step === 'cart' ? (
              <>
                Confira seu <span style={{ color: 'var(--laranja)' }}>pedido</span>.
              </>
            ) : (
              <>
                Seus <span style={{ color: 'var(--laranja)' }}>dados</span>.
              </>
            )}
          </h1>

          {/* Progress */}
          <div
            className="flex gap-2 mt-10 pt-8"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            {[
              { l: 'Carrinho', i: 1, current: step === 'cart' ? 1 : 2 },
              { l: 'Dados e pagamento', i: 2, current: step === 'cart' ? 1 : 2 },
            ].map((s) => {
              const isActive = s.current === s.i
              const isDone = s.current > s.i
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
        </div>
      </section>

      <section style={{ padding: '24px 0 96px' }}>
        <div className="container-site">
          {step === 'cart' && (
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
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-sm font-bold w-6 text-center">
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
                          >
                            <Plus size={14} />
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

              {/* Mobile total */}
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
                <form onSubmit={handleSubmit} noValidate>
                  {errors.form && (
                    <div
                      className="mb-6 p-4 rounded-xl text-sm font-medium"
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                      }}
                    >
                      {errors.form}
                    </div>
                  )}

                  <div
                    className="bg-white border border-line rounded-2xl mb-6"
                    style={{ padding: 32 }}
                  >
                    <div className="mono text-[11px] text-ink-50 tracking-[0.1em] mb-4">
                      DADOS PESSOAIS
                    </div>
                    <h2 className="display mb-7" style={{ fontSize: 28 }}>
                      Quem está se inscrevendo?
                    </h2>

                    <div className="flex flex-col gap-5">
                      <Field label="Nome completo" required error={errors.nome}>
                        <input
                          type="text"
                          value={formData.nome}
                          onChange={(e) => handleChange('nome', e.target.value)}
                          placeholder="Seu nome completo"
                          style={inputStyle}
                        />
                      </Field>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Field label="E-mail" required error={errors.email}>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            placeholder="seu@email.com"
                            style={inputStyle}
                          />
                        </Field>
                        <div>
                          <Field label="CPF" required error={errors.cpf}>
                            <input
                              type="text"
                              value={formData.cpf}
                              onChange={(e) => handleCPFChange(e.target.value)}
                              placeholder="000.000.000-00"
                              style={inputStyle}
                            />
                          </Field>
                          {cpfLoading && (
                            <p
                              className="text-[11px] mt-1"
                              style={{ color: 'var(--azul)' }}
                            >
                              Buscando dados...
                            </p>
                          )}
                          {cpfLoaded && (
                            <p
                              className="text-[11px] mt-1"
                              style={{ color: 'var(--verde-600)' }}
                            >
                              Dados preenchidos automaticamente
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Field label="Telefone" required error={errors.telefone}>
                          <input
                            type="text"
                            value={formData.telefone}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            placeholder="(00) 00000-0000"
                            style={inputStyle}
                          />
                        </Field>
                        <Field label="Empresa">
                          <input
                            type="text"
                            value={formData.nome_empresa}
                            onChange={(e) =>
                              handleChange('nome_empresa', e.target.value)
                            }
                            placeholder="Opcional"
                            style={inputStyle}
                          />
                        </Field>
                      </div>
                      <Field label="Cargo">
                        <input
                          type="text"
                          value={formData.cargo}
                          onChange={(e) => handleChange('cargo', e.target.value)}
                          placeholder="Opcional"
                          style={inputStyle}
                        />
                      </Field>
                    </div>

                    <div className="mono text-[11px] text-ink-50 tracking-[0.1em] mb-4 mt-9">
                      ENDEREÇO
                    </div>
                    <div className="flex flex-col gap-5">
                      <Field label="CEP" required error={errors.cep}>
                        <input
                          type="text"
                          value={formData.cep}
                          onChange={(e) => handleCEPChange(e.target.value)}
                          onBlur={lookupCEP}
                          placeholder="00000-000"
                          style={inputStyle}
                        />
                      </Field>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <div className="sm:col-span-2">
                          <Field label="Rua" required error={errors.rua}>
                            <input
                              type="text"
                              value={formData.rua}
                              onChange={(e) => handleChange('rua', e.target.value)}
                              placeholder="Rua"
                              style={inputStyle}
                            />
                          </Field>
                        </div>
                        <Field label="Número" required error={errors.numero}>
                          <input
                            type="text"
                            value={formData.numero}
                            onChange={(e) => handleChange('numero', e.target.value)}
                            placeholder="Nº"
                            style={inputStyle}
                          />
                        </Field>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <Field label="Bairro" required error={errors.bairro}>
                          <input
                            type="text"
                            value={formData.bairro}
                            onChange={(e) => handleChange('bairro', e.target.value)}
                            placeholder="Bairro"
                            style={inputStyle}
                          />
                        </Field>
                        <Field label="Cidade" required error={errors.cidade}>
                          <input
                            type="text"
                            value={formData.cidade}
                            onChange={(e) => handleChange('cidade', e.target.value)}
                            placeholder="Cidade"
                            style={inputStyle}
                          />
                        </Field>
                        <Field label="Estado" required error={errors.estado}>
                          <input
                            type="text"
                            value={formData.estado}
                            onChange={(e) => handleChange('estado', e.target.value)}
                            placeholder="UF"
                            maxLength={2}
                            style={inputStyle}
                          />
                        </Field>
                      </div>
                      <Field label="Complemento">
                        <input
                          type="text"
                          value={formData.complemento}
                          onChange={(e) => handleChange('complemento', e.target.value)}
                          placeholder="Opcional"
                          style={inputStyle}
                        />
                      </Field>
                    </div>

                    <div className="mt-6">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.accepted_terms as unknown as boolean}
                          onChange={(e) =>
                            handleChange('accepted_terms', e.target.checked)
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
                      {errors.accepted_terms && (
                        <p
                          className="mt-1 text-xs font-medium"
                          style={{ color: '#dc2626' }}
                        >
                          {errors.accepted_terms}
                        </p>
                      )}
                    </div>
                  </div>

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
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? 'Processando...'
                        : cartTotal === 0
                          ? 'Confirmar inscrições'
                          : `Finalizar — ${formatCurrency(cartTotal)}`}
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
