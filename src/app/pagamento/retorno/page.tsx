'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'

function RetornoContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderNumber = searchParams.get('order')
  const group = searchParams.get('group')

  const [status, setStatus] = useState<'loading' | 'confirmed' | 'pending' | 'error'>('loading')
  const [attempts, setAttempts] = useState(0)

  const identifier = group || orderNumber

  useEffect(() => {
    if (!identifier) {
      setStatus('error')
      return
    }

    const checkStatus = async () => {
      try {
        // Primeiro tenta sincronizar com Asaas
        const syncBody = group ? { group } : { order_number: orderNumber }
        await fetch('/api/payments/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(syncBody),
        }).catch(() => {})

        // Depois verifica o status atualizado
        const query = group ? `group=${group}` : `order=${orderNumber}`
        const res = await fetch(`/api/payments/check?${query}`)
        const data = await res.json()

        if (data.payment_status === 'confirmed' || data.payment_status === 'free') {
          setStatus('confirmed')
          // Redirect to confirmation page after 2 seconds
          setTimeout(() => {
            if (group) {
              router.push(`/confirmacao/grupo/${group}`)
            } else {
              router.push(`/confirmacao/${orderNumber}`)
            }
          }, 2000)
        } else if (attempts >= 10) {
          // After ~30 seconds, show pending message with link
          setStatus('pending')
        } else {
          // Keep polling
          setAttempts((prev) => prev + 1)
        }
      } catch {
        if (attempts >= 10) {
          setStatus('pending')
        } else {
          setAttempts((prev) => prev + 1)
        }
      }
    }

    const timer = setTimeout(checkStatus, attempts === 0 ? 1000 : 3000)
    return () => clearTimeout(timer)
  }, [identifier, orderNumber, group, attempts, router])

  return (
    <main className="min-h-screen bg-[#F5F5FA] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-purple mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-bold text-dark mb-2">Processando pagamento...</h1>
            <p className="text-gray-500 text-sm">
              Estamos confirmando seu pagamento. Aguarde um momento.
            </p>
            <div className="mt-4 flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-purple animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </>
        )}

        {status === 'confirmed' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-dark mb-2">Pagamento confirmado!</h1>
            <p className="text-gray-500 text-sm">
              Redirecionando para sua confirmação...
            </p>
          </>
        )}

        {status === 'pending' && (
          <>
            <Clock className="w-16 h-16 text-orange mx-auto mb-4" />
            <h1 className="text-xl font-bold text-dark mb-2">Pagamento em processamento</h1>
            <p className="text-gray-500 text-sm mb-6">
              Seu pagamento ainda está sendo processado. Assim que for confirmado, você receberá um email com seu ingresso.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-xs text-gray-500">
                {group ? 'Seu grupo de compra:' : 'Seu número de pedido:'}
              </p>
              <p className="text-lg font-bold text-purple">{identifier}</p>
            </div>
            <div className="space-y-3">
              <Link
                href={group ? `/confirmacao/grupo/${group}` : `/confirmacao/${orderNumber}`}
                className="block w-full bg-purple text-white rounded-full py-3 font-semibold text-sm hover:bg-purple-dark transition-colors"
              >
                Ver status da inscrição
              </Link>
              <Link
                href="/eventos"
                className="block w-full border-2 border-gray-200 text-gray-600 rounded-full py-3 font-semibold text-sm hover:border-purple hover:text-purple transition-colors"
              >
                Voltar para eventos
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-dark mb-2">Algo deu errado</h1>
            <p className="text-gray-500 text-sm mb-6">
              Não foi possível verificar seu pagamento. Entre em contato com o suporte.
            </p>
            <Link
              href="/eventos"
              className="btn btn-orange inline-block"
            >
              Voltar para eventos
            </Link>
          </>
        )}
      </div>
    </main>
  )
}

export default function RetornoPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#F5F5FA] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple animate-spin" />
      </main>
    }>
      <RetornoContent />
    </Suspense>
  )
}
