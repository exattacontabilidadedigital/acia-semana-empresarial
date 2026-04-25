'use client'

import { useEffect, useState } from 'react'
import { Loader2, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'var(--paper)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
}

interface SavedCard {
  id: number
  brand: string | null
  last4: string | null
  holder_name: string | null
  expiry_month: string | null
  expiry_year: string | null
}

export default function CreditCardForm({
  purchaseGroup,
  amount,
  titularCpf,
  onSuccess,
}: {
  purchaseGroup: string
  amount: number
  titularCpf: string
  onSuccess: () => void
}) {
  const [savedCards, setSavedCards] = useState<SavedCard[]>([])
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [selectedSaved, setSelectedSaved] = useState<number | null>(null)
  const [useNewCard, setUseNewCard] = useState(false)

  const [cardNumber, setCardNumber] = useState('')
  const [holderName, setHolderName] = useState('')
  const [expiry, setExpiry] = useState('')
  const [ccv, setCcv] = useState('')
  const [installments, setInstallments] = useState(1)
  const [saveCard, setSaveCard] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!titularCpf || titularCpf.length !== 11) {
      setLoadingSaved(false)
      return
    }
    fetch(`/api/payments/saved-cards?cpf=${titularCpf}`)
      .then((r) => r.json())
      .then((data) => {
        const cards = (data.cards ?? []) as SavedCard[]
        setSavedCards(cards)
        if (cards.length > 0) {
          setSelectedSaved(cards[0].id)
          setUseNewCard(false)
        } else {
          setUseNewCard(true)
        }
      })
      .catch(() => setUseNewCard(true))
      .finally(() => setLoadingSaved(false))
  }, [titularCpf])

  const formatNumber = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 19)
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
  }
  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 4)
    if (digits.length <= 2) return digits
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    let payload: Record<string, unknown>

    if (!useNewCard && selectedSaved !== null) {
      payload = {
        purchase_group: purchaseGroup,
        saved_card_id: selectedSaved,
        installmentCount: installments,
      }
    } else {
      const errs: Record<string, string> = {}
      const digits = cardNumber.replace(/\D/g, '')
      if (digits.length < 13 || digits.length > 19) errs.cardNumber = 'Número do cartão incompleto'
      if (holderName.trim().length < 3) errs.holderName = 'Informe o nome impresso no cartão'
      const expDigits = expiry.replace(/\D/g, '')
      if (expDigits.length !== 4) {
        errs.expiry = 'Validade no formato MM/AA'
      } else {
        const month = parseInt(expDigits.slice(0, 2), 10)
        const yearShort = parseInt(expDigits.slice(2), 10)
        const year = 2000 + yearShort
        const now = new Date()
        const lastDay = new Date(year, month, 0)
        if (month < 1 || month > 12) errs.expiry = 'Mês inválido'
        else if (lastDay < now) errs.expiry = 'Cartão expirado'
      }
      if (ccv.length < 3) errs.ccv = 'CVV de 3 ou 4 dígitos'

      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs)
        return
      }
      setFieldErrors({})

      const [expMonth, expYear] = expiry.split('/')
      payload = {
        purchase_group: purchaseGroup,
        card: {
          holderName: holderName.trim(),
          number: digits,
          expiryMonth: expMonth,
          expiryYear: expYear,
          ccv,
        },
        installmentCount: installments,
        save_card: saveCard,
      }
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/payments/credit-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Não foi possível processar o pagamento.')
        return
      }
      onSuccess()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const installmentOptions = Array.from({ length: 12 }, (_, i) => i + 1).map((n) => ({
    n,
    perInstallment: amount / n,
  }))

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-line rounded-2xl"
      style={{ padding: 32 }}
      noValidate
    >
      <div className="mono text-[11px] text-ink-50 tracking-[0.1em] mb-3">PAGAMENTO COM CARTÃO</div>
      <h2 className="display mb-2" style={{ fontSize: 28 }}>
        Dados do cartão
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--ink-70)' }}>
        Os dados são enviados de forma segura ao gateway Asaas. Não armazenamos seu cartão.
      </p>

      {error && (
        <div
          className="mb-5 p-4 rounded-xl text-sm font-medium"
          style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
          role="alert"
        >
          {error}
        </div>
      )}

      {loadingSaved && savedCards.length === 0 && (
        <div className="text-xs mb-4" style={{ color: 'var(--ink-50)' }}>
          <Loader2 size={12} className="inline animate-spin mr-1" />
          Verificando cartões salvos...
        </div>
      )}

      {savedCards.length > 0 && (
        <div className="mb-6">
          <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-3">CARTÕES SALVOS</div>
          <div className="flex flex-col gap-2">
            {savedCards.map((c) => {
              const checked = !useNewCard && selectedSaved === c.id
              return (
                <label
                  key={c.id}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer"
                  style={{
                    borderColor: checked ? 'var(--azul)' : 'var(--line)',
                    background: checked ? 'var(--azul-50)' : 'white',
                  }}
                >
                  <input
                    type="radio"
                    name="payment-card"
                    checked={checked}
                    onChange={() => {
                      setSelectedSaved(c.id)
                      setUseNewCard(false)
                    }}
                    style={{ accentColor: 'var(--azul)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">
                      {c.brand || 'Cartão'} •••• {c.last4 ?? '????'}
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--ink-50)' }}>
                      {c.holder_name ?? 'Sem titular'}
                      {c.expiry_month && c.expiry_year
                        ? ` · ${c.expiry_month}/${c.expiry_year.slice(-2)}`
                        : ''}
                    </div>
                  </div>
                </label>
              )
            })}
            <label
              className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer"
              style={{
                borderColor: useNewCard ? 'var(--azul)' : 'var(--line)',
                background: useNewCard ? 'var(--azul-50)' : 'white',
              }}
            >
              <input
                type="radio"
                name="payment-card"
                checked={useNewCard}
                onChange={() => {
                  setUseNewCard(true)
                  setSelectedSaved(null)
                }}
                style={{ accentColor: 'var(--azul)' }}
              />
              <span className="text-sm font-semibold">Usar outro cartão</span>
            </label>
          </div>
        </div>
      )}

      {(useNewCard || savedCards.length === 0) && (
        <div className="flex flex-col gap-5">
          <div>
            <label htmlFor="cc-number" className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2 block">
              NÚMERO DO CARTÃO *
            </label>
            <input
              id="cc-number"
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatNumber(e.target.value))}
              placeholder="0000 0000 0000 0000"
              style={inputStyle}
              aria-invalid={!!fieldErrors.cardNumber}
            />
            {fieldErrors.cardNumber && (
              <p className="mt-1 text-[11px] font-medium" style={{ color: '#dc2626' }}>
                {fieldErrors.cardNumber}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="cc-name" className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2 block">
              NOME IMPRESSO NO CARTÃO *
            </label>
            <input
              id="cc-name"
              type="text"
              autoComplete="cc-name"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value.toUpperCase())}
              placeholder="COMO APARECE NO CARTÃO"
              style={inputStyle}
              aria-invalid={!!fieldErrors.holderName}
            />
            {fieldErrors.holderName && (
              <p className="mt-1 text-[11px] font-medium" style={{ color: '#dc2626' }}>
                {fieldErrors.holderName}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label htmlFor="cc-exp" className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2 block">
                VALIDADE *
              </label>
              <input
                id="cc-exp"
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/AA"
                style={inputStyle}
                aria-invalid={!!fieldErrors.expiry}
              />
              {fieldErrors.expiry && (
                <p className="mt-1 text-[11px] font-medium" style={{ color: '#dc2626' }}>
                  {fieldErrors.expiry}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="cc-csc" className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2 block">
                CVV *
              </label>
              <input
                id="cc-csc"
                type="text"
                inputMode="numeric"
                autoComplete="cc-csc"
                value={ccv}
                onChange={(e) => setCcv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="000"
                style={inputStyle}
                aria-invalid={!!fieldErrors.ccv}
              />
              {fieldErrors.ccv && (
                <p className="mt-1 text-[11px] font-medium" style={{ color: '#dc2626' }}>
                  {fieldErrors.ccv}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {useNewCard && titularCpf && (
        <label className="flex items-center gap-2 mt-5 cursor-pointer">
          <input
            type="checkbox"
            checked={saveCard}
            onChange={(e) => setSaveCard(e.target.checked)}
            style={{ accentColor: 'var(--azul)' }}
          />
          <span className="text-xs" style={{ color: 'var(--ink-70)' }}>
            Salvar este cartão para próximas compras (apenas o token criptografado fica armazenado)
          </span>
        </label>
      )}

      <div className="mt-5">
        <label htmlFor="cc-installments" className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2 block">
          PARCELAS
        </label>
        <select
          id="cc-installments"
          value={installments}
          onChange={(e) => setInstallments(parseInt(e.target.value, 10))}
          style={inputStyle}
        >
          {installmentOptions.map((opt) => (
            <option key={opt.n} value={opt.n}>
              {opt.n}x de {formatCurrency(opt.perInstallment)}
              {opt.n === 1 ? ' à vista' : ' sem juros'}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="btn btn-orange btn-lg w-full justify-center mt-7"
      >
        {submitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Processando pagamento...
          </>
        ) : (
          <>
            Pagar {formatCurrency(amount)}
            <ArrowRight size={16} />
          </>
        )}
      </button>

      <p className="mt-4 text-[11px] text-center" style={{ color: 'var(--ink-50)' }}>
        Pagamento processado pela Asaas. Seus dados não são armazenados em nossos servidores.
      </p>
    </form>
  )
}
