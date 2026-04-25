'use client'

import { Loader2, Check, Download } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { usePaymentPolling } from './helpers'
import CopyButton from './CopyButton'

export default function BoletoPayment({
  boleto,
  purchaseGroup,
  amount,
  onConfirmed,
}: {
  boleto: { bankSlipUrl: string; identificationField: string | null; dueDate: string }
  purchaseGroup: string
  amount: number
  onConfirmed: () => void
}) {
  const status = usePaymentPolling(purchaseGroup, 30000, onConfirmed)

  const dueDateFormatted = (() => {
    try {
      return new Intl.DateTimeFormat('pt-BR').format(new Date(boleto.dueDate))
    } catch {
      return boleto.dueDate
    }
  })()

  return (
    <div className="bg-white border border-line rounded-2xl" style={{ padding: 32 }}>
      <div className="mono text-[11px] text-ink-50 tracking-[0.1em] mb-3">PAGAMENTO BOLETO</div>
      <h2 className="display mb-2" style={{ fontSize: 28 }}>
        Pague seu boleto
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--ink-70)' }}>
        Pague em qualquer banco, lotérica ou app bancário usando o código abaixo. A compensação
        leva 1-2 dias úteis. Você receberá um e-mail quando o pagamento for confirmado.
      </p>

      <div
        className="rounded-2xl mb-5 flex justify-between items-center flex-wrap gap-3"
        style={{ background: 'var(--paper-2)', padding: 20 }}
      >
        <div>
          <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-1">VALOR · VENCIMENTO</div>
          <div className="display" style={{ fontSize: 22, letterSpacing: '-.02em' }}>
            {formatCurrency(amount)}
            <span className="text-xs ml-2" style={{ color: 'var(--ink-70)' }}>
              até {dueDateFormatted}
            </span>
          </div>
        </div>
        <a
          href={boleto.bankSlipUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm"
          style={{ background: 'var(--azul)', color: 'white' }}
        >
          <Download size={16} />
          Baixar boleto (PDF)
        </a>
      </div>

      {boleto.identificationField && (
        <div className="mb-6">
          <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2">LINHA DIGITÁVEL</div>
          <div
            className="rounded-lg p-3 font-mono text-sm break-all mb-3"
            style={{ background: 'var(--paper-2)', color: 'var(--ink-70)' }}
          >
            {boleto.identificationField}
          </div>
          <CopyButton text={boleto.identificationField} label="Copiar linha digitável" />
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
            <Check size={20} style={{ color: 'var(--verde-600)' }} />
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
                Aguardando compensação
              </div>
              <div className="text-xs" style={{ color: 'var(--ink-70)' }}>
                Pode levar 1-2 dias úteis. Você pode fechar esta página — enviaremos um e-mail.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
