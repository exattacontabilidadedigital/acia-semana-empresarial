'use client'

import { useEffect, useState } from 'react'

/**
 * Polling do status do purchase_group em /api/payments/check.
 * Quando confirmar, dispara onConfirmed (uma única vez).
 */
export function usePaymentPolling(
  purchaseGroup: string,
  intervalMs: number,
  onConfirmed: () => void,
) {
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'error'>('pending')

  useEffect(() => {
    let cancelled = false

    const tick = async () => {
      try {
        const res = await fetch(`/api/payments/check?group=${encodeURIComponent(purchaseGroup)}`)
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        if (data.payment_status === 'confirmed') {
          setStatus('confirmed')
          onConfirmed()
          return true
        }
      } catch {
        /* mantém pending; tenta de novo no próximo intervalo */
      }
      return false
    }

    const id = setInterval(() => {
      tick()
    }, intervalMs)

    tick()

    return () => {
      cancelled = true
      clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseGroup, intervalMs])

  return status
}
