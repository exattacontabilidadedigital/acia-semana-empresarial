'use client'

import { useEffect, useState } from 'react'
import { Loader2, Check, Clock, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { usePaymentPolling } from './helpers'
import CopyButton from './CopyButton'

export default function PixPayment({
  pix: initialPix,
  purchaseGroup,
  amount,
  onConfirmed,
}: {
  pix: { qrCodeImage: string; payload: string; expiresAt: string | null }
  purchaseGroup: string
  amount: number
  onConfirmed: () => void
}) {
  const [pix, setPix] = useState(initialPix)
  const [now, setNow] = useState(() => Date.now())
  const [regenerating, setRegenerating] = useState(false)
  const [regenError, setRegenError] = useState('')

  const status = usePaymentPolling(purchaseGroup, 5000, onConfirmed)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const expiresAtMs = pix.expiresAt ? new Date(pix.expiresAt).getTime() : null
  const remainingMs = expiresAtMs ? expiresAtMs - now : null
  const expired = remainingMs !== null && remainingMs <= 0
  const remainingMin = remainingMs !== null ? Math.max(0, Math.floor(remainingMs / 60000)) : null
  const remainingSec =
    remainingMs !== null ? Math.max(0, Math.floor((remainingMs % 60000) / 1000)) : null

  const handleRegenerate = async () => {
    setRegenerating(true)
    setRegenError('')
    try {
      const res = await fetch('/api/payments/pix-regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchase_group: purchaseGroup }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setRegenError(data.error || 'Não foi possível gerar um novo PIX.')
        return
      }
      setPix(data.pix)
    } catch {
      setRegenError('Erro de conexão. Tente novamente.')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="bg-white border border-line rounded-2xl" style={{ padding: 32 }}>
      <div className="mono text-[11px] text-ink-50 tracking-[0.1em] mb-3">PAGAMENTO PIX</div>
      <h2 className="display mb-2" style={{ fontSize: 28 }}>
        Escaneie e pague
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--ink-70)' }}>
        Abra o app do seu banco, escaneie o QR Code abaixo ou copie o código PIX. Esta página
        atualiza automaticamente assim que o pagamento for confirmado.
      </p>

      <div
        className="rounded-2xl flex flex-col items-center text-center mb-5"
        style={{ background: 'var(--paper-2)', padding: 24 }}
      >
        {pix.qrCodeImage && !expired ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={pix.qrCodeImage}
            alt="QR Code PIX"
            width={240}
            height={240}
            className="rounded-xl"
            style={{ background: 'white', padding: 12 }}
          />
        ) : expired ? (
          <div
            className="grid place-items-center text-center px-4"
            style={{ width: 240, height: 240, background: 'white', borderRadius: 12 }}
          >
            <div>
              <Clock size={32} style={{ color: 'var(--laranja)', margin: '0 auto 8px' }} />
              <div className="font-semibold text-sm" style={{ color: 'var(--laranja)' }}>
                PIX expirado
              </div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--ink-70)' }}>
                Gere um novo abaixo
              </div>
            </div>
          </div>
        ) : (
          <div
            className="grid place-items-center"
            style={{ width: 240, height: 240, background: 'white', borderRadius: 12 }}
          >
            <Loader2 className="animate-spin" />
          </div>
        )}
        <div className="display mt-4" style={{ fontSize: 28, letterSpacing: '-.02em' }}>
          {formatCurrency(amount)}
        </div>
        {remainingMin !== null && remainingSec !== null && !expired && status !== 'confirmed' && (
          <div
            className="mt-2 mono text-[11px] tracking-[0.1em]"
            style={{ color: remainingMs! < 5 * 60_000 ? 'var(--laranja)' : 'var(--ink-50)' }}
          >
            EXPIRA EM {String(remainingMin).padStart(2, '0')}:
            {String(remainingSec).padStart(2, '0')}
          </div>
        )}
      </div>

      {pix.payload && !expired && (
        <div className="mb-6">
          <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2">
            CÓDIGO PIX (COPIA E COLA)
          </div>
          <div
            className="rounded-lg p-3 font-mono text-xs break-all mb-3"
            style={{ background: 'var(--paper-2)', color: 'var(--ink-70)' }}
          >
            {pix.payload}
          </div>
          <CopyButton text={pix.payload} label="Copiar código PIX" />
        </div>
      )}

      {expired && status !== 'confirmed' && (
        <div className="mb-6">
          {regenError && (
            <div
              className="mb-3 p-3 rounded-lg text-xs font-medium"
              style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
            >
              {regenError}
            </div>
          )}
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="btn btn-orange btn-lg w-full justify-center"
          >
            {regenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Gerando novo PIX...
              </>
            ) : (
              <>
                Gerar novo PIX
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      )}

      <div
        className="rounded-xl p-4 flex items-center gap-3"
        style={{
          background:
            status === 'confirmed' ? 'rgba(166,206,58,0.15)' : 'rgba(86,198,208,0.10)',
          border:
            status === 'confirmed' ? '1px solid var(--verde-600)' : '1px solid var(--ciano-600)',
        }}
        role="status"
        aria-live="polite"
      >
        {status === 'confirmed' ? (
          <>
            <Check size={20} style={{ color: 'var(--verde-600)' }} aria-hidden="true" />
            <div>
              <div className="text-sm font-bold" style={{ color: 'var(--verde-600)' }}>
                Pagamento confirmado!
              </div>
              <div className="text-xs" style={{ color: 'var(--ink-70)' }}>
                Redirecionando para sua confirmação...
              </div>
            </div>
          </>
        ) : (
          <>
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--ciano-600)' }} />
            <div>
              <div className="text-sm font-bold" style={{ color: 'var(--ciano-600)' }}>
                Aguardando pagamento
              </div>
              <div className="text-xs" style={{ color: 'var(--ink-70)' }}>
                Verificando automaticamente a cada 5 segundos.
              </div>
            </div>
          </>
        )}
      </div>

      <p className="mt-4 text-[11px]" style={{ color: 'var(--ink-50)' }}>
        Não feche esta página até a confirmação. Se precisar sair, você pode acompanhar em{' '}
        <a
          href={`/pagamento/retorno?group=${encodeURIComponent(purchaseGroup)}`}
          className="underline"
          style={{ color: 'var(--azul)' }}
        >
          /pagamento/retorno
        </a>
        .
      </p>
    </div>
  )
}
