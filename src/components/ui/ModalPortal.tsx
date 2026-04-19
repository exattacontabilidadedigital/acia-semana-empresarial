'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renderiza children no document.body via portal.
 * Necessário para modais que precisam escapar de ancestors com `transform`
 * (ex: páginas com .page-enter), que quebram `position: fixed` relativo
 * ao viewport.
 */
export default function ModalPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null
  return createPortal(children, document.body)
}
