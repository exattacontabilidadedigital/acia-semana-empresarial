'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, ShoppingCart, User } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { formatCurrency, formatCPF, formatPhone, formatCNPJ } from '@/lib/utils'
import { inscriptionPersonalSchema } from '@/lib/schemas/inscription'

interface InscriptionFormProps {
  event: {
    id: number
    title: string
    price: number
    half_price: number
    capacity: number
  }
  availableSpots: number
  halfPriceAvailable: number
}

export default function InscriptionForm({ event, availableSpots, halfPriceAvailable }: InscriptionFormProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)

  // Step 1 state
  const [quantity, setQuantity] = useState(1)
  const [isHalfPrice, setIsHalfPrice] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponError, setCouponError] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false)
  const [cnpj, setCnpj] = useState('')
  const [cnpjRequired, setCnpjRequired] = useState(false)
  const [cnpjCompanyName, setCnpjCompanyName] = useState('')
  const [cnpjLoading, setCnpjLoading] = useState(false)
  const [cnpjError, setCnpjError] = useState('')

  const hasHalfPrice = event.half_price > 0 && event.price > 0 && halfPriceAvailable > 0

  // Step 2 state
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
  const [cepLoading, setCepLoading] = useState(false)
  const [cepFilled, setCepFilled] = useState(false)

  const maxQuantity = Math.min(10, availableSpots)
  const unitPrice = isHalfPrice ? event.price / 2 : event.price
  const subtotal = unitPrice * quantity
  const discountAmount = couponApplied ? couponDiscount * quantity : 0
  const total = Math.max(0, subtotal - discountAmount)
  const isFree = event.price === 0

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

  const lookupCPF = useCallback(async (cpfDigits: string) => {
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
      // silently fail
    } finally {
      setCpfLoading(false)
    }
  }, [cpfLoaded])

  const handleCPFChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    handleChange('cpf', formatCPF(digits))
    if (digits.length === 11) {
      lookupCPF(digits)
    } else {
      setCpfLoaded(false)
    }
  }

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    handleChange('telefone', formatPhone(digits))
  }

  const handleCEPChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
    handleChange('cep', formatted)
    if (digits.length < 8) setCepFilled(false)
  }

  const lookupCNPJ = useCallback(async (cnpjDigits: string) => {
    if (cnpjDigits.length !== 14) return
    setCnpjLoading(true)
    setCnpjError('')
    try {
      const res = await fetch(`/api/cnpj/${cnpjDigits}`)
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
        setFormData((prev) => ({
          ...prev,
          nome_empresa: prev.nome_empresa || name,
        }))
      }
    } catch {
      setCnpjCompanyName('')
    } finally {
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

  // Revalida o cupom automaticamente quando o CNPJ muda (debounced),
  // caso já exista um cupom aplicado ou com erro de requires_cnpj.
  useEffect(() => {
    const digits = cnpj.replace(/\D/g, '')
    if (digits.length !== 0 && digits.length !== 14) return
    if (!couponCode.trim() || (!couponApplied && !cnpjRequired)) return

    const timer = setTimeout(() => {
      setCnpjRequired(false)
      validateCoupon()
    }, 500)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cnpj])

  const lookupCEP = useCallback(async () => {
    const digits = formData.cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    setCepLoading(true)
    setCepFilled(false)
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
      setCepFilled(true)
    } catch {
      // silently fail
    } finally {
      setCepLoading(false)
    }
  }, [formData.cep])

  const validateCoupon = async () => {
    if (!couponCode.trim()) return
    setIsValidatingCoupon(true)
    setCouponError('')
    setCouponApplied(false)
    setCouponDiscount(0)
    try {
      const cnpjDigits = cnpj.replace(/\D/g, '')
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode,
          event_id: event.id,
          cnpj: cnpjDigits || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) {
        if (data.requires_cnpj) setCnpjRequired(true)
        setCouponError(data.message || data.error || 'Cupom inválido')
        return
      }
      const discountPerUnit =
        data.discount_type === 'percentage'
          ? unitPrice * (Number(data.discount_value) / 100)
          : Number(data.discount_value)
      setCouponDiscount(discountPerUnit)
      setCouponApplied(true)
    } catch {
      setCouponError('Erro ao validar cupom')
    } finally {
      setIsValidatingCoupon(false)
    }
  }

  const goToStep2 = () => {
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToStep1 = () => {
    setStep(1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const result = inscriptionPersonalSchema.safeParse(formData)
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
      const cnpjDigits = cnpj.replace(/\D/g, '')
      const payload = {
        event_id: event.id,
        nome: formData.nome,
        email: formData.email,
        cpf: formData.cpf.replace(/\D/g, ''),
        telefone: formData.telefone.replace(/\D/g, ''),
        cnpj: cnpjDigits || null,
        nome_empresa: formData.nome_empresa || null,
        cargo: formData.cargo || null,
        cep: formData.cep.replace(/\D/g, ''),
        rua: formData.rua,
        numero: formData.numero,
        bairro: formData.bairro,
        cidade: formData.cidade,
        estado: formData.estado,
        complemento: formData.complemento || null,
        quantity,
        is_half_price: isHalfPrice,
        accepted_terms: true,
        coupon_code: couponApplied ? couponCode : undefined,
      }

      const endpoint = isFree ? '/api/inscriptions/free' : '/api/payments/create'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrors({ form: data.error || 'Erro ao processar inscrição' })
        return
      }

      if (isFree) {
        router.push(`/confirmacao/${data.order_number}`)
      } else {
        // Open payment in new tab and redirect current to return page
        window.open(data.payment_url, '_blank')
        router.push(`/pagamento/retorno?order=${data.order_number}`)
      }
    } catch {
      setErrors({ form: 'Erro de conexão. Tente novamente.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
          step === 1 ? 'bg-purple text-white' : 'bg-green-500 text-white'
        }`}>
          {step > 1 ? '✓' : '1'}
        </div>
        <span className={`text-xs font-semibold hidden sm:inline ${step === 1 ? 'text-purple' : 'text-green-600'}`}>Ingressos</span>
        <div className="flex-1 h-0.5 bg-gray-200">
          <div className={`h-full transition-all duration-300 ${step >= 2 ? 'bg-purple w-full' : 'w-0'}`} />
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
          step === 2 ? 'bg-purple text-white' : 'bg-gray-200 text-gray-400'
        }`}>2</div>
        <span className={`text-xs font-semibold hidden sm:inline ${step === 2 ? 'text-purple' : 'text-gray-400'}`}>Dados</span>
      </div>

      {/* ========== ETAPA 1: Ingressos, Cupom, Valores ========== */}
      {step === 1 && (
        <div>
          {/* Tipo de ingresso (meia-entrada) */}
          {!isFree && hasHalfPrice && (
            <div className="mb-5">
              <label className="block text-xs font-semibold text-dark mb-2">Tipo de ingresso</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsHalfPrice(false)}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                    !isHalfPrice
                      ? 'border-purple bg-purple/10 text-purple'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  Inteira
                  <span className="block text-xs font-normal mt-0.5">{formatCurrency(event.price)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsHalfPrice(true)}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors ${
                    isHalfPrice
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  Meia-entrada
                  <span className="block text-xs font-normal mt-0.5">
                    {formatCurrency(event.price / 2)} ({halfPriceAvailable} {halfPriceAvailable === 1 ? 'disponível' : 'disponíveis'})
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Quantidade + Cupom lado a lado */}
          <div className={`grid gap-4 mb-5 ${!isFree ? 'grid-cols-1 sm:grid-cols-2' : ''}`}>
            <div>
              <label className="block text-xs font-semibold text-dark mb-2">Quantidade</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg border-2 border-gray-200 text-dark text-lg font-bold hover:border-purple hover:text-purple transition-colors disabled:opacity-40"
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="text-2xl font-bold text-dark w-8 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                  className="w-10 h-10 rounded-lg border-2 border-gray-200 text-dark text-lg font-bold hover:border-purple hover:text-purple transition-colors disabled:opacity-40"
                  disabled={quantity >= maxQuantity}
                >
                  +
                </button>
                <span className="text-xs text-gray-400">máx. {maxQuantity}</span>
              </div>
            </div>

            {!isFree && (
              <div>
                <label className="block text-xs font-semibold text-dark mb-2">Cupom de desconto</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase())
                      setCouponApplied(false)
                      setCouponError('')
                      setCouponDiscount(0)
                    }}
                    className="flex-1 px-3 py-2.5 border-2 border-gray-200 rounded-lg font-montserrat text-sm text-dark bg-white focus:outline-none focus:border-purple"
                    placeholder="Código"
                  />
                  <button
                    type="button"
                    onClick={validateCoupon}
                    disabled={isValidatingCoupon || !couponCode.trim()}
                    className="px-4 py-2.5 bg-purple text-white rounded-lg text-sm font-semibold hover:bg-purple-dark transition-colors disabled:opacity-40"
                  >
                    {isValidatingCoupon ? '...' : 'Aplicar'}
                  </button>
                </div>
                {couponError && <p className="mt-1 text-xs text-red-500">{couponError}</p>}
                {couponApplied && <p className="mt-1 text-xs text-green-600">Cupom aplicado! -{formatCurrency(couponDiscount)}/ingresso</p>}
              </div>
            )}
          </div>

          {!isFree && (
            <div className="mb-5">
              <label className="block text-xs font-semibold text-dark mb-2">
                CNPJ <span className="text-gray-400 font-normal">(opcional — necessário para cupons de associados ACIA)</span>
              </label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => handleCnpjChange(e.target.value)}
                onBlur={() => {
                  if (couponApplied || couponError) validateCoupon()
                }}
                className={`w-full px-3 py-2.5 border-2 rounded-lg font-montserrat text-sm text-dark bg-white focus:outline-none focus:border-purple ${
                  cnpjRequired && !cnpj ? 'border-orange-400' : 'border-gray-200'
                }`}
                placeholder="00.000.000/0000-00"
              />
              {cnpjLoading && <p className="mt-1 text-xs text-purple">Buscando empresa...</p>}
              {!cnpjLoading && cnpjCompanyName && (
                <p className="mt-1 text-xs text-green-600">{cnpjCompanyName}</p>
              )}
              {!cnpjLoading && cnpjError && (
                <p className="mt-1 text-xs text-red-500">{cnpjError}</p>
              )}
              {cnpjRequired && !cnpj && !cnpjError && (
                <p className="mt-1 text-xs text-orange-600">Este cupom exige CNPJ de empresa associada.</p>
              )}
            </div>
          )}

          {/* Resumo compacto */}
          <div className="bg-gray-50 rounded-xl p-4 mb-5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>{quantity}x {isFree ? 'ingresso gratuito' : `${isHalfPrice ? 'meia-entrada ' : ''}${formatCurrency(unitPrice)}`}</span>
              <span>{isFree ? 'Gratuito' : formatCurrency(subtotal)}</span>
            </div>
            {couponApplied && discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600 mt-1">
                <span>Desconto ({couponCode})</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold text-dark">
              <span>Total</span>
              <span className="text-purple text-lg">{isFree ? 'Gratuito' : formatCurrency(total)}</span>
            </div>
          </div>

          <Button
            type="button"
            variant="orange"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
            onClick={goToStep2}
          >
            Continuar
            <ArrowRight size={18} />
          </Button>
        </div>
      )}

      {/* ========== ETAPA 2: Dados Pessoais ========== */}
      {step === 2 && (
        <form onSubmit={handleSubmit} noValidate>
          {errors.form && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
              {errors.form}
            </div>
          )}

          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-purple" />
            <h3 className="text-xl font-bold text-dark">Seus dados</h3>
          </div>

          <Input
            id="nome"
            label="Nome completo *"
            value={formData.nome}
            onChange={(e) => handleChange('nome', e.target.value)}
            error={errors.nome}
            placeholder="Seu nome completo"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <Input
              id="email"
              label="Email *"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={errors.email}
              placeholder="seu@email.com"
            />
            <div>
              <Input
                id="cpf"
                label="CPF *"
                value={formData.cpf}
                onChange={(e) => handleCPFChange(e.target.value)}
                error={errors.cpf}
                placeholder="000.000.000-00"
              />
              {cpfLoading && <p className="text-xs text-purple -mt-3 mb-3">Buscando dados...</p>}
              {cpfLoaded && <p className="text-xs text-green-600 -mt-3 mb-3">Dados preenchidos automaticamente</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            <Input
              id="telefone"
              label="Telefone *"
              value={formData.telefone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              error={errors.telefone}
              placeholder="(00) 00000-0000"
            />
            <Input
              id="nome_empresa"
              label="Nome da Empresa"
              value={formData.nome_empresa}
              onChange={(e) => handleChange('nome_empresa', e.target.value)}
              placeholder="Opcional"
            />
          </div>

          <Input
            id="cargo"
            label="Cargo"
            value={formData.cargo}
            onChange={(e) => handleChange('cargo', e.target.value)}
            placeholder="Opcional"
          />

          {/* Endereço */}
          <h3 className="text-lg font-semibold text-dark mt-6 mb-4">Endereço</h3>

          <div>
            <Input
              id="cep"
              label="CEP *"
              value={formData.cep}
              onChange={(e) => handleCEPChange(e.target.value)}
              onBlur={lookupCEP}
              error={errors.cep}
              placeholder="00000-000"
            />
            {cepLoading && (
              <p className="text-xs text-purple -mt-3 mb-3">Buscando endereço...</p>
            )}
            {!cepLoading && cepFilled && (
              <p className="text-xs text-green-600 -mt-3 mb-3">Endereço preenchido automaticamente</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4">
            <div className="md:col-span-2">
              <Input
                id="rua"
                label="Rua *"
                value={formData.rua}
                onChange={(e) => handleChange('rua', e.target.value)}
                error={errors.rua}
                placeholder="Rua"
              />
            </div>
            <Input
              id="numero"
              label="Número *"
              value={formData.numero}
              onChange={(e) => handleChange('numero', e.target.value)}
              error={errors.numero}
              placeholder="Nº"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4">
            <Input
              id="bairro"
              label="Bairro *"
              value={formData.bairro}
              onChange={(e) => handleChange('bairro', e.target.value)}
              error={errors.bairro}
              placeholder="Bairro"
            />
            <Input
              id="cidade"
              label="Cidade *"
              value={formData.cidade}
              onChange={(e) => handleChange('cidade', e.target.value)}
              error={errors.cidade}
              placeholder="Cidade"
            />
            <Input
              id="estado"
              label="Estado *"
              value={formData.estado}
              onChange={(e) => handleChange('estado', e.target.value)}
              error={errors.estado}
              placeholder="UF"
              maxLength={2}
            />
          </div>

          <Input
            id="complemento"
            label="Complemento"
            value={formData.complemento}
            onChange={(e) => handleChange('complemento', e.target.value)}
            placeholder="Opcional"
          />

          {/* Termos */}
          <div className="mb-6 mt-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.accepted_terms as unknown as boolean}
                onChange={(e) => handleChange('accepted_terms', e.target.checked)}
                className="mt-1 w-5 h-5 accent-purple"
              />
              <span className="text-sm text-gray-700">
                Aceito os{' '}
                <a href="/termos" target="_blank" className="text-purple underline hover:text-purple-dark">
                  termos de uso
                </a>{' '}
                e a{' '}
                <a href="/privacidade" target="_blank" className="text-purple underline hover:text-purple-dark">
                  política de privacidade
                </a>{' '}
                *
              </span>
            </label>
            {errors.accepted_terms && (
              <p className="mt-1 text-xs text-red-500 font-medium">{errors.accepted_terms}</p>
            )}
          </div>

          {/* Resumo compacto */}
          <div className="bg-purple/5 border border-purple/20 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">
                {quantity}x ingresso{quantity > 1 ? 's' : ''} — {event.title}
              </span>
              <span className="font-bold text-purple text-lg">
                {isFree ? 'Gratuito' : formatCurrency(total)}
              </span>
            </div>
            {couponApplied && (
              <p className="text-xs text-green-600 mt-1">Cupom {couponCode} aplicado</p>
            )}
          </div>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={goToStep1}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-full border-2 border-gray-300 text-gray-600 font-semibold hover:border-purple hover:text-purple transition-colors sm:w-auto"
            >
              <ArrowLeft size={18} />
              Voltar
            </button>
            <Button
              type="submit"
              variant="orange"
              size="lg"
              className="flex-1 flex items-center justify-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Processando...'
                : isFree
                  ? 'Confirmar Inscrição'
                  : `Ir para Pagamento — ${formatCurrency(total)}`}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
