'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

function CancelarContent() {
  const searchParams = useSearchParams()
  const order = searchParams.get('order')
  const cpf = searchParams.get('cpf')

  const [status, setStatus] = useState<'confirm' | 'loading' | 'success' | 'error'>('confirm')
  const [errorMsg, setErrorMsg] = useState('')

  const handleCancel = async () => {
    if (!order || !cpf) {
      setErrorMsg('Link inválido. Parâmetros ausentes.')
      setStatus('error')
      return
    }

    setStatus('loading')

    try {
      const res = await fetch('/api/inscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: order, cpf }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao cancelar inscrição')
        setStatus('error')
        return
      }

      setStatus('success')
    } catch {
      setErrorMsg('Erro de conexão. Tente novamente.')
      setStatus('error')
    }
  }

  if (!order || !cpf) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-dark mb-2">Link inválido</h1>
        <p className="text-gray-500 text-sm mb-6">Este link de cancelamento não é válido.</p>
        <Link href="/inscricoes" className="btn btn-purple">Minhas Inscrições</Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
      {status === 'confirm' && (
        <>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
            <span className="text-yellow-600 text-3xl">?</span>
          </div>
          <h1 className="text-xl font-bold text-dark mb-2">Cancelar inscrição?</h1>
          <p className="text-gray-500 text-sm mb-2">
            Pedido: <strong>{order}</strong>
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Tem certeza que deseja cancelar esta inscrição pendente? Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/inscricoes" className="btn btn-outline text-sm py-2 px-4">
              Voltar
            </Link>
            <button
              onClick={handleCancel}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold text-sm py-2 px-4 rounded-full transition-colors"
            >
              Sim, cancelar
            </button>
          </div>
        </>
      )}

      {status === 'loading' && (
        <>
          <Loader2 className="w-12 h-12 text-purple animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Cancelando inscrição...</p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-dark mb-2">Inscrição cancelada</h1>
          <p className="text-gray-500 text-sm mb-6">
            Sua inscrição foi cancelada com sucesso. Você pode fazer uma nova inscrição a qualquer momento.
          </p>
          <Link href="/inscricoes" className="btn btn-orange">Ver eventos</Link>
        </>
      )}

      {status === 'error' && (
        <>
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-dark mb-2">Erro ao cancelar</h1>
          <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
          <Link href="/inscricoes" className="btn btn-purple">Minhas Inscrições</Link>
        </>
      )}
    </div>
  )
}

export default function CancelarInscricaoPage() {
  return (
    <main className="min-h-screen bg-[#F5F5FA] flex items-center justify-center py-12 px-4">
      <Suspense fallback={
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500">Carregando...</p>
        </div>
      }>
        <CancelarContent />
      </Suspense>
    </main>
  )
}
