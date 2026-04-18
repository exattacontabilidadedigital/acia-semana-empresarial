'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Lock, Unlock, Loader2 } from 'lucide-react'

interface EventActionsProps {
  eventId: number
  eventStatus: string
}

export default function EventActions({ eventId, eventStatus }: EventActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleAction(action: string) {
    setLoading(action)
    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, event_id: eventId }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Erro ao executar ação')
      } else {
        router.refresh()
      }
    } catch {
      alert('Erro de conexão')
    } finally {
      setLoading(null)
    }
  }

  const isActive = eventStatus === 'active'
  const isClosed = eventStatus === 'closed'
  const canToggle = isActive || isClosed

  return (
    <>
      <button
        onClick={() => handleAction('duplicate')}
        disabled={loading !== null}
        className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-purple disabled:opacity-50"
        title="Duplicar evento"
      >
        {loading === 'duplicate' ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
      </button>
      {canToggle && (
        <button
          onClick={() => handleAction('toggle_status')}
          disabled={loading !== null}
          className={`rounded p-1 transition-colors disabled:opacity-50 ${
            isActive
              ? 'text-gray-400 hover:bg-red-50 hover:text-red-600'
              : 'text-gray-400 hover:bg-green-50 hover:text-green-600'
          }`}
          title={isActive ? 'Encerrar inscrições' : 'Reabrir inscrições'}
        >
          {loading === 'toggle_status' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : isActive ? (
            <Lock size={16} />
          ) : (
            <Unlock size={16} />
          )}
        </button>
      )}
    </>
  )
}
